import 'server-only';

/**
 * ¿Ya está conectado a Firebase este despliegue? Mientras falte alguna de las
 * seis llaves, el panel no puede ni pintar el login (el SDK del navegador
 * truena sin ellas), así que se abre en modo guía: el sistema con sus
 * secciones, y en cada una los pasos para dejarla funcionando (`lib/guia`).
 *
 * Las `NEXT_PUBLIC_*` se leen con su nombre literal: Next las incrusta al construir.
 */
const hay = (v: string | undefined) => Boolean(v && v.trim());

export function firebaseListo(): boolean {
  return [
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  ].every(hay);
}
