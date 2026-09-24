import 'server-only';

/** Variable obligatoria: si falta, queremos enterarnos con un mensaje claro. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Revisa .env.local (local) o apphosting.yaml (producción).`,
    );
  }
  return value;
}

/**
 * URL pública de la app. Debe coincidir exactamente con el redirect URI
 * registrado en el panel de Meta, sin slash final.
 */
export function appUrl(): string {
  const raw =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : undefined);

  if (!raw) {
    throw new Error('Falta APP_URL (la URL pública del despliegue, ej. https://panel.tumarca.com)');
  }
  return raw.replace(/\/+$/, '');
}
