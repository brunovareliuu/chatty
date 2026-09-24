import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/session';
import { borrarSuscripcion, esSuscripcionValida, guardarSuscripcion, notificar } from '@/lib/push/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Alta de un dispositivo. La primera vez manda un aviso de bienvenida: así se
 * ve de inmediato que funciona, sin buscar el botón de prueba.
 */
export async function POST(req: NextRequest) {
  let uid: string;
  try {
    uid = (await requireUser()).uid;
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { suscripcion?: unknown; nombre?: string; renovada?: boolean }
    | null;
  if (!body || !esSuscripcionValida(body.suscripcion)) {
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
  }

  const { id, nueva } = await guardarSuscripcion(uid, body.suscripcion, body.nombre ?? null);

  if (nueva && !body.renovada) {
    await notificar('prueba', {
      titulo: 'Listo, aquí te van a llegar los avisos',
      cuerpo: 'Comentarios, automatizaciones y checkpoints. Se ajusta en Ajustes › Notificaciones.',
      url: '/settings?tab=notificaciones',
      tag: 'bienvenida',
    }).catch((err) => console.error('[push] bienvenida', err));
  }

  return NextResponse.json({ id, nueva });
}

export async function DELETE(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { id?: string; endpoint?: string } | null;
  if (!body?.id && !body?.endpoint) {
    return NextResponse.json({ error: 'Falta id o endpoint' }, { status: 400 });
  }
  await borrarSuscripcion(body);
  return NextResponse.json({ ok: true });
}
