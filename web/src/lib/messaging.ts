import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import {
  contactsCol,
  conversationsCol,
  messagesCol,
  getAccountToken,
  flagAccountError,
} from './accounts';
import {
  sendMessage,
  getContactProfile,
  type OutgoingMessage,
  type SendTarget,
  InstagramApiError,
} from './instagram';
import type { Contact, Conversation, IgAccount, Message, MessageType, Attachment } from './types';

/** Ventana de mensajería estándar de Meta: 24h desde el último mensaje del usuario. */
export const MESSAGING_WINDOW_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Contactos y conversaciones
// ---------------------------------------------------------------------------

/**
 * Crea o actualiza el contacto. El perfil se pide a Meta solo la primera vez
 * (o si nos falta el username) para no gastar cuota en cada mensaje.
 */
export async function upsertContact(
  account: IgAccount,
  igsid: string,
  hint?: { username?: string | null; name?: string | null },
): Promise<Contact> {
  const ref = contactsCol(account.id).doc(igsid);
  const snap = await ref.get();
  const now = Date.now();

  if (snap.exists) {
    const existing = { id: snap.id, ...snap.data() } as Contact;
    const patch: Record<string, unknown> = { lastMessageAt: now };
    if (!existing.username && hint?.username) patch.username = hint.username;
    if (!existing.name && hint?.name) patch.name = hint.name;
    await ref.update(patch);
    return { ...existing, ...patch } as Contact;
  }

  let profile: Awaited<ReturnType<typeof getContactProfile>> = {};
  try {
    const token = await getAccountToken(account);
    profile = await getContactProfile(igsid, token);
  } catch (err) {
    // El perfil no siempre está disponible; no es motivo para perder el mensaje.
    if (err instanceof InstagramApiError && err.isAuthError) {
      await flagAccountError(account.id, err);
    }
  }

  const contact: Contact = {
    id: igsid,
    username: profile.username ?? hint?.username ?? null,
    name: profile.name ?? hint?.name ?? null,
    profilePic: profile.profile_pic ?? null,
    isVerifiedUser: profile.is_verified_user ?? false,
    followsBusiness: profile.is_user_follow_business ?? false,
    businessFollows: profile.is_business_follow_user ?? false,
    tags: [],
    fields: {},
    subscribed: true,
    firstSeenAt: now,
    lastMessageAt: now,
  };

  await ref.set(contact);
  return contact;
}

export async function getContact(accountId: string, igsid: string): Promise<Contact | null> {
  const snap = await contactsCol(accountId).doc(igsid).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as Contact) : null;
}

export async function getConversation(
  accountId: string,
  conversationId: string,
): Promise<Conversation | null> {
  const snap = await conversationsCol(accountId).doc(conversationId).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as Conversation) : null;
}

// ---------------------------------------------------------------------------
// Registro de mensajes
// ---------------------------------------------------------------------------

function previewOf(type: MessageType, text: string | null): string {
  if (text) return text.slice(0, 140);
  const labels: Partial<Record<MessageType, string>> = {
    image: '📷 Foto',
    video: '🎥 Video',
    audio: '🎙️ Audio de voz',
    file: '📎 Archivo',
    share: '🔗 Publicación compartida',
    story_reply: '💬 Respuesta a historia',
    story_mention: '👀 Te mencionó en su historia',
    reaction: '❤️ Reacción',
    deleted: 'Mensaje eliminado',
  };
  return labels[type] ?? 'Mensaje';
}

/** Guarda un mensaje entrante y deja la conversación lista para la bandeja. */
export async function recordInbound(params: {
  account: IgAccount;
  contact: Contact;
  mid: string;
  type: MessageType;
  text: string | null;
  attachments?: Attachment[];
  timestamp: number;
  replyTo?: Message['replyTo'];
  reaction?: Message['reaction'];
}): Promise<{ message: Message; isFirstMessage: boolean }> {
  const { account, contact, mid, type, text, timestamp } = params;
  const convRef = conversationsCol(account.id).doc(contact.id);
  const msgRef = messagesCol(account.id, contact.id).doc(mid);

  const [convSnap, existingMsg] = await Promise.all([convRef.get(), msgRef.get()]);

  const message: Message = {
    id: mid,
    mid,
    direction: 'in',
    type,
    text,
    attachments: params.attachments ?? [],
    replyTo: params.replyTo ?? null,
    reaction: params.reaction ?? null,
    timestamp,
    status: 'delivered',
    sentBy: 'instagram',
  };

  // Meta reintenta webhooks: si ya vimos este mid, no duplicamos nada.
  if (existingMsg.exists) {
    return { message, isFirstMessage: false };
  }

  const batch = adminDb.batch();
  batch.set(msgRef, message);

  const convPatch = {
    contactId: contact.id,
    contactUsername: contact.username,
    contactName: contact.name,
    contactPic: contact.profilePic,
    lastMessagePreview: previewOf(type, text),
    lastMessageAt: timestamp,
    lastMessageDirection: 'in' as const,
    unreadCount: FieldValue.increment(1),
    windowExpiresAt: timestamp + MESSAGING_WINDOW_MS,
  };

  if (convSnap.exists) {
    batch.update(convRef, convPatch);
  } else {
    batch.set(convRef, {
      ...convPatch,
      id: contact.id,
      unreadCount: 1,
      status: 'open' as const,
      assignedTo: null,
      automationPaused: false,
      automationPausedUntil: null,
      tags: [],
    });
  }

  await batch.commit();
  return { message, isFirstMessage: !convSnap.exists };
}

