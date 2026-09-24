import { NextResponse } from 'next/server';
import { conversationsCol } from '@/lib/accounts';
import { requireUser } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser().catch(() => null);
  const { id } = await params;
  const { accountId } = (await req.json()) as { accountId?: string };
  if (!accountId) return NextResponse.json({ error: 'Falta accountId' }, { status: 400 });

  await conversationsCol(accountId).doc(id).update({ unreadCount: 0 });
  return NextResponse.json({ ok: true });
}
