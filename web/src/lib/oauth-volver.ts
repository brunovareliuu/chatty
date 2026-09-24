/**
 * A qué pantalla del panel regresar después de conectar Instagram
 * (`/api/ig/connect?volver=/instagram`). Sin esto, Meta siempre te deja en
 * Ajustes.
 */
export const OAUTH_VOLVER_COOKIE = 'ig_oauth_volver';

/** Solo rutas del propio panel: nada de `//otro-sitio` ni URLs completas. */
export function esRutaDelPanel(ruta: string | null | undefined): ruta is string {
  return Boolean(ruta && /^\/[a-z0-9/_-]*$/i.test(ruta) && !ruta.startsWith('//'));
}
