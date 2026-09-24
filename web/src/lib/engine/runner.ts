import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import {
  runsCol,
  contactsCol,
  conversationsCol,
  flowsCol,
  automationsCol,
  getAccountToken,
} from '../accounts';
import { sendAndRecord, getContact } from '../messaging';
import {
  getContactProfile,
  sendTypingIndicator,
  toPlainText,
  type OutgoingMessage,
  InstagramApiError,
} from '../instagram';
import { interpolate } from './interpolate';
import { matchOptionByText } from './matcher';
import { FOLLOW_GATE_DEFAULTS } from './starter-flow';
import type {
  Contact,
  ConditionRule,
  Flow,
  FlowNode,
  FlowRun,
  IgAccount,
  NodeType,
} from '../types';
import { notificar } from '../push/servidor';

/** Cortafuegos contra flujos con ciclos: nadie necesita 100 nodos por evento. */
const MAX_STEPS_PER_EXECUTION = 100;
/** Cuánto esperamos por defecto una respuesta antes de tomar la salida 'timeout'. */
const DEFAULT_REPLY_TIMEOUT_MS = 24 * 60 * 60 * 1000;
/** Pausa entre mensajes seguidos, para que no lleguen todos de golpe. */
const INTER_MESSAGE_DELAY_MS = 600;
/** Tras la respuesta privada a un comentario, cuánto esperamos a que contesten. */
const PRIVATE_REPLY_WAIT_MS = 7 * 24 * 60 * 60 * 1000;

/** Nodos que mandan un mensaje: después de la respuesta privada tienen que esperar. */
const SENDING_NODES = new Set<NodeType>([
  'send_text',
  'send_buttons',
  'send_quick_replies',
  'send_link',
  'send_media',
  'ask_question',
  'follow_gate',
]);

type StepResult =
  | { kind: 'continue'; handle: string; note?: string }
  | { kind: 'wait_reply'; nodeId: string; until: number }
  | { kind: 'sleep'; until: number }
  | { kind: 'stop'; note?: string };

type ExecContext = {
  account: IgAccount;
  flow: Flow;
  run: FlowRun;
  contact: Contact;
  /** Texto/payload que acaba de mandar el usuario, si estamos reanudando. */
  input?: { text?: string | null; payload?: string | null };
};

// ---------------------------------------------------------------------------
// Navegación del grafo
// ---------------------------------------------------------------------------

function nodeById(flow: Flow, id: string): FlowNode | undefined {
  return flow.nodes.find((n) => n.id === id);
}

function nextNodeId(flow: Flow, fromId: string, handle: string): string | null {
  const edge =
    flow.edges.find((e) => e.source === fromId && e.sourceHandle === handle) ??
    // 'next' es el puerto por defecto: si el editor no lo marcó, tomamos la única salida.
    (handle === 'next' ? flow.edges.find((e) => e.source === fromId) : undefined);
  return edge?.target ?? null;
}

export function findTriggerNode(flow: Flow): FlowNode | null {
  return flow.nodes.find((n) => n.type === 'trigger') ?? flow.nodes[0] ?? null;
}

/** La traza es para depurar en la UI: con los últimos 50 pasos basta. */
function addTrace(run: FlowRun, node: FlowNode, note?: string): void {
  run.trace.push({ nodeId: node.id, type: node.type, at: Date.now(), ...(note ? { note } : {}) });
  if (run.trace.length > 50) run.trace = run.trace.slice(-50);
}

// ---------------------------------------------------------------------------
// Condiciones
// ---------------------------------------------------------------------------

function evaluateRule(rule: ConditionRule, ctx: ExecContext): boolean {
  const { contact, input } = ctx;

  let actual: string | number | boolean | undefined;
  switch (rule.subject) {
    case 'text':
      actual = input?.text ?? '';
      break;
    case 'tag':
      return rule.op === 'not_exists'
        ? !contact.tags.includes(rule.key ?? '')
        : contact.tags.includes(rule.key ?? '');
    case 'field':
      actual = contact.fields[rule.key ?? ''] ?? ctx.run.vars[rule.key ?? ''];
      break;
    case 'follows':
      return rule.op === 'not_exists' ? !contact.followsBusiness : Boolean(contact.followsBusiness);
  }

  const value = rule.value ?? '';
  switch (rule.op) {
    case 'exists':
      return actual !== undefined && actual !== '';
    case 'not_exists':
      return actual === undefined || actual === '';
    case 'equals':
      return String(actual ?? '').toLowerCase() === value.toLowerCase();
    case 'contains':
      return String(actual ?? '').toLowerCase().includes(value.toLowerCase());
    case 'gt':
      return Number(actual) > Number(value);
    case 'lt':
      return Number(actual) < Number(value);
    default:
      return false;
  }
}