/** Guarda un mensaje que el dueño mandó desde la app de Instagram (echo). */
/**
 * Registra un eco: un mensaje saliente que Meta nos devuelve. Vienen de dos
 * sitios y hay que distinguirlos:
 *
 *  - lo envió Chatty: ya está guardado (con id local y el mid en el campo
 *    `mid`), así que no se duplica y la automatización sigue viva.
 *  - lo escribió el dueño desde la app de Instagram: se guarda y quien llama
 *    debe pausar la automatización.
 *
 * Devuelve `true` solo en el segundo caso.
 */
export async function recordEcho(params: {
  account: IgAccount;
  igsid: string;
  mid: string;
  text: string | null;
  timestamp: number;
}): Promise<boolean> {
  const msgRef = messagesCol(params.account.id, params.igsid).doc(params.mid);
  if ((await msgRef.get()).exists) return false;

  // `sendAndRecord` guarda con un id local y apunta el mid real en el campo:
  // sin esta comprobación, el eco duplicaría cada mensaje del bot y encima
  // pausaría la automatización que acaba de responder.
  const ours = await messagesCol(params.account.id, params.igsid)
    .where('mid', '==', params.mid)
    .limit(1)
    .get();
  if (!ours.empty) return false;

  const message: Message = {
    id: params.mid,
    mid: params.mid,
    direction: 'out',
    type: 'text',
    text: params.text,
    attachments: [],
    timestamp: params.timestamp,
    status: 'sent',
    sentBy: 'instagram',
    isEcho: true,
  };

  const convRef = conversationsCol(params.account.id).doc(params.igsid);
  const batch = adminDb.batch();
  batch.set(msgRef, message);
  batch.set(
    convRef,
    {
      lastMessagePreview: previewOf('text', params.text),
      lastMessageAt: params.timestamp,
      lastMessageDirection: 'out',
    },
    { merge: true },
  );
  await batch.commit();
  return true;
}

// ---------------------------------------------------------------------------
// Envío
// ---------------------------------------------------------------------------

export type SendOrigin = {
  sentBy: 'human' | 'automation';
  uid?: string | null;
  flowId?: string | null;
  flowNodeId?: string | null;
};

/**
 * Envía a Instagram y registra el mensaje. Escribe el doc antes de llamar a
 * Meta (status 'pending') para que la UI lo muestre al instante, y lo corrige
 * con el mid real o con el error.
 */
export async function sendAndRecord(params: {
  account: IgAccount;
  conversationId: string;
  target?: SendTarget;
  message: OutgoingMessage;
  origin: SendOrigin;
  humanAgent?: boolean;
}): Promise<Message> {
  const { account, conversationId, message, origin } = params;
  const target = params.target ?? { igsid: conversationId };

  const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const msgRef = messagesCol(account.id, conversationId).doc(localId);

  const type: MessageType =
    message.kind === 'media' ? message.mediaType : message.kind === 'text' ? 'text' : 'text';

  const text =
    message.kind === 'text' || message.kind === 'buttons' || message.kind === 'quick_replies'
      ? message.text
      : null;

  const base: Message = {
    id: localId,
    mid: null,
    direction: 'out',
    type,
    text,
    attachments: message.kind === 'media' ? [{ type: message.mediaType, url: message.url }] : [],
    timestamp: Date.now(),
    status: 'pending',
    sentBy: origin.sentBy,
    sentByUid: origin.uid ?? null,
    flowId: origin.flowId ?? null,
    flowNodeId: origin.flowNodeId ?? null,
  };

  await msgRef.set(base);

  try {
    const token = await getAccountToken(account);
    const result = await sendMessage({
      igUserId: account.id,
      token,
      target,
      message,
      humanAgent: params.humanAgent,
    });

    const sent: Partial<Message> = { mid: result.message_id, status: 'sent', error: null };
    await msgRef.update(sent);
    await conversationsCol(account.id)
      .doc(conversationId)
      .set(
        {
          lastMessagePreview: previewOf(type, text),
          lastMessageAt: base.timestamp,
          lastMessageDirection: 'out',
        },
        { merge: true },
      );

    return { ...base, ...sent } as Message;
  } catch (err) {
    const reason =
      err instanceof InstagramApiError
        ? err.isOutsideWindow
          ? 'Fuera de la ventana de 24 horas: el usuario debe escribir primero.'
          : err.message
        : String(err);

    await msgRef.update({ status: 'failed', error: reason });
    if (err instanceof InstagramApiError && err.isAuthError) {
      await flagAccountError(account.id, err);
    }
    throw err;
  }
}

/** ¿Podemos escribirle sin usar la etiqueta HUMAN_AGENT? */
export function isWithinWindow(conversation: Pick<Conversation, 'windowExpiresAt'>): boolean {
  return conversation.windowExpiresAt > Date.now();
}
