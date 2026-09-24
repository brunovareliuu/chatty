'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

/**
 * La cookie de sesión y la sesión del SDK cliente pueden desfasarse (por
 * ejemplo si el usuario cierra sesión en otra pestaña). El cliente lee
 * Firestore directamente, así que sin sesión de SDK no hay datos: mejor
 * mandarlo al login que dejarlo mirando una pantalla vacía.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        void fetch('/api/auth/session', { method: 'DELETE' }).finally(() => {
          router.replace('/login');
        });
      }
    });
  }, [router]);

  if (user === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
