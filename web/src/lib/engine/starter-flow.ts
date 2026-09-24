import type { FlowEdge, FlowNode } from '../types';

/**
 * Flujo con el que nace una automatización. Lo usan el diálogo de
 * automatizaciones (navegador) y el asistente (servidor), por eso vive aquí y
 * no depende de Firebase.
 */

/** Textos por defecto de «Pedir que te siga». */
export const FOLLOW_GATE_DEFAULTS = {
  text: 'Para mandártelo necesito que me sigas 🙌 Sígueme y avísame aquí.',
  retryText: 'Todavía no veo que me sigas 👀 Sígueme y vuelve a avisarme.',
  buttonTitle: 'Ya te sigo',
  maxAttempts: 3,
} as const;

export type StarterFlowOptions = {
  /** Primer mensaje que recibe la persona. */
  message: string;
  /** El mensaje lleva un botón que abre este enlace. */
  link?: { title: string; url: string } | null;
  /** Antes del mensaje, pedir que siga la cuenta. */
  followGate?: { text?: string; retryText?: string; buttonTitle?: string } | null;
};

const NODE_GAP = 200;

/** Todo flujo nace con un disparador y un mensaje: nunca un lienzo vacío. */
export function buildStarterFlow(opts: StarterFlowOptions): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [
    { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Disparador' } },
  ];
  const edges: FlowEdge[] = [];
  let from = { id: 'trigger', handle: 'next' };

  const append = (node: Omit<FlowNode, 'position'>, nextHandle: string) => {
    nodes.push({ ...node, position: { x: 0, y: (nodes.length) * NODE_GAP } });
    edges.push({ id: `${from.id}-${node.id}`, source: from.id, target: node.id, sourceHandle: from.handle });
    from = { id: node.id, handle: nextHandle };
  };

  if (opts.followGate) {
    append(
      {
        id: 'gate_1',
        type: 'follow_gate',
        data: {
          text: opts.followGate.text?.trim() || FOLLOW_GATE_DEFAULTS.text,
          retryText: opts.followGate.retryText?.trim() || FOLLOW_GATE_DEFAULTS.retryText,
          buttonTitle: (opts.followGate.buttonTitle?.trim() || FOLLOW_GATE_DEFAULTS.buttonTitle).slice(0, 20),
          maxAttempts: FOLLOW_GATE_DEFAULTS.maxAttempts,
        },
      },
      'follows',
    );
  }

  const link = opts.link?.url.trim() ? opts.link : null;
  append(
    link
      ? {
          id: 'msg_1',
          type: 'send_link',
          data: {
            text: opts.message,
            linkTitle: (link.title.trim() || 'Abrir enlace').slice(0, 20),
            linkUrl: link.url.trim(),
          },
        }
      : { id: 'msg_1', type: 'send_text', data: { text: opts.message } },
    'next',
  );

  return { nodes, edges };
}
