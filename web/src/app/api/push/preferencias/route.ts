import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/session';
import { guardarPreferencias, leerPreferencias } from '@/lib/push/servidor';
import { completaPreferencias, type Preferencias } from '@/lib/push/tipos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as Partial<Preferencias> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  await guardarPreferencias(completaPreferencias(body));
  return NextResponse.json({ preferencias: await leerPreferencias() });
}
