import 'server-only';

/**
 * ¿Ya está conectado a algo este despliegue? Mientras falten las llaves de
 * Firebase, el panel no puede ni pintar el login (el SDK del navegador truena
 * sin ellas), así que todo lleva a `/instalar`: la guía de qué hacer, sin
 * sesión. En cuanto están, regresa el login de siempre.
 *
 * Solo se dice si cada variable existe, nunca su valor. Las `NEXT_PUBLIC_*` se
 * leen con su nombre literal porque Next las incrusta al construir.
 */

const hay = (v: string | undefined) => Boolean(v && v.trim());

export type Variable = { nombre: string; para: string; lista: boolean; opcional?: boolean };

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

export function estadoInstalacion() {
  const firebase: Variable[] = [
    { nombre: 'NEXT_PUBLIC_FIREBASE_API_KEY', para: 'La llave web de tu proyecto', lista: hay(process.env.NEXT_PUBLIC_FIREBASE_API_KEY) },
    { nombre: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', para: 'tu-proyecto.firebaseapp.com', lista: hay(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) },
    { nombre: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', para: 'El ID de tu proyecto', lista: hay(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) },
    { nombre: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', para: 'tu-proyecto.firebasestorage.app', lista: hay(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) },
    { nombre: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', para: 'Un número largo', lista: hay(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) },
    { nombre: 'NEXT_PUBLIC_FIREBASE_APP_ID', para: '1:…:web:…', lista: hay(process.env.NEXT_PUBLIC_FIREBASE_APP_ID) },
  ];
  const meta: Variable[] = [
    { nombre: 'META_APP_ID', para: 'El ID de la app de Instagram (no el de Meta)', lista: hay(process.env.META_APP_ID) },
    { nombre: 'META_APP_SECRET', para: 'La clave secreta de la app de Instagram', lista: hay(process.env.META_APP_SECRET) },
    { nombre: 'META_WEBHOOK_VERIFY_TOKEN', para: 'Una cadena que inventas tú', lista: hay(process.env.META_WEBHOOK_VERIFY_TOKEN) },
  ];
  const panel: Variable[] = [
    { nombre: 'APP_URL', para: 'La URL pública del panel, sin slash final', lista: hay(process.env.APP_URL) },
    { nombre: 'TOKEN_ENCRYPTION_KEY', para: 'openssl rand -hex 32 · cifra los tokens de Meta', lista: hay(process.env.TOKEN_ENCRYPTION_KEY) },
    { nombre: 'CRON_SECRET', para: 'openssl rand -hex 32 · protege el cron', lista: hay(process.env.CRON_SECRET) },
    { nombre: 'ALLOWED_EMAILS', para: 'Quién entra. Vacío: el primero que entre queda de dueño', lista: hay(process.env.ALLOWED_EMAILS), opcional: true },
  ];
  const opcionales: Variable[] = [
    { nombre: 'CLAUDE_API_KEY', para: 'El asistente que arma automatizaciones', lista: hay(process.env.CLAUDE_API_KEY), opcional: true },
    { nombre: 'NEXT_PUBLIC_BRAND_NAME', para: 'Tu marca, en la política de privacidad y el asistente', lista: hay(process.env.NEXT_PUBLIC_BRAND_NAME), opcional: true },
  ];

  const obligatorias = [...firebase, ...meta, ...panel].filter((v) => !v.opcional);
  const appUrl = hay(process.env.APP_URL) ? process.env.APP_URL!.trim().replace(/\/+$/, '') : null;

  return {
    firebase,
    meta,
    panel,
    opcionales,
    listas: obligatorias.filter((v) => v.lista).length,
    total: obligatorias.length,
    appUrl,
  };
}
