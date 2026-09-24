import { NextResponse } from 'next/server';
import { conversationsCol } from '@/lib/accounts';
import { cancelActiveRuns } from '@/lib/engine/runner';
import { requireUser, UnauthorizedError } from '@/lib/session';

export const runtime = 'nodejs';

/** Pausa o reanuda los bots en una conversación concreta. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    throw err;
  }

  const { id } = await params;
  const { accountId, paused } = (await req.json()) as { accountId?: string; paused?: boolean };
  if (!accountId || typeof paused !== 'boolean') {
    return NextResponse.json({ error: 'Faltan accountId o paused' }, { status: 400 });
  }

  await conversationsCol(accountId).doc(id).update({
    automationPaused: paused,
    automationPausedUntil: null,
  });

  // Al pausar, cortamos cualquier flujo a medias para que no siga mandando.
  if (paused) await cancelActiveRuns(accountId, id);

  return NextResponse.json({ ok: true });
}
