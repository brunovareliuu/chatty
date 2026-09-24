import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import {
  automationsCol,
  contactsCol,
  conversationsCol,
  flowsCol,
  messagesCol,
  getAccountToken,
} from './accounts';
import { upsertContact, recordInbound, recordEcho, getConversation } from './messaging';
import { pickPublicReply, selectAutomation } from './engine/matcher';
import { interpolate } from './engine/interpolate';
import { startRun, resumeWithInput, findActiveRun } from './engine/runner';
import { markSeen, replyToComment } from './instagram';
import { notificar, registrarComentario, revisarHito } from './push/servidor';
import type {
  Attachment,
  Automation,
  Contact,
  Flow,
  IgAccount,
  MessageType,
  TriggerType,
} from './types';

// ---------------------------------------------------------------------------
// Forma de los eventos que manda Meta
// ---------------------------------------------------------------------------

/** Lo que Meta manda cuando la conversación la abrió un anuncio (Click to DM). */
type ReferenciaDeAnuncio = {
  ad_id?: string;
  ref?: string;
  source?: string;
  type?: string;
  ads_context_data?: { ad_title?: string; post_id?: string };
};

/**
 * Marca al contacto con el anuncio que lo trajo (campo `anuncio` y la etiqueta
 * `anuncio`), solo la primera vez: si luego vuelve por otro anuncio, el mérito
 * es del primero. Así un flujo puede tratar distinto a quien llega pagado.
 */
async function marcarContactoDeAnuncio(accountId: string, igsid: string, r: ReferenciaDeAnuncio): Promise<void> {
  if (r.source !== 'ADS') return;
  const ref = contactsCol(accountId).doc(igsid);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get('anuncio')) return;
    tx.update(ref, {
      anuncio: {
        adId: r.ad_id ?? null,
        ref: r.ref ?? null,
        titulo: r.ads_context_data?.ad_title ?? null,
        en: Date.now(),
      },
      tags: FieldValue.arrayUnion('anuncio'),
    });
  });
}

type MetaAttachment = {
  type?: string;
  payload?: { url?: string; title?: string; sticker_id?: string };
};

type MessagingEvent = {
  sender?: { id: string };
  recipient?: { id: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    attachments?: MetaAttachment[];
    quick_reply?: { payload?: string };
    reply_to?: { mid?: string; story?: { url?: string; id?: string } };
    is_echo?: boolean;
    is_deleted?: boolean;
    is_unsupported?: boolean;
    /** Viene con `source: 'ADS'` y `ad_id` cuando la conversación la abrió un anuncio. */
    referral?: ReferenciaDeAnuncio;
  };
  postback?: { mid?: string; title?: string; payload?: string };
  reaction?: { mid?: string; action?: string; reaction?: string; emoji?: string };
  read?: { mid?: string };
  referral?: ReferenciaDeAnuncio;
};

type CommentChange = {
  field?: string;
  value?: {
    id?: string;
    text?: string;
    from?: { id?: string; username?: string };
    media?: { id?: string; media_product_type?: string };
    parent_id?: string;
  };
};

export type WebhookEntry = {
  id: string;
  time?: number;
  messaging?: MessagingEvent[];
  changes?: CommentChange[];
};

// ---------------------------------------------------------------------------
// Entrada principal
// ---------------------------------------------------------------------------

