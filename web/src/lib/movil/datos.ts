/**
 * Formato que comparten las pantallas de la app del celular.
 */

/** Un Timestamp de Firestore, un número o nada → Date o null. */
export function aFecha(ts: unknown): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') return new Date(ts);
  const t = ts as { toDate?: () => Date; seconds?: number };
  if (typeof t.toDate === 'function') return t.toDate();
  if (typeof t.seconds === 'number') return new Date(t.seconds * 1000);
  return null;
}

/** «ahora», «hace 5 min», «ayer», «12 mar» — el estilo corto de iOS. */
export function hace(d: Date | null): string {
  if (!d) return '';
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} d`;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}
