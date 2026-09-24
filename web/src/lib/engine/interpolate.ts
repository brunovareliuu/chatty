import type { Contact } from '../types';

/**
 * Sustituye {{variables}} en los textos de un flujo.
 *
 * Disponibles: {{first_name}} {{full_name}} {{username}} además de cualquier
 * campo del contacto y cualquier variable capturada durante el run.
 */
export function interpolate(
  template: string,
  ctx: { contact: Contact; vars: Record<string, string | number | boolean> },
): string {
  const fullName = ctx.contact.name ?? ctx.contact.username ?? '';
  const builtins: Record<string, string> = {
    first_name: fullName.split(' ')[0] ?? '',
    full_name: fullName,
    username: ctx.contact.username ?? '',
  };

  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, rawKey: string) => {
    const key = rawKey.trim();
    if (key in builtins) return builtins[key];
    if (key in ctx.vars) return String(ctx.vars[key]);
    if (key in ctx.contact.fields) return String(ctx.contact.fields[key]);
    // Si no existe, dejamos vacío en vez de mostrar "{{algo}}" al usuario final.
    return '';
  });
}

/** Lista las variables usadas en un texto, para validar flujos en la UI. */
export function extractVariables(template: string): string[] {
  return [...template.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1].trim());
}
