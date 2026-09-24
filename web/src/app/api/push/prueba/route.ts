import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { notificar } from '@/lib/push/servidor';
import { ZONA_HORARIA } from '@/lib/marca';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** El botón «Enviar prueba»: sale a todos los dispositivos, pase lo que pase en Ajustes. */
export async function POST() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: ZONA_HORARIA });
  const resultado = await notificar('prueba', {
    titulo: 'Prueba del panel',
    cuerpo: `Si lees esto, los avisos llegan. Enviado a las ${hora}.`,
    url: '/settings?tab=notificaciones',
    tag: 'prueba',
  });
  return NextResponse.json(resultado);
}
