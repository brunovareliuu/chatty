import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "hace 5 min", "ayer", "12 mar" — corto, para listas densas. */
export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `${min}m`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

/** Cuánto queda de la ventana de 24h de Meta. null si ya venció. */
export function windowRemaining(expiresAt: number): { hours: number; minutes: number } | null {
  const left = expiresAt - Date.now();
  if (left <= 0) return null;
  return { hours: Math.floor(left / 3600000), minutes: Math.floor((left % 3600000) / 60000) };
}
