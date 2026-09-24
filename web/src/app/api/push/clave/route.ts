import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { clavesVapid } from '@/lib/push/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** La llave pública VAPID con la que el navegador se suscribe. */
export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const { publicKey } = await clavesVapid();
  return NextResponse.json({ clavePublica: publicKey });
}
