import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { clavesVapid, historial, leerPreferencias, listarDispositivos } from '@/lib/push/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Todo lo que pinta Ajustes › Notificaciones, en una sola llamada. */
export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const [claves, dispositivos, preferencias, avisos] = await Promise.all([
    clavesVapid(),
    listarDispositivos(),
    leerPreferencias(),
    historial(30),
  ]);

  return NextResponse.json({ clavePublica: claves.publicKey, dispositivos, preferencias, historial: avisos });
}
