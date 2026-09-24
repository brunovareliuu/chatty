import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes, createHash, timingSafeEqual, createHmac } from 'node:crypto';

/**
 * Los access tokens de Meta dan control total sobre los DMs de la cuenta, así
 * que no se guardan en claro en Firestore. AES-256-GCM con una llave del
 * entorno; si alguien lee la base sin la llave, los tokens no le sirven.
 */

const ALGO = 'aes-256-gcm';

function key(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error(
      'Falta TOKEN_ENCRYPTION_KEY (mínimo 32 caracteres). Genera una con: openssl rand -hex 32',
    );
  }
  // Derivamos 32 bytes exactos sin importar el largo del secreto.
  return createHash('sha256').update(secret).digest();
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join('.');
}

export function decryptToken(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Token cifrado con formato inválido');
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Verifica la firma X-Hub-Signature-256 que Meta manda en cada webhook.
 * Sin esto, cualquiera que conozca la URL puede inyectar mensajes falsos.
 */
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header) return false;
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