/**
 * ¿La persona sigue la cuenta? Devuelve `null` cuando Meta no deja saberlo:
 * el perfil solo se puede leer después de que la persona nos escribió.
 */
async function checkFollows(account: IgAccount, contact: Contact): Promise<boolean | null> {
  try {
    const token = await getAccountToken(account);
    const profile = await getContactProfile(contact.id, token);
    if (typeof profile.is_user_follow_business !== 'boolean') return null;

    contact.followsBusiness = profile.is_user_follow_business;
    await contactsCol(account.id)
      .doc(contact.id)
      .update({ followsBusiness: profile.is_user_follow_business })
      .catch(() => {});
    return profile.is_user_follow_business;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Peticiones HTTP salientes
// ---------------------------------------------------------------------------

/**
 * Bloquea destinos internos. Sin esto, un nodo http_request podría pegarle al
 * metadata server de Google Cloud y sacar las credenciales del despliegue.
 */
function isSafeOutboundUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;

  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) return false;
  if (host === 'metadata.google.internal' || host === '169.254.169.254') return false;

  // IPv4 privadas y link-local
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 192 && b === 168) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 169 && b === 254) return false;
  }
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd')) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Ejecución de un nodo
// ---------------------------------------------------------------------------

async function runNode(node: FlowNode, ctx: ExecContext): Promise<StepResult> {
  const { account, contact, run } = ctx;
  const conversationId = run.conversationId;
  const text = (raw?: string) => interpolate(raw ?? '', { contact, vars: run.vars });

  const send = async (message: OutgoingMessage) => {
    // Si el run arrancó por un comentario, este mensaje es la respuesta privada:
    // sale contra el comentario y solo como texto, que es lo único que Meta acepta.
    const privateReply = run.privateReply && !run.privateReply.sent ? run.privateReply : null;

    if (!privateReply) {
      // "Escribiendo…" antes de cada mensaje: sin esto los flujos se sienten
      // robóticos. Es cosmético, así que nunca bloquea el envío.
      void getAccountToken(account)
        .then((token) => sendTypingIndicator({ igUserId: account.id, token, igsid: conversationId, on: true }))
        .catch(() => {});
    }

    await sendAndRecord({
      account,
      conversationId,
      target: privateReply ? { commentId: privateReply.commentId } : undefined,
      message: privateReply ? { kind: 'text', text: toPlainText(message) } : message,
      origin: { sentBy: 'automation', flowId: ctx.flow.id, flowNodeId: node.id },
    });
    if (privateReply) privateReply.sent = true;
    await new Promise((r) => setTimeout(r, INTER_MESSAGE_DELAY_MS));
  };

  switch (node.type) {
    case 'trigger':
      return { kind: 'continue', handle: 'next' };

    case 'send_text': {
      const body = text(node.data.text);
      if (body.trim()) await send({ kind: 'text', text: body });
      return { kind: 'continue', handle: 'next' };
    }

    case 'send_media': {
      const url = text(node.data.mediaUrl);
      if (url) await send({ kind: 'media', mediaType: node.data.mediaType ?? 'image', url });
      return { kind: 'continue', handle: 'next' };
    }

    case 'send_buttons': {
      const buttons = (node.data.buttons ?? []).map((b) =>
        b.kind === 'url'
          ? ({ type: 'url', title: text(b.title), url: b.url } as const)
          : ({ type: 'postback', title: text(b.title), payload: `${node.id}::${b.id}` } as const),
      );
      await send({ kind: 'buttons', text: text(node.data.text) || '​', buttons });

      // Si ningún botón lleva a otro nodo, no tiene sentido quedarse esperando.
      const hasPostbackRoutes = ctx.flow.edges.some(
        (e) => e.source === node.id && e.sourceHandle !== 'next',
      );
      if (!hasPostbackRoutes) return { kind: 'continue', handle: 'next' };

      return {
        kind: 'wait_reply',
        nodeId: node.id,
        until: Date.now() + (node.data.timeoutMs ?? DEFAULT_REPLY_TIMEOUT_MS),
      };
    }

    case 'send_link': {
      const body = text(node.data.text);
      const url = text(node.data.linkUrl).trim();
      const title = text(node.data.linkTitle).trim().slice(0, 20);
      if (url && title) {
        await send({ kind: 'buttons', text: body.trim() || '​', buttons: [{ type: 'url', title, url }] });
      } else if (url || body.trim()) {
        // Sin texto de botón, el enlace va escrito: Instagram lo vuelve clicable.
        await send({ kind: 'text', text: [body.trim(), url].filter(Boolean).join('\n\n') });
      }
      return { kind: 'continue', handle: 'next' };
    }

    case 'send_quick_replies': {
      const replies = (node.data.quickReplies ?? []).map((q) => ({
        title: text(q.title),
        payload: `${node.id}::${q.id}`,
      }));
      await send({ kind: 'quick_replies', text: text(node.data.text) || '​', replies });
      return {
        kind: 'wait_reply',
        nodeId: node.id,
        until: Date.now() + (node.data.timeoutMs ?? DEFAULT_REPLY_TIMEOUT_MS),
      };
    }

    case 'ask_question': {
      // Al reanudar, el input ya viene: guardamos y seguimos.
      if (ctx.input?.text !== undefined && run.waitingNodeId === node.id) {
        const key = node.data.saveToField;
        if (key) {
          run.vars[key] = ctx.input.text ?? '';
          await contactsCol(account.id)
            .doc(contact.id)
            .update({ [`fields.${key}`]: ctx.input.text ?? '' });
          contact.fields[key] = ctx.input.text ?? '';
        }
        return { kind: 'continue', handle: 'answered' };
      }

      const body = text(node.data.text);
      if (body.trim()) await send({ kind: 'text', text: body });
      return {
        kind: 'wait_reply',
        nodeId: node.id,
        until: Date.now() + (node.data.timeoutMs ?? DEFAULT_REPLY_TIMEOUT_MS),
      };
    }

    case 'follow_gate': {
      const until = Date.now() + (node.data.timeoutMs ?? DEFAULT_REPLY_TIMEOUT_MS);
      const ask = async (body: string): Promise<StepResult> => {
        await send({
          kind: 'buttons',
          text: body,
          buttons: [
            {
              type: 'postback',
              title: text(node.data.buttonTitle) || FOLLOW_GATE_DEFAULTS.buttonTitle,
              payload: `${node.id}::check`,
            },
          ],
        });
        return { kind: 'wait_reply', nodeId: node.id, until };
      };

      const resuming = run.waitingNodeId === node.id && ctx.input !== undefined;
      if (!resuming) {
        // Con una conversación abierta se puede preguntar a Meta de una vez:
        // si ya nos sigue, no hay nada que pedirle.
        if (!run.privateReply && (await checkFollows(account, contact)) === true) {
          return { kind: 'continue', handle: 'follows', note: 'Ya te seguía' };
        }
        return ask(text(node.data.text) || FOLLOW_GATE_DEFAULTS.text);
      }

      const follows = await checkFollows(account, contact);
      if (follows === true) return { kind: 'continue', handle: 'follows' };
      if (follows === null) {
        // Sin acceso al perfil no hay forma de comprobarlo. Mejor dejarlo pasar
        // que tener a alguien atorado pidiéndole algo que ya hizo.
        return { kind: 'continue', handle: 'follows', note: 'Instagram no dejó comprobar si te sigue' };
      }

      const attempts = (run.followAttempts?.[node.id] ?? 0) + 1;
      run.followAttempts = { ...(run.followAttempts ?? {}), [node.id]: attempts };
      if (attempts >= (node.data.maxAttempts ?? FOLLOW_GATE_DEFAULTS.maxAttempts)) {
        return { kind: 'continue', handle: 'timeout', note: `No te siguió tras ${attempts} intentos` };
      }
      return ask(text(node.data.retryText) || FOLLOW_GATE_DEFAULTS.retryText);
    }

    case 'wait': {
      const delay = node.data.delayMs ?? 0;
      // Esperas cortas se resuelven en línea; las largas van al cron.
      if (delay <= 5000) {
        await new Promise((r) => setTimeout(r, delay));
        return { kind: 'continue', handle: 'next' };
      }
      return { kind: 'sleep', until: Date.now() + delay };
    }

    case 'condition': {
      const rules = node.data.rules ?? [];
      if (rules.length === 0) return { kind: 'continue', handle: 'true' };
      const results = rules.map((r) => evaluateRule(r, ctx));
      const passed = node.data.matchAll === false ? results.some(Boolean) : results.every(Boolean);
      return { kind: 'continue', handle: passed ? 'true' : 'false' };
    }

    case 'add_tag': {
      const tag = text(node.data.tag);
      if (tag) {
        await contactsCol(account.id).doc(contact.id).update({ tags: FieldValue.arrayUnion(tag) });
        if (!contact.tags.includes(tag)) contact.tags.push(tag);
      }
      return { kind: 'continue', handle: 'next' };
    }

    case 'remove_tag': {
      const tag = text(node.data.tag);
      if (tag) {
        await contactsCol(account.id).doc(contact.id).update({ tags: FieldValue.arrayRemove(tag) });
        contact.tags = contact.tags.filter((t) => t !== tag);
      }
      return { kind: 'continue', handle: 'next' };
    }

    case 'set_field': {
      const key = node.data.fieldKey;
      if (key) {
        const value = text(node.data.fieldValue);
        await contactsCol(account.id).doc(contact.id).update({ [`fields.${key}`]: value });
        contact.fields[key] = value;
        run.vars[key] = value;
      }
      return { kind: 'continue', handle: 'next' };
    }

    case 'assign_human': {
      await conversationsCol(account.id).doc(conversationId).update({
        automationPaused: true,
        status: 'open',
        assignedTo: null,
      });
      // Un aviso al celular: a partir de aquí contesta una persona.
      await notificar('dm_sin_respuesta', {
        titulo: '🙋 Un flujo te dejó una conversación',
        cuerpo: `${contact.username ? `@${contact.username}` : contact.name || 'Alguien'} necesita que le contestes tú.`,
        url: '/inbox',
        tag: `dm-${contact.id}`,
      }).catch((err) => console.error('[push] assign_human', err));
      return { kind: 'stop', note: 'Conversación entregada a un humano' };
    }

    case 'http_request': {
      const url = text(node.data.url);
      if (!isSafeOutboundUrl(url)) {
        return { kind: 'continue', handle: 'next' };
      }
      try {
        const res = await fetch(url, {
          method: node.data.method ?? 'POST',
          headers: { 'Content-Type': 'application/json', ...(node.data.headers ?? {}) },
          body: node.data.method === 'GET' ? undefined : text(node.data.body || '{}'),
          signal: AbortSignal.timeout(10000),
          redirect: 'error',
        });
        const payload = await res.text();
        try {
          const parsed = JSON.parse(payload) as Record<string, unknown>;
          // Los campos planos de la respuesta quedan disponibles como variables.
          for (const [k, v] of Object.entries(parsed)) {
            if (['string', 'number', 'boolean'].includes(typeof v)) {
              run.vars[k] = v as string | number | boolean;
            }
          }
        } catch {
          run.vars.http_response = payload.slice(0, 500);
        }
      } catch {
        run.vars.http_error = 'true';
      }
      return { kind: 'continue', handle: 'next' };
    }

    case 'end':
      return { kind: 'stop' };

    default:
      return { kind: 'continue', handle: 'next' };
  }
}

