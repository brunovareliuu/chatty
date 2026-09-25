import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/session';
import { firebaseListo } from '@/lib/instalacion';
import { esPng, guardarIdentidad } from '@/lib/identidad/servidor';
import { leeEntrada } from '@/lib/identidad/tipos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Guarda la identidad del panel (Ajustes › Marca): nombre, color y logo. */
export async function PUT(req: NextRequest) {
  // En el modo guía no hay dónde guardarla: la pantalla la deja en el navegador.
  if (!firebaseListo()) {
    return NextResponse.json({ error: 'Sin Firebase: se guarda en este navegador' }, { status: 409 });
  }
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const leida = leeEntrada(await req.json().catch(() => null));
  if (!leida.ok) return NextResponse.json({ error: leida.error }, { status: 400 });
  if (leida.entrada.logo && !esPng(leida.entrada.logo)) {
    return NextResponse.json({ error: 'El logo no es un PNG válido' }, { status: 400 });
  }

  const identidad = await guardarIdentidad(leida.entrada);
  return NextResponse.json({ identidad });
}
