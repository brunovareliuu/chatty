/**
 * Fechas de la bandeja, como las escribe Mensajes: la hora si fue hoy, «Ayer»,
 * el día de la semana si fue esta semana y la fecha si fue antes.
 */

const DIA_MS = 86_400_000;

function inicioDelDia(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Cuántos días de calendario hay entre `ts` y hoy (0 = hoy). Redondea por los cambios de horario. */
function diasAtras(ts: number, ahora: number): number {
  return Math.round((inicioDelDia(ahora) - inicioDelDia(ts)) / DIA_MS);
}

function mayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** «9:05 p.m.» */
export function hora(ts: number): string {
  return new Date(ts).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
}

/** La columna de la derecha en la lista de conversaciones: «9:47 a.m.», «Ayer», «Lun», «12 sep». */
export function horaDeLista(ts: number, ahora = Date.now()): string {
  const dias = diasAtras(ts, ahora);
  if (dias <= 0) return hora(ts);
  if (dias === 1) return 'Ayer';
  const fecha = new Date(ts);
  if (dias < 7) return mayuscula(fecha.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', ''));
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '');
}

/** El separador de día dentro del hilo: «Hoy», «Ayer», «Lunes», «12 sep», «12 sep 2025». */
export function etiquetaDeDia(ts: number, ahora = Date.now()): string {
  const dias = diasAtras(ts, ahora);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  const fecha = new Date(ts);
  if (dias < 7) return mayuscula(fecha.toLocaleDateString('es-MX', { weekday: 'long' }));
  const mismoAno = fecha.getFullYear() === new Date(ahora).getFullYear();
  return fecha
    .toLocaleDateString('es-MX', { day: 'numeric', month: 'short', ...(mismoAno ? {} : { year: 'numeric' }) })
    .replace('.', '');
}

/** Si dos marcas de tiempo caen en el mismo día de calendario. */
export function mismoDia(a: number, b: number): boolean {
  return inicioDelDia(a) === inicioDelDia(b);
}
