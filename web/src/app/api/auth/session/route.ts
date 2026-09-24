import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  createSessionCookie,
  isEmailAllowed,
} from '@/lib/session';
import type { AppUser } from '@/lib/types';

export const runtime = 'nodejs';

/** Cambia un ID token de Firebase por una cookie de sesión httpOnly. */
export async function POST(req: Request) {
  const { idToken } = (await req.json()) as { idToken?: string };
  if (!idToken) {
    return NextResponse.json({ error: 'Falta el idToken' }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken, true);
  } catch {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  const email = decoded.email;
  if (!email) {
    return NextResponse.json({ error: 'La cuenta no tiene correo' }, { status: 400 });
  }

  const userRef = adminDb.collection('users').doc(decoded.uid);
  const existing = await userRef.get();

  if (!existing.exists) {
    if (!(await isEmailAllowed(email))) {
      return NextResponse.json(
        { error: 'Esta cuenta no tiene acceso. Pide que agreguen tu correo a ALLOWED_EMAILS.' },
        { status: 403 },
      );
    }

    // El primer usuario del despliegue es el dueño.
    const anyUser = await adminDb.collection('users').limit(1).get();
    const user: AppUser = {
      uid: decoded.uid,
      email,
      displayName: decoded.name ?? null,
      photoURL: decoded.picture ?? null,
      role: anyUser.empty ? 'owner' : 'agent',
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    };
    await userRef.set(user);
  } else {
    // Un perfil que escribió otra app del proyecto puede no traer nombre ni
    // foto en el formato de Chatty: se completan con lo que diga el token
    // (Google los trae).
    const datos = existing.data() ?? {};
    await userRef.update({
      lastSeenAt: Date.now(),
      ...(!datos.displayName && decoded.name ? { displayName: decoded.name } : {}),
      ...(!datos.photoURL && decoded.picture ? { photoURL: decoded.picture } : {}),
    });
  }

  const cookie = await createSessionCookie(idToken);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return res;
}

/** Cerrar sesión. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
