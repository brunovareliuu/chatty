import 'server-only';

import Anthropic from '@anthropic-ai/sdk';

/**
 * Modelo de todo lo que hace IA en Chatty: el asistente y el generador de
 * capturas. Sonnet 5 por costo: menos de la mitad que Opus 5 por token.
 */
export const CLAUDE_MODEL = 'claude-sonnet-5';

/**
 * Si el filtro de seguridad rechaza una petición, Anthropic la reintenta en el
 * modelo recomendado dentro de la misma llamada (`fallbacks: 'default'`). Esa
 * opción exige esta cabecera beta.
 */
export const CLAUDE_BETAS = ['server-side-fallback-2026-07-01'];

export class ClaudeNotConfiguredError extends Error {
  constructor() {
    super('Falta la llave de Claude. Agrega CLAUDE_API_KEY en .env.local (local) o como secreto en App Hosting.');
    this.name = 'ClaudeNotConfiguredError';
  }
}

let client: Anthropic | null = null;

/**
 * Cliente de la API. La llave se lee de CLAUDE_API_KEY y, si no está, de
 * ANTHROPIC_API_KEY, que es el nombre que busca el SDK por su cuenta.
 *
 * Una llave que no pertenece a un workspace tiene que decir en cuál trabajar
 * con la cabecera `anthropic-workspace-id`; sin ella la API responde 400.
 */
export function claude(): Anthropic {
  if (client) return client;
  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new ClaudeNotConfiguredError();
  const workspaceId = process.env.CLAUDE_WORKSPACE_ID || process.env.ANTHROPIC_WORKSPACE_ID;
  client = new Anthropic({
    apiKey,
    defaultHeaders: workspaceId ? { 'anthropic-workspace-id': workspaceId } : undefined,
  });
  return client;
}

/** Explicación corta de un error de Claude, para mostrarla en pantalla. */
export function describeClaudeError(err: unknown): string {
  if (err instanceof ClaudeNotConfiguredError) return err.message;
  if (err instanceof Anthropic.APIUserAbortError) return 'Se canceló la respuesta.';
  if (err instanceof Anthropic.AuthenticationError) {
    return 'Claude rechazó la llave. Revisa que CLAUDE_API_KEY sea correcta.';
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return 'La llave de Claude no tiene permiso para este modelo.';
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'Claude está recibiendo demasiadas peticiones. Intenta de nuevo en un minuto.';
  }
  if (err instanceof Anthropic.BadRequestError) {
    return `Claude no aceptó la petición: ${err.message}`;
  }
  if (err instanceof Anthropic.APIError) {
    return `Claude respondió con un error${err.status ? ` ${err.status}` : ''}. Intenta de nuevo.`;
  }
  return err instanceof Error ? err.message : 'Algo falló al hablar con Claude.';
}