export async function handleWebhookEntry(account: IgAccount, entry: WebhookEntry): Promise<void> {
  for (const event of entry.messaging ?? []) {
    await handleMessagingEvent(account, event).catch((err) =>
      console.error('[webhook] evento de mensajería falló', err),
    );
  }

  for (const change of entry.changes ?? []) {
    if (change.field === 'comments') {
      await handleComment(account, change).catch((err) =>
        console.error('[webhook] comentario falló', err),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Mensajes
// ---------------------------------------------------------------------------

function classifyMessage(msg: NonNullable<MessagingEvent['message']>): {
  type: MessageType;
  attachments: Attachment[];
} {
  if (msg.is_deleted) return { type: 'deleted', attachments: [] };
  if (msg.is_unsupported) return { type: 'unsupported', attachments: [] };

  const raw = msg.attachments ?? [];
  const attachments: Attachment[] = raw
    .filter((a) => a.payload?.url)
    .map((a) => ({
      type: (['image', 'video', 'audio', 'file', 'share', 'story'].includes(a.type ?? '')
        ? a.type
        : 'file') as Attachment['type'],
      url: a.payload!.url!,
    }));

  if (msg.reply_to?.story) return { type: 'story_reply', attachments };
  if (raw.length > 0) {
    const first = raw[0].type;
    if (first === 'image') return { type: 'image', attachments };
    if (first === 'video') return { type: 'video', attachments };
    if (first === 'audio') return { type: 'audio', attachments };
    if (first === 'share') return { type: 'share', attachments };
    if (first === 'story_mention') return { type: 'story_mention', attachments };
    return { type: 'file', attachments };
  }
  return { type: 'text', attachments };
}

async function handleMessagingEvent(account: IgAccount, event: MessagingEvent): Promise<void> {
  const igsid = event.sender?.id;
  const timestamp = event.timestamp ?? Date.now();

  // Confirmación de lectura: marcamos los salientes como leídos.
  if (event.read) {
    await markConversationRead(account.id, igsid);
    return;
  }

  if (event.reaction) {
    await recordReaction(account, event);
    return;
  }

  // Echo: un mensaje saliente que Meta nos devuelve. Puede ser del dueño
  // escribiendo desde Instagram, o del propio Chatty.
  if (event.message?.is_echo) {
    const recipientId = event.recipient?.id;
    if (recipientId && event.message.mid) {
      const fromOwner = await recordEcho({
        account,
        igsid: recipientId,
        mid: event.message.mid,
        text: event.message.text ?? null,
        timestamp,
      });
      // Solo si el dueño contestó a mano la automatización se hace a un lado.
      // Con el eco de nuestro propio envío, el bot se callaría a sí mismo.
      if (fromOwner) {
        await conversationsCol(account.id)
          .doc(recipientId)
          .set({ automationPaused: true }, { merge: true });
      }
    }
    return;
  }

  if (!igsid || igsid === account.id) return;

  // Postback de un botón del template.
  if (event.postback) {
    await handleInbound(account, {
      igsid,
      mid: event.postback.mid ?? `pb_${timestamp}_${igsid}`,
      text: event.postback.title ?? null,
      payload: event.postback.payload ?? null,
      type: 'postback',
      attachments: [],
      timestamp,
      triggerType: 'dm_keyword',
    });
    return;
  }

  const msg = event.message;
  if (!msg?.mid) return;

  const { type, attachments } = classifyMessage(msg);

  await handleInbound(account, {
    igsid,
    mid: msg.mid,
    text: msg.text ?? null,
    payload: msg.quick_reply?.payload ?? null,
    type: msg.quick_reply ? 'quick_reply' : type,
    attachments,
    timestamp,
    replyTo: msg.reply_to
      ? {
          mid: msg.reply_to.mid ?? '',
          storyUrl: msg.reply_to.story?.url ?? null,
        }
      : null,
    triggerType: msg.reply_to?.story ? 'story_reply' : 'dm_keyword',
    referral: msg.referral ?? event.referral ?? null,
  });
}

type InboundPayload = {
  igsid: string;
  mid: string;
  text: string | null;
  payload: string | null;
  type: MessageType;
  attachments: Attachment[];
  timestamp: number;
  replyTo?: { mid: string; storyUrl?: string | null } | null;
  triggerType: TriggerType;
  referral?: ReferenciaDeAnuncio | null;
};

async function handleInbound(account: IgAccount, inbound: InboundPayload): Promise<void> {
  const contact = await upsertContact(account, inbound.igsid);

  // Llegó por un anuncio: se marca antes de buscar automatización, así una
  // condición «tiene la etiqueta anuncio» ya lo ve en su primer mensaje.
  if (inbound.referral?.source === 'ADS') {
    await marcarContactoDeAnuncio(account.id, inbound.igsid, inbound.referral)
      .then(() => {
        if (!contact.tags.includes('anuncio')) contact.tags.push('anuncio');
      })
      .catch((err) => console.error('[webhook] marcar contacto de anuncio', err));
  }

  const { isFirstMessage } = await recordInbound({
    account,
    contact,
    mid: inbound.mid,
    type: inbound.type,
    text: inbound.text,
    attachments: inbound.attachments,
    timestamp: inbound.timestamp,
    replyTo: inbound.replyTo ?? null,
  });

  // Acuse de lectura en Instagram: el usuario ve que su mensaje llegó.
  try {
    const token = await getAccountToken(account);
    await markSeen({ igUserId: account.id, token, igsid: inbound.igsid });
  } catch {
    /* cosmético */
  }

  if (inbound.type === 'deleted') return;

  // Checkpoint de «personas que te han escrito»: solo cuenta al llegar alguien nuevo.
  if (isFirstMessage) {
    await contactsCol(account.id)
      .count()
      .get()
      .then((c) => revisarHito('contactos', c.data().count))
      .catch((err) => console.error('[push] contactos', err));
  }

  await dispatchAutomation(account, contact, {
    text: inbound.text ?? '',
    payload: inbound.payload,
    triggerType: isFirstMessage ? 'first_message' : inbound.triggerType,
    isFirstMessage,
  });
}

// ---------------------------------------------------------------------------
// Decisión: ¿reanudar un flujo o arrancar uno nuevo?
// ---------------------------------------------------------------------------

async function dispatchAutomation(
  account: IgAccount,
  contact: Contact,
  ctx: { text: string; payload: string | null; triggerType: TriggerType; isFirstMessage: boolean },
): Promise<void> {
  const conversationId = contact.id;

  // 1. Un flujo a medias tiene prioridad sobre cualquier palabra clave.
  const activeRun = await findActiveRun(account.id, contact.id);
  if (activeRun && activeRun.status === 'waiting_reply') {
    const resumed = await resumeWithInput({
      account,
      run: activeRun,
      input: { text: ctx.text, payload: ctx.payload },
    });
    if (resumed) return;
  }

  // 2. Si un humano tomó la conversación, no interrumpimos: es para él.
  const conversation = await getConversation(account.id, conversationId);
  if (conversation?.automationPaused) {
    const until = conversation.automationPausedUntil;
    if (!until || until > Date.now()) {
      await avisarDmSinRespuesta(contact, ctx.text, 'Te escribieron en una conversación que atiendes tú');
      return;
    }
    await conversationsCol(account.id)
      .doc(conversationId)
      .update({ automationPaused: false, automationPausedUntil: null });
  }

  // 3. Buscar qué automatización responde.
  const automations = await loadAutomations(account.id);
  if (automations.length === 0) {
    await avisarDmSinRespuesta(contact, ctx.text, 'DM sin contestar');
    return;
  }

  const selected = selectAutomation(automations, {
    text: ctx.text,
    triggerType: ctx.triggerType,
    isFirstMessage: ctx.isFirstMessage,
    lastTriggeredByAutomation: contact.automationHits ?? {},
  });

  // El disparador 'first_message' no debe bloquear a las palabras clave:
  // si nada respondió al primer mensaje, reintentamos como DM normal.
  const fallback =
    !selected && ctx.triggerType === 'first_message'
      ? selectAutomation(automations, {
          text: ctx.text,
          triggerType: 'dm_keyword',
          isFirstMessage: ctx.isFirstMessage,
          lastTriggeredByAutomation: contact.automationHits ?? {},
        })
      : null;

  const automation = selected ?? fallback;
  if (!automation) {
    await avisarDmSinRespuesta(contact, ctx.text, 'DM sin contestar');
    return;
  }

  const flow = await loadFlow(account.id, automation.flowId);
  if (!flow || !flow.enabled) return;

  await contactsCol(account.id)
    .doc(contact.id)
    .update({ [`automationHits.${automation.id}`]: Date.now() });

  if (automation.notificar) {
    await notificar('automatizacion', {
      titulo: `⚡ ${automation.name}`,
      cuerpo: `${nombreDe(contact)} escribió: «${ctx.text.slice(0, 160)}»`,
      url: `/inbox`,
      tag: `auto-${automation.id}-${contact.id}`,
    }).catch((err) => console.error('[push] automatización', err));
  }

  await startRun({
    account,
    flow,
    contact,
    conversationId,
    automationId: automation.id,
    vars: { last_message: ctx.text },
    input: { text: ctx.text, payload: ctx.payload },
  });
}

function nombreDe(contact: Contact): string {
  return contact.username ? `@${contact.username}` : contact.name || 'Alguien';
}

/** Un DM que nadie automatizó: si el aviso está prendido, es para contestarlo a mano. */
async function avisarDmSinRespuesta(contact: Contact, texto: string, titulo: string): Promise<void> {
  await notificar('dm_sin_respuesta', {
    titulo: `💬 ${titulo}`,
    cuerpo: `${nombreDe(contact)}: «${(texto || 'Envió un adjunto').slice(0, 160)}»`,
    url: '/inbox',
    tag: `dm-${contact.id}`,
  }).catch((err) => console.error('[push] dm', err));
}

async function loadAutomations(accountId: string): Promise<Automation[]> {
  const snap = await automationsCol(accountId).where('enabled', '==', true).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Automation);
}

async function loadFlow(accountId: string, flowId: string): Promise<Flow | null> {
  const snap = await flowsCol(accountId).doc(flowId).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as Flow) : null;
}

// ---------------------------------------------------------------------------
// Comentarios -> DM privado
// ---------------------------------------------------------------------------

async function handleComment(account: IgAccount, change: CommentChange): Promise<void> {
  const value = change.value;
  const commentId = value?.id;
  const authorId = value?.from?.id;
  const text = value?.text ?? '';

  if (!commentId || !authorId) return;
  // Nuestros propios comentarios y respuestas no disparan nada.
  if (authorId === account.id) return;
  if (value?.parent_id) return;

  // Cuenta para «cada N comentarios» y los checkpoints, conteste o no una automatización.
  await registrarComentario({ username: value?.from?.username ?? null, texto: text }).catch((err) =>
    console.error('[push] comentario', err),
  );

  const automations = await loadAutomations(account.id);
  const automation = selectAutomation(automations, {
    text,
    triggerType: 'comment_keyword',
    postId: value?.media?.id,
    isFirstMessage: false,
    lastTriggeredByAutomation: {},
  });
  if (!automation) return;

  const flow = await loadFlow(account.id, automation.flowId);
  if (!flow || !flow.enabled) return;

  const contact = await upsertContact(account, authorId, {
    username: value?.from?.username ?? null,
  });

  if (automation.notificar) {
    await notificar('automatizacion', {
      titulo: `💬 ${automation.name}`,
      cuerpo: `${nombreDe(contact)} comentó: «${text.slice(0, 160)}»`,
      url: `/automations/${automation.id}`,
      tag: `auto-${automation.id}-${contact.id}`,
    }).catch((err) => console.error('[push] automatización', err));
  }

  // Respuesta pública opcional ("¡Ya te mandé DM! 📩"). Si hay varias, una al azar.
  const publicReply = pickPublicReply(automation.trigger);
  if (publicReply) {
    try {
      const message = interpolate(publicReply, { contact, vars: { comment_text: text } });
      if (message.trim()) {
        const token = await getAccountToken(account);
        await replyToComment({ commentId, token, message });
      }
    } catch (err) {
      console.error('[webhook] no se pudo responder el comentario', err);
    }
  }

  await conversationsCol(account.id)
    .doc(contact.id)
    .set(
      {
        id: contact.id,
        contactId: contact.id,
        contactUsername: contact.username,
        contactName: contact.name,
        contactPic: contact.profilePic,
        lastMessagePreview: `💬 Comentó: ${text.slice(0, 80)}`,
        lastMessageAt: Date.now(),
        lastMessageDirection: 'in',
        status: 'open',
        automationPaused: false,
        // La private reply abre una ventana de 7 días, no de 24 horas.
        windowExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        unreadCount: FieldValue.increment(1),
        assignedTo: null,
        tags: [],
      },
      { merge: true },
    );

  /**
   * El primer mensaje sale como respuesta privada (recipient.comment_id): es la
   * única forma de escribirle a alguien que nunca nos ha mandado un DM. Meta
   * acepta una sola, solo de texto, y el motor espera a que la persona conteste
   * antes de mandar lo demás.
   */
  await startRun({
    account,
    flow,
    contact,
    conversationId: contact.id,
    automationId: automation.id,
    vars: { comment_text: text, comment_id: commentId, post_id: value?.media?.id ?? '' },
    privateReply: { commentId },
  });
}

// ---------------------------------------------------------------------------
// Reacciones y lecturas
// ---------------------------------------------------------------------------

async function recordReaction(account: IgAccount, event: MessagingEvent): Promise<void> {
  const igsid = event.sender?.id;
  const targetMid = event.reaction?.mid;
  if (!igsid || !targetMid) return;

  await messagesCol(account.id, igsid)
    .doc(targetMid)
    .set(
      {
        reaction:
          event.reaction?.action === 'unreact'
            ? null
            : { emoji: event.reaction?.emoji ?? '❤️', action: 'react' },
      },
      { merge: true },
    )
    .catch(() => {}); // el mensaje puede no estar si es anterior a la conexión
}

async function markConversationRead(accountId: string, igsid?: string): Promise<void> {
  if (!igsid) return;
  const pending = await messagesCol(accountId, igsid)
    .where('direction', '==', 'out')
    .where('status', 'in', ['sent', 'delivered'])
    .limit(30)
    .get();
  if (pending.empty) return;

  const batch = adminDb.batch();
  for (const doc of pending.docs) batch.update(doc.ref, { status: 'read' });
  await batch.commit();
}
