import 'server-only';

import type Anthropic from '@anthropic-ai/sdk';
import { automationsCol, flagAccountError, flowsCol, getAccountToken } from '../accounts';
import { createAutomationWithFlow, getAutomation, getFlow, listAutomations } from '../automations';
import { InstagramApiError, listMedia } from '../instagram';
import type { FlowNode, IgAccount, Trigger, TriggerType } from '../types';
import type { AssistantCard } from './eventos';

/**
 * Herramientas del asistente: qué puede tocar Claude y cómo se valida lo que
 * pide. Todo corre en el servidor con permisos de administrador, así que cada
 * entrada se revisa aquí aunque el esquema ya la describa.
 */

export type ToolContext = { account: IgAccount };

export type ToolOutcome = {
  /** Lo que lee Claude. */
  content: string;
  isError?: boolean;
  /** Lo que se ve en el chat. */
  card?: AssistantCard;
  /** Texto corto junto al nombre de la herramienta. */
  detail?: string;
};

/** Error que Claude puede corregir: vuelve como resultado con `is_error`. */
class ToolError extends Error {}

type Input = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

function text(value: unknown, field: string, max: number, required = true): string {
  const s = typeof value === 'string' ? value.trim() : '';
  if (required && !s) throw new ToolError(`Falta «${field}».`);
  if (s.length > max) throw new ToolError(`«${field}» pasa de ${max} caracteres.`);
  return s;
}

function textList(value: unknown, field: string, maxItems: number, maxLength: number): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ToolError(`«${field}» tiene que ser una lista.`);
  const items = [...new Set(value.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean))];
  if (items.length > maxItems) throw new ToolError(`«${field}» admite como máximo ${maxItems}.`);
  const tooLong = items.find((v) => v.length > maxLength);
  if (tooLong) throw new ToolError(`En «${field}», «${tooLong.slice(0, 40)}…» pasa de ${maxLength} caracteres.`);
  return items;
}

function dmText(value: unknown, field: string): string {
  const s = text(value, field, 1000);
  if (new TextEncoder().encode(s).length > 1000) {
    throw new ToolError(`«${field}» pasa del límite de Instagram (1000 bytes). Acórtalo.`);
  }
  return s;
}

function parseLink(value: unknown): { url: string; title: string } | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object') throw new ToolError('«enlace» tiene que ser un objeto con url.');
  const r = value as Input;
  const url = text(r.url, 'enlace.url', 1000);
  if (!/^https?:\/\/\S+$/i.test(url)) throw new ToolError('El enlace tiene que empezar con https://');
  return { url, title: text(r.texto_boton, 'enlace.texto_boton', 20, false) };
}

async function withInstagram<T>(account: IgAccount, fn: (token: string) => Promise<T>): Promise<T> {
  try {
    return await fn(await getAccountToken(account));
  } catch (err) {
    if (err instanceof InstagramApiError) {
      await flagAccountError(account.id, err).catch(() => {});
      throw new ToolError(`Instagram respondió con un error: ${err.message}`);
    }
    throw err;
  }
}

