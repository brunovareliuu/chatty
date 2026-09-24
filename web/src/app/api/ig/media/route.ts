import { NextResponse, type NextRequest } from 'next/server';
import { flagAccountError, getAccount, getAccountToken } from '@/lib/accounts';
import { InstagramApiError, listMedia } from '@/lib/instagram';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Publicaciones de una cuenta conectada, para el selector de posts.
 * El token nunca sale de aquí: el navegador solo recibe la lista.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'Falta accountId' }, { status: 400 });

  const account = await getAccount(accountId);
  if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });

  try {
    const token = await getAccountToken(account);
    const media = await listMedia(token);
    return NextResponse.json({ media });
  } catch (err) {
    if (err instanceof InstagramApiError) await flagAccountError(accountId, err);
    const message = err instanceof Error ? err.message : 'No se pudieron cargar las publicaciones';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
