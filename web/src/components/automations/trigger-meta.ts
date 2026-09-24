import { MessageSquare, MousePointerClick, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import type { Trigger, TriggerType } from '@/lib/types';

/** Cómo se llama y con qué icono se ve cada disparador en el panel. */
export const TRIGGER_LABELS: Record<TriggerType, { label: string; icon: LucideIcon }> = {
  dm_keyword: { label: 'Palabra clave en DM', icon: MessageSquare },
  comment_keyword: { label: 'Comentario en publicación', icon: MousePointerClick },
  story_reply: { label: 'Respuesta a historia', icon: Sparkles },
  first_message: { label: 'Primer mensaje', icon: Zap },
  default_reply: { label: 'Respuesta por defecto', icon: MessageSquare },
};

/**
 * Una línea que dice cuándo se dispara, para la lista y para la cabecera del
 * editor: «Comentario en publicación · precio, costo · 2 publicaciones».
 */
export function triggerSummary(trigger: Trigger, maxKeywords = 4): string {
  const parts = [TRIGGER_LABELS[trigger.type].label];

  if (trigger.keywords.length > 0) {
    const shown = trigger.keywords.slice(0, maxKeywords).join(', ');
    const rest = trigger.keywords.length - maxKeywords;
    parts.push(rest > 0 ? `${shown} +${rest}` : shown);
  }

  if (trigger.type === 'comment_keyword' && trigger.postIds.length > 0) {
    parts.push(
      `${trigger.postIds.length} ${trigger.postIds.length === 1 ? 'publicación' : 'publicaciones'}`,
    );
  }

  return parts.join(' · ');
}
