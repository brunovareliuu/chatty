import 'server-only';

import { cookies } from 'next/headers';
import { adminAuth, adminDb } from './firebase-admin';
import type { AppUser } from './types';

/**
 * Cloud Run / App Hosting solo deja pasar la cookie llamada `__session` a
 * través del CDN. Usar cualquier otro nombre rompe el login en producción.
 */
export const SESSION_COOKIE = '__session';
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 días

/** Lista blanca de correos. Si está vacía, el primero en entrar queda de dueño. */
function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isEmailAllowed(email: string): Promise<boolean> {
  const list = allowedEmails();
  if (list.length > 0) return list.includes(email.toLowerCase());

  // Sin lista configurada: solo se admite el primer registro.
  const existing = await adminDb.collection('users').limit(1).get();
  return existing.empty;
}

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
}

/** Usuario autenticado de la petición actual, o null. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    const snap = await adminDb.collection('users').doc(decoded.uid).get();
    if (!snap.exists) return null;
    return usuarioPlano(snap.id, snap.data() ?? {});
  } catch {
    // Cookie vencida o revocada.
    return null;
  }
}

/** Para rutas de API: lanza si no hay sesión. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('No autenticado');
    this.name = 'UnauthorizedError';
  }
}

/**
 * En `users/{uid}` pueden convivir dos formas de documento: un perfil escrito
 * por otra app del mismo proyecto de Firebase (`name`, `themePreference`,
 * `createdAt` como Timestamp…) y el `AppUser` de Chatty. Este usuario viaja del
 * layout (servidor) a la barra lateral (cliente), y Next solo deja pasar
 * objetos planos: se arma a mano, con primitivos.
 */
function usuarioPlano(uid: string, data: Record<string, unknown>): AppUser {
  const texto = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
  const numero = (v: unknown): number => {
    if (typeof v === 'number') return v;
    if (v && typeof (v as { toMillis?: unknown }).toMillis === 'function') {
      return (v as { toMillis: () => number }).toMillis();
    }
    return Date.now();
  };
  return {
    uid,
    email: texto(data.email) ?? '',
    displayName: texto(data.displayName) ?? texto(data.name),
    photoURL: texto(data.photoURL),
    role: data.role === 'agent' ? 'agent' : 'owner',
    createdAt: numero(data.createdAt),
    lastSeenAt: numero(data.lastSeenAt),
  };
}
