import { after, type NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { verifyMetaSignature } from '@/lib/crypto';
import { getAccount } from '@/lib/accounts';
import { handleWebhookEntry, type WebhookEntry } from '@/lib/webhook-handler';

// El webhook necesita el body crudo para validar la firma: nada de caché.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET — verificación del webhook.
 * Meta llama una vez con hub.challenge al configurar la URL en el panel.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!expected) {
    console.error('[webhook] falta META_WEBHOOK_VERIFY_TOKEN');
    return new NextResponse('Server misconfigured', { status: 500 });
  }

  if (mode === 'subscribe' && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST — eventos.
 *
 * Meta espera un 200 rápido y reintenta si tardamos. Validamos, respondemos, y
 * el trabajo pesado (motor de flujos, llamadas a la API) corre en `after()`.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();

  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error('[webhook] falta META_APP_SECRET');
    return new NextResponse('Server misconfigured', { status: 500 });
  }

  const signature = req.headers.get('x-hub-signature-256');
  if (!verifyMetaSignature(raw, signature, appSecret)) {
    console.warn('[webhook] firma inválida — petición descartada');
    return new NextResponse('Invalid signature', { status: 401 });
  }

  let payload: { object?: string; entry?: WebhookEntry[] };
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse('Bad JSON', { status: 400 });
  }

  if (payload.object !== 'instagram') {
    // Suscripciones de otros productos de Meta: no son nuestras.
    return NextResponse.json({ ok: true, ignored: payload.object });
  }

  const entries = payload.entry ?? [];

  after(async () => {
    for (const entry of entries) {
      try {
        const account = await getAccount(entry.id);
        if (!account) {
          console.warn(`[webhook] evento para cuenta no conectada: ${entry.id}`);
          continue;
        }
        if (!account.active) continue;
        await handleWebhookEntry(account, entry);
      } catch (err) {
        // Un entry roto no debe tumbar los demás.
        console.error('[webhook] error procesando entry', entry.id, err);
      }
    }
  });

  return NextResponse.json({ ok: true });
}
