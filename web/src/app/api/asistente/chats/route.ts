import { NextResponse, type NextRequest } from 'next/server';
import { getAccount } from '@/lib/accounts';
import { listChats } from '@/lib/asistente/historial';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Conversaciones del asistente de una cuenta, la más reciente primero. */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'Falta accountId' }, { status: 400 });
  if (!(await getAccount(accountId))) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
  }

  return NextResponse.json({ chats: await listChats(accountId) });
}
