/**
 * Contrato entre el endpoint del asistente y la pantalla de chat.
 *
 * Mientras Claude trabaja, el servidor manda una línea JSON por evento
 * (NDJSON). Lo que ya pasó se guarda en Firestore y se vuelve a pintar con los
 * mismos bloques (`ViewMessage`).
 */

export type ToolStatus = 'working' | 'done' | 'error';

/** Resultado visible de una herramienta: la automatización que creó o cambió. */
export type AssistantCard = {
      kind: 'automation';
      id: string;
      flowId: string;
      name: string;
      trigger: string;
      keywords: string[];
      posts: number;
      publicReplies: number;
      followGate: boolean;
      link: string | null;
      enabled: boolean;
      /** false = ya existía y se editó. */
      created: boolean;
    };

export type AssistantEvent =
  | { type: 'chat'; chatId: string; title: string }
  | { type: 'text'; text: string }
  | { type: 'thinking' }
  | { type: 'tool'; id: string; name: string; status: ToolStatus; detail?: string }
  | { type: 'card'; toolId: string; card: AssistantCard }
  | { type: 'error'; message: string }
  | { type: 'done' };

export type ViewBlock =
  | { type: 'text'; text: string }
  | { type: 'tool'; id: string; name: string; status: ToolStatus; detail?: string }
  /** `live`: llegó en esta sesión, no del historial. */
  | { type: 'card'; card: AssistantCard; live?: boolean };

export type ViewMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; blocks: ViewBlock[] };

export type ChatSummary = { id: string; title: string; updatedAt: number };

/** Cómo se llama cada herramienta en pantalla, mientras corre y cuando termina. */
export const TOOL_LABELS: Record<string, { working: string; done: string }> = {
  ver_publicaciones: { working: 'Revisando tus publicaciones', done: 'Revisó tus publicaciones' },
  ver_automatizaciones: { working: 'Revisando tus automatizaciones', done: 'Revisó tus automatizaciones' },
  crear_automatizacion: { working: 'Creando la automatización', done: 'Creó la automatización' },
  editar_automatizacion: { working: 'Editando la automatización', done: 'Editó la automatización' },
};