// ---------------------------------------------------------------------------
// Bucle principal
// ---------------------------------------------------------------------------

async function persistRun(accountId: string, run: FlowRun): Promise<void> {
  await runsCol(accountId).doc(run.id).set({ ...run, updatedAt: Date.now() }, { merge: true });
}

async function execute(ctx: ExecContext, startNodeId: string | null): Promise<FlowRun> {
  const { account, flow, run } = ctx;
  let nodeId = startNodeId;
  let steps = 0;

  try {
    while (nodeId && steps < MAX_STEPS_PER_EXECUTION) {
      steps++;
      const node = nodeById(flow, nodeId);
      if (!node) break;

      run.currentNodeId = node.id;

      // Meta ya recibió la respuesta privada y no acepta otro mensaje hasta que
      // la persona conteste. Este nodo se queda esperando esa respuesta.
      if (run.privateReply?.sent && SENDING_NODES.has(node.type)) {
        run.status = 'waiting_reply';
        run.waitingNodeId = node.id;
        run.waitingUntil = Date.now() + PRIVATE_REPLY_WAIT_MS;
        run.waitingForWindow = true;
        run.resumeAt = null;
        addTrace(run, node, 'Espera a que contesten la respuesta privada');
        await persistRun(account.id, run);
        return run;
      }

      const result = await runNode(node, ctx);
      addTrace(run, node, result.kind === 'continue' || result.kind === 'stop' ? result.note : undefined);

      // El input solo aplica al nodo que estaba esperando.
      ctx.input = undefined;

      if (result.kind === 'continue') {
        nodeId = nextNodeId(flow, node.id, result.handle);
        continue;
      }

      if (result.kind === 'wait_reply') {
        run.status = 'waiting_reply';
        run.waitingNodeId = result.nodeId;
        run.waitingUntil = result.until;
        run.resumeAt = null;
        await persistRun(account.id, run);
        return run;
      }

      if (result.kind === 'sleep') {
        run.status = 'sleeping';
        run.resumeAt = result.until;
        run.waitingNodeId = null;
        // Guardamos a qué nodo saltar cuando despierte.
        run.currentNodeId = nextNodeId(flow, node.id, 'next');
        await persistRun(account.id, run);
        return run;
      }

      break; // stop
    }

    run.status = 'done';
    run.finishedAt = Date.now();
    run.currentNodeId = null;
    run.waitingNodeId = null;
    run.resumeAt = null;
  } catch (err) {
    run.status = 'failed';
    run.error = err instanceof Error ? err.message : String(err);
    run.finishedAt = Date.now();

    // Fuera de ventana no es un fallo del flujo: el usuario dejó de escribir.
    if (err instanceof InstagramApiError && err.isOutsideWindow) {
      run.status = 'cancelled';
      run.error = 'Fuera de la ventana de 24 horas';
    }
  }

  await persistRun(account.id, run);
  return run;
}

