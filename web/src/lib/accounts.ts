import 'server-only';

import { adminDb } from './firebase-admin';
import { decryptToken, encryptToken } from './crypto';
import { refreshLongLivedToken, InstagramApiError } from './instagram';
import type { IgAccount } from './types';

export const accountsCol = () => adminDb.collection('accounts');
export const accountRef = (accountId: string) => accountsCol().doc(accountId);

/**
 * Credenciales de Meta. Vive en una subcolección que las reglas de Firestore
 * bloquean por completo: ningún cliente puede leerla, ni siquiera el dueño.
 */
export const credentialsRef = (accountId: string) =>
  accountRef(accountId).collection('private').doc('credentials');

type StoredCredentials = { accessTokenEnc: string };

export async function saveAccountToken(accountId: string, plainToken: string): Promise<void> {
  await credentialsRef(accountId).set({ accessTokenEnc: encryptToken(plainToken) });
}

export const contactsCol = (accountId: string) => accountRef(accountId).collection('contacts');
export const conversationsCol = (accountId: string) => accountRef(accountId).collection('conversations');
export const messagesCol = (accountId: string, conversationId: string) =>
  conversationsCol(accountId).doc(conversationId).collection('messages');
export const automationsCol = (accountId: string) => accountRef(accountId).collection('automations');
export const flowsCol = (accountId: string) => accountRef(accountId).collection('flows');
export const runsCol = (accountId: string) => accountRef(accountId).collection('runs');
export const tagsCol = (accountId: string) => accountRef(accountId).collection('tags');

export async function getAccount(accountId: string): Promise<IgAccount | null> {
  const snap = await accountRef(accountId).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as IgAccount) : null;
}

export async function listAccounts(): Promise<IgAccount[]> {
  const snap = await accountsCol().get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as IgAccount);
}

/** Renovamos cuando quedan menos de 10 días de los 60. */
const REFRESH_THRESHOLD_MS = 10 * 24 * 60 * 60 * 1000;

/**
 * Devuelve el token en claro de una cuenta, renovándolo si está por vencer.
 * Único punto del código que descifra tokens: si algo necesita hablar con
 * Meta, pasa por aquí.
 */
export async function getAccountToken(account: IgAccount): Promise<string> {
  const creds = await credentialsRef(account.id).get();
  const stored = creds.data() as StoredCredentials | undefined;
  if (!stored?.accessTokenEnc) {
    throw new Error(
      `La cuenta @${account.username} no tiene credenciales guardadas. Vuelve a conectarla desde Ajustes.`,
    );
  }

  const token = decryptToken(stored.accessTokenEnc);
  const expiresIn = account.tokenExpiresAt - Date.now();

  if (expiresIn > REFRESH_THRESHOLD_MS) return token;

  // Meta rechaza renovar tokens con menos de 24h de vida.
  if (Date.now() - account.tokenRefreshedAt < 24 * 60 * 60 * 1000) return token;

  try {
    const refreshed = await refreshLongLivedToken(token);
    await credentialsRef(account.id).set({ accessTokenEnc: encryptToken(refreshed.accessToken) });
    await accountRef(account.id).update({
      tokenExpiresAt: Date.now() + refreshed.expiresIn * 1000,
      tokenRefreshedAt: Date.now(),
      needsReconnect: false,
      lastError: null,
    });
    return refreshed.accessToken;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // El token viejo puede seguir sirviendo hasta vencer; marcamos pero no rompemos.
    await accountRef(account.id).update({
      needsReconnect: expiresIn <= 0,
      lastError: `No se pudo renovar el token: ${message}`,
    });
    if (expiresIn <= 0) throw err;
    return token;
  }
}

/** Marca la cuenta como desconectada cuando Meta rechaza el token. */
export async function flagAccountError(accountId: string, err: unknown): Promise<void> {
  const isAuth = err instanceof InstagramApiError && err.isAuthError;
  await accountRef(accountId).update({
    needsReconnect: isAuth,
    lastError: err instanceof Error ? err.message : String(err),
  });
}
