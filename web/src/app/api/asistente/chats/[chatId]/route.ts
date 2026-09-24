import { NextResponse, type NextRequest } from 'next/server';
import { getAccount } from '@/lib/accounts';
import { deleteChat, loadMessages, repairHistory, toViewMessages } from '@/lib/asistente/historial';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ chatId: string }> };

async function authorize(req: NextRequest): Promise<{ accountId: string } | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'Falta accountId' }, { status: 400 });
  if (!(await getAccount(accountId))) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
  }
  return { accountId };
}

/** Historial de una conversación, listo para pintar. */
export async function GET(req: NextRequest, ctx: Context) {
  const auth = await authorize(req);
  if (auth instanceof NextResponse) return auth;

  const { chatId } = await ctx.params;
  const messages = await loadMessages(auth.accountId, chatId);
  if (!messages) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });

  return NextResponse.json({ messages: toViewMessages(repairHistory(messages)) });
}

export async function DELETE(req: NextRequest, ctx: Context) {
  const auth = await authorize(req);
  if (auth instanceof NextResponse) return auth;

  const { chatId } = await ctx.params;
  await deleteChat(auth.accountId, chatId);
  return NextResponse.json({ ok: true });
}
