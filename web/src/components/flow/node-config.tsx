'use client';

import {
  Bot,
  Check,
  Clock,
  GitBranch,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  ListChecks,
  MessageSquare,
  MousePointerClick,
  Tag,
  Link2,
  TagsIcon,
  Timer,
  UserCheck,
  UserPlus,
  Variable,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { FlowNodeData, NodeType } from '@/lib/types';
import { FOLLOW_GATE_DEFAULTS } from '@/lib/engine/starter-flow';

export type NodeMeta = {
  label: string;
  icon: LucideIcon;
  /** Grupo en la paleta. */
  group: 'Mensajes' | 'Lógica' | 'Contacto' | 'Avanzado';
  description: string;
  /** Falso para el disparador, que no se puede borrar ni duplicar. */
  removable: boolean;
  defaults: FlowNodeData;
};

export const NODE_META: Record<NodeType, NodeMeta> = {
  trigger: {
    label: 'Disparador',
    icon: Zap,
    group: 'Lógica',
    description: 'Por aquí entra el flujo.',
    removable: false,
    defaults: { label: 'Disparador' },
  },
  send_text: {
    label: 'Enviar mensaje',
    icon: MessageSquare,
    group: 'Mensajes',
    description: 'Un mensaje de texto.',
    removable: true,
    defaults: { text: 'Escribe aquí tu mensaje' },
  },
  send_buttons: {
    label: 'Enviar botones',
    icon: MousePointerClick,
    group: 'Mensajes',
    description: 'Hasta 3 botones. El flujo espera a que elijan.',
    removable: true,
    defaults: {
      text: '¿Qué te interesa?',
      buttons: [
        { kind: 'postback', id: 'op1', title: 'Opción 1' },
        { kind: 'postback', id: 'op2', title: 'Opción 2' },
      ],
    },
  },
  send_quick_replies: {
    label: 'Respuestas rápidas',
    icon: ListChecks,
    group: 'Mensajes',
    description: 'Chips que desaparecen al elegir. Hasta 13.',
    removable: true,
    defaults: {
      text: 'Elige una opción',
      quickReplies: [
        { id: 'qr1', title: 'Sí' },
        { id: 'qr2', title: 'No' },
      ],
    },
  },
  send_media: {
    label: 'Enviar archivo',
    icon: ImageIcon,
    group: 'Mensajes',
    description: 'Imagen, video o audio por URL pública.',
    removable: true,
    defaults: { mediaType: 'image', mediaUrl: '' },
  },
  ask_question: {
    label: 'Preguntar y guardar',
    icon: HelpCircle,
    group: 'Contacto',
    description: 'Hace una pregunta y guarda la respuesta en un campo.',
    removable: true,
    defaults: { text: '¿Cuál es tu correo?', saveToField: 'email' },
  },
  send_link: {
    label: 'Enviar enlace',
    icon: Link2,
    group: 'Mensajes',
    description: 'Mensaje con un botón que abre una página, o el enlace escrito.',
    removable: true,
    defaults: { text: 'Aquí tienes lo que te prometí 👇', linkTitle: 'Abrir enlace', linkUrl: '' },
  },
  follow_gate: {
    label: 'Pedir que te siga',
    icon: UserPlus,
    group: 'Contacto',
    description: 'Solo continúa cuando Instagram confirma que la persona ya te sigue.',
    removable: true,
    defaults: {
      text: FOLLOW_GATE_DEFAULTS.text,
      buttonTitle: FOLLOW_GATE_DEFAULTS.buttonTitle,
      retryText: FOLLOW_GATE_DEFAULTS.retryText,
      maxAttempts: FOLLOW_GATE_DEFAULTS.maxAttempts,
    },
  },
  wait: {
    label: 'Esperar',
    icon: Timer,
    group: 'Lógica',
    description: 'Pausa antes del siguiente paso.',
    removable: true,
    defaults: { delayMs: 5000 },
  },
  condition: {
    label: 'Condición',
    icon: GitBranch,
    group: 'Lógica',
    description: 'Bifurca según etiquetas, campos o el texto recibido.',
    removable: true,
    defaults: { rules: [{ subject: 'tag', key: '', op: 'exists' }], matchAll: true },
  },
  add_tag: {
    label: 'Poner etiqueta',
    icon: Tag,
    group: 'Contacto',
    description: 'Etiqueta al contacto para segmentarlo.',
    removable: true,
    defaults: { tag: '' },
  },
  remove_tag: {
    label: 'Quitar etiqueta',
    icon: TagsIcon,
    group: 'Contacto',
    description: 'Retira una etiqueta del contacto.',
    removable: true,
    defaults: { tag: '' },
  },
  set_field: {
    label: 'Guardar dato',
    icon: Variable,
    group: 'Contacto',
    description: 'Escribe un valor fijo en un campo del contacto.',
    removable: true,
    defaults: { fieldKey: '', fieldValue: '' },
  },
  assign_human: {
    label: 'Pasar a humano',
    icon: UserCheck,
    group: 'Avanzado',
    description: 'Pausa el bot y deja la conversación para el equipo.',
    removable: true,
    defaults: {},
  },
  http_request: {
    label: 'Llamar a una API',
    icon: Globe,
    group: 'Avanzado',
    description: 'Manda los datos a un sistema externo.',
    removable: true,
    defaults: { url: '', method: 'POST', body: '{\n  "contacto": "{{username}}"\n}' },
  },
  end: {
    label: 'Fin',
    icon: Check,
    group: 'Lógica',
    description: 'Termina el flujo.',
    removable: true,
    defaults: {},
  },
};

/** Nodos que el usuario puede añadir desde la paleta. */
export const PALETTE_ORDER: NodeType[] = [
  'send_text',
  'send_buttons',
  'send_quick_replies',
  'send_link',
  'send_media',
  'ask_question',
  'follow_gate',
  'wait',
  'condition',
  'add_tag',
  'remove_tag',
  'set_field',
  'assign_human',
  'http_request',
  'end',
];

export type OutputHandle = { id: string; label: string };

/**
 * Puertos de salida de cada nodo. El motor sigue las aristas por `sourceHandle`,
 * así que esta función y `runner.ts` tienen que coincidir.
 */
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

/** Resumen de una línea que se ve en la tarjeta del nodo. */
export function nodeSummary(type: NodeType, data: FlowNodeData): string {
  switch (type) {
    case 'trigger':
      return 'Inicio del flujo';
    case 'send_text':
      return data.text || 'Sin texto';
    case 'send_buttons':
    case 'send_quick_replies':
      return data.text || 'Sin texto';
    case 'send_media':
      return data.mediaUrl || 'Sin archivo';
    case 'ask_question':
      return data.saveToField ? `Guarda en "${data.saveToField}"` : 'Sin campo destino';
    case 'follow_gate':
      return data.text || 'Pide que te sigan';
    case 'send_link':
      return data.linkUrl ? data.linkUrl.replace(/^https?:\/\//, '') : 'Sin enlace';
    case 'wait': {
      const ms = data.delayMs ?? 0;
      if (ms >= 86400000) return `Espera ${Math.round(ms / 86400000)} día(s)`;
      if (ms >= 3600000) return `Espera ${Math.round(ms / 3600000)} hora(s)`;
      if (ms >= 60000) return `Espera ${Math.round(ms / 60000)} min`;
      return `Espera ${Math.round(ms / 1000)} s`;
    }
    case 'condition': {
      const n = data.rules?.length ?? 0;
      return n === 0 ? 'Sin reglas' : `${n} regla${n > 1 ? 's' : ''}`;
    }
    case 'add_tag':
    case 'remove_tag':
      return data.tag || 'Sin etiqueta';
    case 'set_field':
      return data.fieldKey ? `${data.fieldKey} = ${data.fieldValue ?? ''}` : 'Sin campo';
    case 'assign_human':
      return 'Pausa el bot';
    case 'http_request':
      return data.url || 'Sin URL';
    case 'end':
      return 'Fin del flujo';
    default:
      return '';
  }
}

export const BotIcon = Bot;
export const ClockIcon = Clock;
