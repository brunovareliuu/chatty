import type { FlowNodeData, NodeType } from '../types';

/**
 * Puertos de salida de cada nodo. El motor sigue las aristas por `sourceHandle`,
 * así que esta función y `runner.ts` tienen que coincidir. Vive aquí, sin
 * React, para que el lienzo, las plantillas y las pruebas lean el mismo contrato.
 */

export type OutputHandle = { id: string; label: string };

export function outputHandles(type: NodeType, data: FlowNodeData): OutputHandle[] {
  switch (type) {
    case 'condition':
      return [
        { id: 'true', label: 'Sí' },
        { id: 'false', label: 'No' },
      ];
    case 'send_buttons':
      return (data.buttons ?? [])
        .filter((b) => b.kind === 'postback')
        .map((b) => ({ id: (b as { id: string }).id, label: b.title || 'Botón' }));
    case 'send_quick_replies':
      return (data.quickReplies ?? []).map((q) => ({ id: q.id, label: q.title || 'Opción' }));
    case 'ask_question':
      return [
        { id: 'answered', label: 'Contestó' },
        { id: 'timeout', label: 'No contestó' },
      ];
    case 'follow_gate':
      return [
        { id: 'follows', label: 'Te sigue' },
        { id: 'timeout', label: 'No te siguió' },
      ];
    case 'end':
    case 'assign_human':
      return [];
    default:
      return [{ id: 'next', label: '' }];
  }
}
