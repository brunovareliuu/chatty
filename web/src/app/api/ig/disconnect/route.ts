import { NextResponse } from 'next/server';
import { accountRef, credentialsRef } from '@/lib/accounts';
import { requireUser, UnauthorizedError } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * Desconecta una cuenta: borra el token y la marca inactiva. Conservamos
 * conversaciones y contactos — desconectar no debe perder el historial.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role !== 'owner') {
      return NextResponse.json({ error: 'Solo el dueño puede desconectar cuentas' }, { status: 403 });
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    throw err;
  }

  const { accountId } = (await req.json()) as { accountId?: string };
  if (!accountId) return NextResponse.json({ error: 'Falta accountId' }, { status: 400 });

  await credentialsRef(accountId).delete().catch(() => {});
  await accountRef(accountId).update({
    active: false,
    needsReconnect: true,
    lastError: 'Cuenta desconectada manualmente',
  });

  return NextResponse.json({ ok: true });
}