async function checkPosts(account: IgAccount, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const media = await withInstagram(account, (token) => listMedia(token, 100));
  const known = new Set(media.map((m) => m.id));
  const missing = ids.filter((id) => !known.has(id));
  if (missing.length) {
    throw new ToolError(
      `Estos ids no son publicaciones recientes de la cuenta: ${missing.join(', ')}. Sácalos de ver_publicaciones.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Automatizaciones
// ---------------------------------------------------------------------------

const TRIGGERS: Record<string, { type: TriggerType; label: string }> = {
  comentario: { type: 'comment_keyword', label: 'Comentario en publicación' },
  dm: { type: 'dm_keyword', label: 'Palabra clave en DM' },
  respuesta_historia: { type: 'story_reply', label: 'Respuesta a historia' },
  primer_mensaje: { type: 'first_message', label: 'Primer mensaje' },
  respuesta_por_defecto: { type: 'default_reply', label: 'Respuesta por defecto' },
};

const TRIGGER_KEY = Object.fromEntries(
  Object.entries(TRIGGERS).map(([key, t]) => [t.type, key]),
) as Record<TriggerType, string>;

const TRIGGER_LABEL = Object.fromEntries(
  Object.values(TRIGGERS).map((t) => [t.type, t.label]),
) as Record<TriggerType, string>;

function checkTriggerScope(trigger: Trigger): void {
  if (trigger.type === 'dm_keyword' && trigger.keywords.length === 0) {
    throw new ToolError(
      'Un disparador de DM necesita palabras clave. Para contestar cualquier mensaje usa respuesta_por_defecto o primer_mensaje.',
    );
  }
  if (trigger.type === 'comment_keyword' && trigger.keywords.length === 0 && trigger.postIds.length === 0) {
    throw new ToolError(
      'Sin palabras clave ni publicaciones contestaría todos los comentarios de la cuenta. Elige al menos una de las dos.',
    );
  }
}

/** Primer mensaje de un flujo creado desde el panel o por el asistente. */
function starterMessageNode(nodes: FlowNode[]): FlowNode | undefined {
  return (
    nodes.find((n) => n.id === 'msg_1') ??
    nodes.find((n) => n.type === 'send_text' || n.type === 'send_link')
  );
}

function linkOf(node: FlowNode | undefined): string | null {
  return node?.type === 'send_link' ? node.data.linkUrl || null : null;
}

async function verPublicaciones(input: Input, { account }: ToolContext): Promise<ToolOutcome> {
  const limit = Math.max(1, Math.min(50, Math.round(Number(input.limite) || 20)));
  const media = await withInstagram(account, (token) => listMedia(token, limit));
  const rows = media.map((m) => ({
    id: m.id,
    fecha: m.timestamp?.slice(0, 10) ?? null,
    tipo: m.media_type,
    enlace: m.permalink ?? null,
    comentarios: m.comments_count ?? 0,
    pie: (m.caption ?? '').replace(/\s+/g, ' ').slice(0, 220),
  }));
  return {
    content: rows.length ? JSON.stringify(rows) : 'La cuenta no tiene publicaciones.',
    detail: `${rows.length} publicaciones`,
  };
}

async function verAutomatizaciones(_input: Input, { account }: ToolContext): Promise<ToolOutcome> {
  const automations = await listAutomations(account.id);
  const rows = automations.map((a) => ({
    id: a.id,
    nombre: a.name,
    activa: a.enabled,
    disparador: TRIGGER_KEY[a.trigger.type],
    palabras_clave: a.trigger.keywords,
    publicaciones: a.trigger.postIds,
    respuestas_publicas: a.trigger.publicReplies?.length
      ? a.trigger.publicReplies
      : a.trigger.publicReply
        ? [a.trigger.publicReply]
        : [],
    veces_disparada: a.stats?.triggered ?? 0,
  }));
  return {
    content: rows.length ? JSON.stringify(rows) : 'Todavía no hay automatizaciones.',
    detail: `${rows.length} en total`,
  };
}

async function crearAutomatizacion(input: Input, { account }: ToolContext): Promise<ToolOutcome> {
  const name = text(input.nombre, 'nombre', 80);
  const kind = TRIGGERS[String(input.disparador)];
  if (!kind) throw new ToolError(`«disparador» tiene que ser uno de: ${Object.keys(TRIGGERS).join(', ')}.`);

  const isComment = kind.type === 'comment_keyword';
  const keywords = textList(input.palabras_clave, 'palabras_clave', 20, 60);
  const postIds = isComment ? textList(input.publicaciones, 'publicaciones', 30, 60) : [];
  const publicReplies = isComment ? textList(input.respuestas_publicas, 'respuestas_publicas', 10, 300) : [];
  const message = dmText(input.mensaje, 'mensaje');
  const link = parseLink(input.enlace);

  const gate = input.pedir_seguir && typeof input.pedir_seguir === 'object' ? (input.pedir_seguir as Input) : null;
  const followGate = gate
    ? {
        text: text(gate.mensaje, 'pedir_seguir.mensaje', 1000, false) || undefined,
        retryText: text(gate.recordatorio, 'pedir_seguir.recordatorio', 1000, false) || undefined,
        buttonTitle: text(gate.texto_boton, 'pedir_seguir.texto_boton', 20, false) || undefined,
      }
    : null;

  const trigger: Trigger = {
    type: kind.type,
    keywords,
    matchType: keywords.length ? 'contains' : 'any',
    caseSensitive: false,
    postIds,
    publicReplies,
    publicReply: null,
  };
  checkTriggerScope(trigger);
  await checkPosts(account, postIds);

  const enabled = input.activa !== false;
  const { automation, flow } = await createAutomationWithFlow(account.id, {
    name,
    trigger,
    enabled,
    starter: { message, link, followGate },
  });

  return {
    content: JSON.stringify({
      creada: true,
      id: automation.id,
      activa: enabled,
      editar_flujo: `/flows/${flow.id}`,
    }),
    detail: `«${name}»`,
    card: {
      kind: 'automation',
      id: automation.id,
      flowId: flow.id,
      name,
      trigger: kind.label,
      keywords,
      posts: postIds.length,
      publicReplies: publicReplies.length,
      followGate: Boolean(followGate),
      link: link?.url ?? null,
      enabled,
      created: true,
    },
  };
}

async function editarAutomatizacion(input: Input, { account }: ToolContext): Promise<ToolOutcome> {
  const id = text(input.id, 'id', 100);
  const automation = await getAutomation(account.id, id);
  if (!automation) throw new ToolError('No existe una automatización con ese id. Búscala con ver_automatizaciones.');

  const trigger: Trigger = { ...automation.trigger };
  const patch: Record<string, unknown> = {};
  if ('nombre' in input) patch.name = text(input.nombre, 'nombre', 80);
  if ('activa' in input) patch.enabled = input.activa === true;
  if ('palabras_clave' in input) {
    trigger.keywords = textList(input.palabras_clave, 'palabras_clave', 20, 60);
    trigger.matchType = trigger.keywords.length
      ? automation.trigger.matchType === 'any'
        ? 'contains'
        : automation.trigger.matchType
      : 'any';
  }
  if ('publicaciones' in input && trigger.type === 'comment_keyword') {
    trigger.postIds = textList(input.publicaciones, 'publicaciones', 30, 60);
    await checkPosts(account, trigger.postIds);
  }
  if ('respuestas_publicas' in input && trigger.type === 'comment_keyword') {
    trigger.publicReplies = textList(input.respuestas_publicas, 'respuestas_publicas', 10, 300);
    trigger.publicReply = null;
  }
  checkTriggerScope(trigger);
  patch.trigger = trigger;

  const flow = await getFlow(account.id, automation.flowId);
  let messageNode = flow ? starterMessageNode(flow.nodes) : undefined;

  if ('mensaje' in input || 'enlace' in input || input.quitar_enlace === true) {
    if (!flow || !messageNode) {
      throw new ToolError(
        `Este flujo ya no tiene un mensaje simple que editar. Se cambia a mano en /flows/${automation.flowId}.`,
      );
    }
    const message = 'mensaje' in input ? dmText(input.mensaje, 'mensaje') : (messageNode.data.text ?? '');
    const link = input.quitar_enlace === true ? null : 'enlace' in input ? parseLink(input.enlace) : null;
    const keepLink = !('enlace' in input) && input.quitar_enlace !== true && messageNode.type === 'send_link';

    const updated: FlowNode =
      link || keepLink
        ? {
            ...messageNode,
            type: 'send_link',
            data: {
              text: message,
              linkUrl: link?.url ?? messageNode.data.linkUrl ?? '',
              linkTitle: (link?.title || messageNode.data.linkTitle || 'Abrir enlace').slice(0, 20),
            },
          }
        : { ...messageNode, type: 'send_text', data: { text: message } };

    await flowsCol(account.id)
      .doc(flow.id)
      .update({
        nodes: flow.nodes.map((n) => (n.id === updated.id ? updated : n)),
        updatedAt: Date.now(),
      });
    messageNode = updated;
  }

  await automationsCol(account.id).doc(id).update({ ...patch, updatedAt: Date.now() });

  const name = String(patch.name ?? automation.name);
  const enabled = typeof patch.enabled === 'boolean' ? patch.enabled : automation.enabled;
  return {
    content: JSON.stringify({ actualizada: true, id, activa: enabled }),
    detail: `«${name}»`,
    card: {
      kind: 'automation',
      id,
      flowId: automation.flowId,
      name,
      trigger: TRIGGER_LABEL[trigger.type],
      keywords: trigger.keywords,
      posts: trigger.postIds.length,
      publicReplies: trigger.publicReplies?.length ?? (trigger.publicReply ? 1 : 0),
      followGate: Boolean(flow?.nodes.some((n) => n.type === 'follow_gate')),
      link: linkOf(messageNode),
      enabled,
      created: false,
    },
  };
}

// ---------------------------------------------------------------------------
// Definiciones para Claude
// ---------------------------------------------------------------------------

const followGateSchema = {
  type: 'object',
  description:
    'Opcional. Pedir que siga la cuenta antes de mandar el mensaje. Inclúyelo solo si te lo pidieron; los textos vacíos usan los de siempre.',
  properties: {
    mensaje: { type: 'string', description: 'Cómo se pide que te sigan.' },
    recordatorio: { type: 'string', description: 'Qué se contesta si avisó pero todavía no sigue.' },
    texto_boton: { type: 'string', description: 'Botón para avisar que ya sigue. Máximo 20 caracteres.' },
  },
};

const linkSchema = {
  type: 'object',
  description: 'Opcional. Enlace que acompaña el mensaje, con botón.',
  properties: {
    url: { type: 'string', description: 'https://…' },
    texto_boton: { type: 'string', description: 'Texto del botón, máximo 20 caracteres. Por defecto «Abrir enlace».' },
  },
  required: ['url'],
};

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'ver_publicaciones',
    description:
      'Lista las publicaciones recientes de la cuenta de Instagram: id, fecha, tipo, enlace, número de comentarios y el inicio del pie de foto. Úsala cuando el dueño mencione un post o reel ("este post", "el último", un enlace de instagram.com) y antes de crear o editar una automatización para publicaciones concretas: los ids salen de aquí.',
    input_schema: {
      type: 'object',
      properties: { limite: { type: 'integer', description: 'Cuántas traer, de 1 a 50. Por defecto 20.' } },
    },
  },
  {
    name: 'ver_automatizaciones',
    description:
      'Lista las automatizaciones que ya existen, con disparador, palabras clave, publicaciones, respuestas públicas y si están activas. Úsala antes de crear una nueva para no duplicar y para encontrar el id de la que el dueño quiere cambiar.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'crear_automatizacion',
    description:
      'Crea una automatización activa de Instagram con su flujo: disparador, palabras clave, publicaciones, respuestas públicas al azar, el DM (con enlace opcional) y, si se pide, que primero siga la cuenta. Empieza a contestar a gente real en cuanto se crea.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string', description: 'Nombre corto para reconocerla en el panel.' },
        disparador: {
          type: 'string',
          enum: Object.keys(TRIGGERS),
          description:
            'comentario: comentan en una publicación. dm: escriben una palabra clave por DM. respuesta_historia: responden una historia. primer_mensaje: escriben por primera vez. respuesta_por_defecto: ninguna otra coincidió.',
        },
        palabras_clave: {
          type: 'array',
          items: { type: 'string' },
          description: 'Palabras que la activan. Vacío = cualquier comentario o mensaje.',
        },
        publicaciones: {
          type: 'array',
          items: { type: 'string' },
          description: 'Solo para comentario: ids de ver_publicaciones. Vacío = todas.',
        },
        respuestas_publicas: {
          type: 'array',
          items: { type: 'string' },
          description: 'Solo para comentario: respuestas públicas cortas, sale una al azar.',
        },
        mensaje: { type: 'string', description: 'El DM que recibe la persona. Máximo 1000 caracteres.' },
        enlace: linkSchema,
        pedir_seguir: followGateSchema,
        activa: { type: 'boolean', description: 'Por defecto true. false la deja creada pero pausada.' },
      },
      required: ['nombre', 'disparador', 'palabras_clave', 'mensaje'],
    },
  },
  {
    name: 'editar_automatizacion',
    description:
      'Cambia una automatización existente. Manda solo los campos que cambian. Sirve para pausarla o activarla, renombrarla, cambiar palabras clave, publicaciones, respuestas públicas, el mensaje o el enlace.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'id de ver_automatizaciones.' },
        nombre: { type: 'string' },
        activa: { type: 'boolean' },
        palabras_clave: { type: 'array', items: { type: 'string' } },
        publicaciones: { type: 'array', items: { type: 'string' } },
        respuestas_publicas: { type: 'array', items: { type: 'string' } },
        mensaje: { type: 'string' },
        enlace: linkSchema,
        quitar_enlace: { type: 'boolean', description: 'true para que el mensaje ya no lleve enlace.' },
      },
      required: ['id'],
    },
  },
];

const EXECUTORS: Record<string, (input: Input, ctx: ToolContext) => Promise<ToolOutcome>> = {
  ver_publicaciones: verPublicaciones,
  ver_automatizaciones: verAutomatizaciones,
  crear_automatizacion: crearAutomatizacion,
  editar_automatizacion: editarAutomatizacion,
};

export async function runTool(name: string, input: unknown, ctx: ToolContext): Promise<ToolOutcome> {
  const execute = EXECUTORS[name];
  if (!execute) return { content: `No existe la herramienta ${name}.`, isError: true };

  try {
    return await execute(input && typeof input === 'object' ? (input as Input) : {}, ctx);
  } catch (err) {
    if (err instanceof ToolError) return { content: err.message, isError: true, detail: err.message };
    console.error(`[asistente] la herramienta ${name} falló`, err);
    return { content: 'La herramienta falló por un error interno del servidor.', isError: true };
  }
}
