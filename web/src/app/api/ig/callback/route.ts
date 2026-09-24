import { NextResponse, type NextRequest } from 'next/server';
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getSelfProfile,
  subscribeToWebhooks,
} from '@/lib/instagram';
import { accountRef, saveAccountToken } from '@/lib/accounts';
import { getCurrentUser } from '@/lib/session';
import { appUrl, requireEnv } from '@/lib/env';
import { OAUTH_STATE_COOKIE } from '../connect/route';
import { OAUTH_VOLVER_COOKIE, esRutaDelPanel } from '@/lib/oauth-volver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', appUrl()));

  // Se vuelve a la pantalla desde la que se pidió (p. ej. /instagram), o a Ajustes.
  const volver = req.cookies.get(OAUTH_VOLVER_COOKIE)?.value;
  const destino = esRutaDelPanel(volver) ? volver : '/settings';

  function fail(reason: string) {
    const url = new URL(destino, appUrl());
    url.searchParams.set('ig_error', reason);
    const res = NextResponse.redirect(url);
    res.cookies.set(OAUTH_VOLVER_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  }

  const params = req.nextUrl.searchParams;

  if (params.get('error')) {
    return fail(params.get('error_description') ?? 'Autorización cancelada');
  }

  const code = params.get('code');
  const state = params.get('state');
  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code) return fail('Instagram no devolvió el código de autorización');
  if (!state || !expectedState || state !== expectedState) {
    return fail('El state no coincide — vuelve a intentar la conexión');
  }

  try {
    const clientId = requireEnv('META_APP_ID');
    const clientSecret = requireEnv('META_APP_SECRET');
    const redirectUri = `${appUrl()}/api/ig/callback`;

    // 1. código -> token corto
    const short = await exchangeCodeForToken({ clientId, clientSecret, redirectUri, code });

    // 2. token corto -> token largo (60 días)
    const long = await exchangeForLongLivedToken({
      clientSecret,
      shortLivedToken: short.accessToken,
    });

    // 3. perfil de la cuenta conectada
    const profile = await getSelfProfile(long.accessToken);
    const igUserId = profile.user_id ?? short.userId;
    if (!igUserId) return fail('No se pudo identificar la cuenta de Instagram');

    // 4. suscribir la cuenta a los webhooks — sin esto no llegan mensajes
    let webhookWarning: string | null = null;
    try {
      await subscribeToWebhooks(igUserId, long.accessToken);
    } catch (err) {
      webhookWarning = err instanceof Error ? err.message : String(err);
      console.error('[ig] no se pudo suscribir a webhooks', err);
    }

    await saveAccountToken(igUserId, long.accessToken);

    await accountRef(igUserId).set(
      {
        id: igUserId,
        username: profile.username ?? '',
        name: profile.name ?? null,
        profilePictureUrl: profile.profile_picture_url ?? null,
        followersCount: profile.followers_count ?? null,
        tokenExpiresAt: Date.now() + long.expiresIn * 1000,
        tokenRefreshedAt: Date.now(),
        scopes: short.permissions,
        connectedAt: Date.now(),
        connectedBy: user.uid,
        active: true,
        needsReconnect: false,
        lastError: webhookWarning
          ? `Cuenta conectada, pero falló la suscripción a webhooks: ${webhookWarning}`
          : null,
      },
      { merge: true },
    );

    const done = new URL(destino, appUrl());
    done.searchParams.set('ig_connected', profile.username ?? igUserId);
    const res = NextResponse.redirect(done);
    res.cookies.set(OAUTH_STATE_COOKIE, '', { path: '/', maxAge: 0 });
    res.cookies.set(OAUTH_VOLVER_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  } catch (err) {
    console.error('[ig] callback falló', err);
    return fail(err instanceof Error ? err.message : 'Error desconocido al conectar');
  }
}
