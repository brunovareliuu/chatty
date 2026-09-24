import type { MatchType, TriggerType } from '@/lib/types';

/**
 * Los textos del disparador, en corto. El escritorio los escribe largos porque
 * ahí caben («Alguien comenta una palabra clave en una publicación»); en una
 * fila de 390 px hay que decir lo mismo en tres palabras.
 *
 * Lo que sí se importa del escritorio y no se repite: `TRIGGER_LABELS` y
 * `triggerSummary` (`components/automations/trigger-meta.ts`).
 */

export const OPCIONES_DISPARADOR: { valor: TriggerType; label: string; largo: string }[] = [
  { valor: 'dm_keyword', label: 'Palabra en DM', largo: 'Alguien escribe una palabra clave por DM' },
  {
    valor: 'comment_keyword',
    label: 'Comentario',
    largo: 'Alguien comenta una palabra clave en una publicación',
  },
  { valor: 'story_reply', label: 'Historia', largo: 'Alguien responde a una historia' },
  { valor: 'first_message', label: 'Primer mensaje', largo: 'Alguien escribe por primera vez' },
  { valor: 'default_reply', label: 'Por defecto', largo: 'Nada más coincidió' },
];

export const OPCIONES_COINCIDENCIA: { valor: MatchType; label: string }[] = [
  { valor: 'contains', label: 'Contiene' },
  { valor: 'exact', label: 'Es exacto' },
  { valor: 'starts_with', label: 'Empieza con' },
  { valor: 'regex', label: 'Expresión regular' },
  { valor: 'any', label: 'Cualquier mensaje' },
];

export const OPCIONES_FRECUENCIA: { valor: string; label: string }[] = [
  { valor: '0', label: 'Siempre' },
  { valor: String(60 * 60 * 1000), label: 'Una vez por hora' },
  { valor: String(24 * 60 * 60 * 1000), label: 'Una vez al día' },
  { valor: String(7 * 24 * 60 * 60 * 1000), label: 'Una vez por semana' },
];

export function etiquetaCoincidencia(m: MatchType): string {
  return OPCIONES_COINCIDENCIA.find((o) => o.valor === m)?.label ?? m;
}

export function etiquetaFrecuencia(ms: number | undefined): string {
  return OPCIONES_FRECUENCIA.find((o) => o.valor === String(ms ?? 0))?.label ?? 'Siempre';
}
