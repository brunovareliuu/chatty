/**
 * La marca de quien usa el panel. Todo texto que nombra a un negocio sale de
 * aquí, así cada copia firma con la suya sin tocar código: basta con las
 * variables públicas de `.env.local` (o de `apphosting.yaml` en producción).
 *
 * Puro y sin 'use client': lo importan pantallas y rutas del servidor.
 * Next incrusta las `NEXT_PUBLIC_*` al construir, por eso se leen con su
 * nombre literal y no con `process.env[nombre]`.
 */

const limpia = (s: string | undefined) => (s ?? '').trim();

export const MARCA = {
  /** Cómo te llamas en público: la política de privacidad y el asistente. */
  nombre: limpia(process.env.NEXT_PUBLIC_BRAND_NAME) || 'Tu marca',
};

/** Tu sitio público, sin slash final (la política de privacidad lo enlaza). */
export const SITE_URL = (limpia(process.env.NEXT_PUBLIC_SITE_URL) || 'https://example.com').replace(/\/+$/, '');

/**
 * El dominio del sitio sin protocolo ni www: «tumarca.com». Sin sitio
 * configurado se lee ese ejemplo; los enlaces, en cambio, van a example.com
 * (un dominio reservado que no es de nadie).
 */
export const SITE_DOMINIO = limpia(process.env.NEXT_PUBLIC_SITE_URL)
  ? SITE_URL.replace(/^https?:\/\//, '').replace(/^www\./, '')
  : 'tumarca.com';

/**
 * La zona horaria del negocio (nombre IANA: America/Bogota, Europe/Madrid…).
 * Es la fecha que ve el asistente y la hora de los avisos de prueba.
 */
export const ZONA_HORARIA = limpia(process.env.NEXT_PUBLIC_TIMEZONE) || 'America/Mexico_City';
