import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { buildAuthorizeUrl } from '@/lib/instagram';
import { getCurrentUser } from '@/lib/session';
import { appUrl, requireEnv } from '@/lib/env';
import { OAUTH_VOLVER_COOKIE, esRutaDelPanel } from '@/lib/oauth-volver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const OAUTH_STATE_COOKIE = 'ig_oauth_state';

/** Manda al usuario a Instagram para autorizar la app. */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', appUrl()));
  }

  const clientId = requireEnv('META_APP_ID');
  const state = randomBytes(24).toString('base64url');

  const url = buildAuthorizeUrl({
    clientId,
    redirectUri: `${appUrl()}/api/ig/callback`,
    state,
  });

  const res = NextResponse.redirect(url);
  // El state viaja en cookie httpOnly para detectar CSRF en el callback.
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // el código de Meta vive 1h; 10 min para autorizar es de sobra
  });
  const volver = req.nextUrl.searchParams.get('volver');
  if (esRutaDelPanel(volver)) {
    res.cookies.set(OAUTH_VOLVER_COOKIE, volver, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
  } else {
    // Que un intento anterior abandonado no desvíe esta conexión.
    res.cookies.set(OAUTH_VOLVER_COOKIE, '', { path: '/', maxAge: 0 });
  }
  return res;
}