// ---------------------------------------------------------------------------
// API pública del motor
// ---------------------------------------------------------------------------

/** Arranca un flujo para un contacto. Cancela cualquier run previo del mismo. */
export async function startRun(params: {
  account: IgAccount;
  flow: Flow;
  contact: Contact;
  conversationId: string;
  automationId: string | null;
  vars?: Record<string, string | number | boolean>;
  input?: { text?: string | null; payload?: string | null };
  /** El run nace de un comentario: el primer mensaje es su respuesta privada. */
  privateReply?: { commentId: string };
}): Promise<FlowRun> {
  const { account, flow, contact, conversationId } = params;

  await cancelActiveRuns(account.id, contact.id);

  const now = Date.now();
  const run: FlowRun = {
    id: runsCol(account.id).doc().id,
    flowId: flow.id,
    contactId: contact.id,
    conversationId,
    automationId: params.automationId,
    status: 'running',
    currentNodeId: null,
    vars: params.vars ?? {},
    resumeAt: null,
    waitingNodeId: null,
    waitingUntil: null,
    privateReply: params.privateReply ? { commentId: params.privateReply.commentId, sent: false } : null,
    waitingForWindow: false,
    startedAt: now,
    updatedAt: now,
    finishedAt: null,
    error: null,
    trace: [],
  };

  await persistRun(account.id, run);

  if (params.automationId) {
    await automationsCol(account.id)
      .doc(params.automationId)
      .update({
        'stats.triggered': FieldValue.increment(1),
        'stats.lastTriggeredAt': now,
      })
      .catch(() => {}); // la automatización pudo borrarse entre medias
  }

  const trigger = findTriggerNode(flow);
  return execute(
    { account, flow, run, contact, input: params.input },
    trigger ? nextNodeId(flow, trigger.id, 'next') ?? trigger.id : null,
  );
}

