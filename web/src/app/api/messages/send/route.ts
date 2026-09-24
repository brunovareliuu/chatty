import { NextResponse } from 'next/server';
import { getAccount } from '@/lib/accounts';
import { conversationsCol } from '@/lib/accounts';
import { sendAndRecord, getConversation, isWithinWindow } from '@/lib/messaging';
import { requireUser, UnauthorizedError } from '@/lib/session';
import { InstagramApiError, type OutgoingMessage } from '@/lib/instagram';

export const runtime = 'nodejs';

type Body = {
  accountId: string;
  conversationId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
};

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    throw err;
  }

  const body = (await req.json()) as Body;
  if (!body.accountId || !body.conversationId) {
    return NextResponse.json({ error: 'Faltan accountId o conversationId' }, { status: 400 });
  }
  if (!body.text?.trim() && !body.mediaUrl) {
    return NextResponse.json({ error: 'El mensaje está vacío' }, { status: 400 });
  }

  const account = await getAccount(body.accountId);
  if (!account) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
  }

  const conversation = await getConversation(account.id, body.conversationId);
  if (!conversation) {
    return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
  }

  const message: OutgoingMessage = body.mediaUrl
    ? { kind: 'media', mediaType: body.mediaType ?? 'image', url: body.mediaUrl }
    : { kind: 'text', text: body.text!.trim() };

  try {
    const sent = await sendAndRecord({
      account,
      conversationId: body.conversationId,
      message,
      origin: { sentBy: 'human', uid: user.uid },
      // Fuera de las 24h, la etiqueta HUMAN_AGENT da 7 días — válida solo
      // porque este endpoint lo dispara una persona desde la bandeja.
      humanAgent: !isWithinWindow(conversation),
    });

    // Que un humano escriba desactiva la automatización de esa conversación.
    await conversationsCol(account.id).doc(body.conversationId).update({
      automationPaused: true,
      unreadCount: 0,
    });

    return NextResponse.json({ ok: true, message: sent });
  } catch (err) {
    const status = err instanceof InstagramApiError ? (err.isOutsideWindow ? 422 : 502) : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No se pudo enviar' },
      { status },
    );
  }
}
