import { NextResponse, type NextRequest } from 'next/server';
import { getAccount } from '@/lib/accounts';
import { getCurrentUser } from '@/lib/session';
import { leerTablero, recolectarEstadisticas } from '@/lib/estadisticas/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * El tablero de /instagram: lo que el cron fue guardando, en una sola
 * respuesta. No habla con Meta, así que carga al instante.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'Falta accountId' }, { status: 400 });

  const account = await getAccount(accountId);
  if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });

  try {
    return NextResponse.json(await leerTablero(account));
  } catch (err) {
    console.error('[estadisticas] tablero', err);
    const message = err instanceof Error ? err.message : 'No se pudo armar el tablero';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * «Actualizar»: una pasada del recolector ahora mismo, sin esperar al cron.
 * El token nunca sale de aquí; el navegador solo recibe qué se hizo.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { accountId } = (await req.json().catch(() => ({}))) as { accountId?: string };
  if (!accountId) return NextResponse.json({ error: 'Falta accountId' }, { status: 400 });

  const account = await getAccount(accountId);
  if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });

  const resultado = await recolectarEstadisticas(account, { forzar: true, presupuestoMs: 25_000 });
  return NextResponse.json({ ok: !resultado.error, ...resultado });
}