/** Reanuda un run que esperaba respuesta del usuario. */
export async function resumeWithInput(params: {
  account: IgAccount;
  run: FlowRun;
  input: { text?: string | null; payload?: string | null };
}): Promise<FlowRun | null> {
  const { account, run, input } = params;

  const [flowSnap, contact] = await Promise.all([
    flowsCol(account.id).doc(run.flowId).get(),
    getContact(account.id, run.contactId),
  ]);
  if (!flowSnap.exists || !contact) return null;

  const flow = { id: flowSnap.id, ...flowSnap.data() } as Flow;
  const waitingNode = run.waitingNodeId ? nodeById(flow, run.waitingNodeId) : null;
  if (!waitingNode) return null;

  run.status = 'running';
  run.waitingUntil = null;

  // Contestó: se abre la ventana normal de Meta y ya no hay límite de un mensaje.
  const wasWaitingForWindow = Boolean(run.waitingForWindow);
  run.privateReply = null;
  run.waitingForWindow = false;

  const ctx: ExecContext = { account, flow, run, contact, input };

  // Ese nodo no alcanzó a mandar nada: ahora sí puede, desde el principio.
  if (wasWaitingForWindow) {
    run.waitingNodeId = null;
    return execute({ ...ctx, input: undefined }, waitingNode.id);
  }

  // «Pedir que te siga» comprueba por su cuenta, toque el botón o escriba.
  if (waitingNode.type === 'follow_gate') {
    return execute(ctx, waitingNode.id);
  }

  // Un postback trae "nodeId::botón": esa es la rama a seguir.
  if (input.payload?.includes('::')) {
    const [sourceNodeId, handle] = input.payload.split('::');
    if (sourceNodeId === waitingNode.id) {
      run.waitingNodeId = null;
      addTrace(run, waitingNode, handle);
      return execute(ctx, nextNodeId(flow, waitingNode.id, handle));
    }
  }

  // Respuesta libre: la procesa el propio nodo (ask_question la guarda).
  if (waitingNode.type === 'ask_question') {
    return execute(ctx, waitingNode.id);
  }

  run.waitingNodeId = null;

  // Escribió el texto de un botón en vez de tocarlo: cuenta como si lo tocara.
  const options =
    waitingNode.type === 'send_quick_replies'
      ? (waitingNode.data.quickReplies ?? [])
      : (waitingNode.data.buttons ?? []).flatMap((b) =>
          b.kind === 'postback' ? [{ id: b.id, title: b.title }] : [],
        );
  const typed = input.text ? matchOptionByText(options, input.text) : null;
  if (typed) {
    addTrace(run, waitingNode, typed);
    return execute(ctx, nextNodeId(flow, waitingNode.id, typed));
  }

  // Escribió otra cosa donde esperábamos un botón: seguimos por la salida por defecto.
  return execute(ctx, nextNodeId(flow, waitingNode.id, 'next'));
}

