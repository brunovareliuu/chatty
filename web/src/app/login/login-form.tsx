'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type UserCredential,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';

/**
 * Dos formas de entrar: correo y contraseña (la cuenta del admin) o Google.
 * Las dos terminan igual: el ID token se cambia por la cookie de sesión y el
 * servidor decide si el correo tiene acceso (ALLOWED_EMAILS).
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<'correo' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function completa(credential: UserCredential) {
    const idToken = await credential.user.getIdToken();
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      // La sesión de Firebase no sirve si el servidor no nos dio acceso.
      await signOut(auth);
      setError(body.error ?? 'No se pudo iniciar sesión');
      return;
    }

    router.replace('/inbox');
    router.refresh();
  }

  function mensaje(err: unknown): string | null {
    const code = (err as { code?: string }).code;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Correo o contraseña incorrectos';
    }
    if (code === 'auth/invalid-email') return 'Correo inválido';
    if (code === 'auth/too-many-requests') return 'Demasiados intentos. Espera un momento.';
    return err instanceof Error ? err.message : 'Error al iniciar sesión';
  }

  async function conCorreo(e: React.FormEvent) {
    e.preventDefault();
    setLoading('correo');
    setError(null);
    try {
      await completa(await signInWithEmailAndPassword(auth, email, password));
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setLoading(null);
    }
  }

  async function conGoogle() {
    setLoading('google');
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await completa(await signInWithPopup(auth, provider));
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setLoading(null);
    }
  }

  const campo =
    'w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-[14px] outline-none transition-colors placeholder:text-faint focus:border-accent';

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-5">
      <div className="w-full max-w-[380px] animate-rise">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-accent">
            <span className="text-[26px] font-black tracking-tight text-white">C</span>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-[32px] font-bold tracking-[-0.8px]">Chatty</h1>
            <p className="text-[15px] text-muted">Tu bandeja y tus automatizaciones de Instagram.</p>
          </div>
        </div>

        <div className="rounded-panel border border-border bg-surface p-5">
          <form onSubmit={conCorreo} className="space-y-2.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo"
              autoComplete="email"
              required
              className={campo}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              autoComplete="current-password"
              required
              className={campo}
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading === 'correo'}
              disabled={loading === 'google'}
            >
              Entrar
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-[12px] text-faint">
            <span className="h-px flex-1 bg-border" />
            o
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={conGoogle}
            loading={loading === 'google'}
            disabled={loading === 'correo'}
          >
            Continuar con Google
          </Button>

          {error && (
            <p className="mt-3 rounded-xl bg-neg/10 px-3 py-2 text-[13px] leading-snug text-neg">
              {error}
            </p>
          )}

          <p className="mt-4 text-center text-[12px] leading-relaxed text-faint">
            Solo las cuentas autorizadas en <span className="font-medium">ALLOWED_EMAILS</span> pueden entrar.
          </p>
        </div>
      </div>
    </main>
  );
}