/** Reanuda un run dormido (nodo `wait`). Lo llama el cron. */
export async function resumeSleeping(params: { account: IgAccount; run: FlowRun }): Promise<FlowRun | null> {
  const { account, run } = params;
  const [flowSnap, contact] = await Promise.all([
    flowsCol(account.id).doc(run.flowId).get(),
    getContact(account.id, run.contactId),
  ]);
  if (!flowSnap.exists || !contact) return null;

  const flow = { id: flowSnap.id, ...flowSnap.data() } as Flow;
  run.status = 'running';
  run.resumeAt = null;
  return execute({ account, flow, run, contact }, run.currentNodeId);
}

/** Un run que esperaba respuesta y se le acabó el tiempo toma la salida 'timeout'. */
export async function timeoutRun(params: { account: IgAccount; run: FlowRun }): Promise<FlowRun | null> {
  const { account, run } = params;

  // Nunca contestó la respuesta privada: Meta ya no deja escribirle.
  if (run.waitingForWindow) {
    run.status = 'cancelled';
    run.error = 'No contestó la respuesta privada del comentario';
    run.finishedAt = Date.now();
    run.waitingNodeId = null;
    run.waitingUntil = null;
    run.waitingForWindow = false;
    await persistRun(account.id, run);
    return run;
  }

  const [flowSnap, contact] = await Promise.all([
    flowsCol(account.id).doc(run.flowId).get(),
    getContact(account.id, run.contactId),
  ]);
  if (!flowSnap.exists || !contact) return null;

  const flow = { id: flowSnap.id, ...flowSnap.data() } as Flow;
  const node = run.waitingNodeId ? nodeById(flow, run.waitingNodeId) : null;
  run.status = 'running';
  run.waitingNodeId = null;
  run.waitingUntil = null;

  const target = node ? nextNodeId(flow, node.id, 'timeout') : null;
  return execute({ account, flow, run, contact }, target);
}

export async function findActiveRun(accountId: string, contactId: string): Promise<FlowRun | null> {
  const snap = await runsCol(accountId)
    .where('contactId', '==', contactId)
    .where('status', 'in', ['running', 'waiting_reply', 'sleeping'])
    .orderBy('startedAt', 'desc')
    .limit(1)
    .get();
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as FlowRun);
}

export async function cancelActiveRuns(accountId: string, contactId: string): Promise<void> {
  const snap = await runsCol(accountId)
    .where('contactId', '==', contactId)
    .where('status', 'in', ['running', 'waiting_reply', 'sleeping'])
    .get();
  if (snap.empty) return;

  const batch = (await import('../firebase-admin')).adminDb.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, { status: 'cancelled', finishedAt: Date.now(), updatedAt: Date.now() });
  }
  await batch.commit();
}
