'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { signOut } from 'firebase/auth';
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import type { AppUser } from '@/lib/types';
import { AccountSwitcher } from './account-switcher';
import { NAV, NAV_MOVIL, estaActivo } from './navegacion';
import { LogoConNombre } from '@/components/identidad/logo';

/**
 * La navegación del celular: cuatro destinos fijos abajo y «Más» con el menú
 * completo. En escritorio no existe (md:hidden); ahí manda la barra lateral.
 * La altura la conoce el layout, que aparta ese espacio en el contenido.
 */
export function BarraMovil({ user }: { user: AppUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [abierta, setAbierta] = useState(false);

  const enFijos = NAV_MOVIL.some((d) => estaActivo(pathname, d.href));

  async function salir() {
    await fetch('/api/auth/session', { method: 'DELETE' });
    await signOut(auth);
    router.replace('/login');
  }

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Navegación principal"
      >
        <div className="grid h-[60px] grid-cols-5">
          {NAV_MOVIL.map(({ href, label, icon: Icon }) => {
            const activo = estaActivo(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setAbierta(false)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 text-[10.5px] font-semibold tracking-[0.01em] transition-colors',
                  activo ? 'text-accent' : 'text-muted active:text-txt',
                )}
                aria-current={activo ? 'page' : undefined}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={activo ? 2.3 : 1.9} />
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => setAbierta((v) => !v)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-[10.5px] font-semibold tracking-[0.01em] transition-colors',
              abierta || !enFijos ? 'text-accent' : 'text-muted active:text-txt',
            )}
            aria-expanded={abierta}
            aria-label="Más secciones"
          >
            {abierta ? (
              <X className="h-[22px] w-[22px]" strokeWidth={2.3} />
            ) : (
              <Menu className="h-[22px] w-[22px]" strokeWidth={!enFijos ? 2.3 : 1.9} />
            )}
            Más
          </button>
        </div>
      </nav>

      {abierta && (
        <div className="fixed inset-0 z-30 md:hidden" role="dialog" aria-label="Menú">
          <button
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setAbierta(false)}
            aria-label="Cerrar menú"
          />
          <div className="absolute inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] max-h-[calc(100dvh-60px-env(safe-area-inset-bottom)-24px)] overflow-y-auto rounded-t-[28px] border-t border-border bg-surface shadow-2xl shadow-black/30 animate-rise">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 pt-4 pb-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <LogoConNombre tam={26} claseNombre="truncate text-[17px] font-bold tracking-[-0.3px]" />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-txt"
                  aria-label="Cambiar tema"
                >
                  {/* El tema lo sabe el CSS desde el primer pintado; el servidor no. Así no hay desajuste al hidratar. */}
                  <Sun className="hidden h-4 w-4 dark:block" />
                  <Moon className="h-4 w-4 dark:hidden" />
                </button>
                <button
                  onClick={salir}
                  className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-neg"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="px-4 pt-3">
              <AccountSwitcher />
            </div>

            <div className="space-y-5 px-4 py-4">
              {NAV.map(({ titulo, items }) => (
                <div key={titulo}>
                  <p className="mb-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">
                    {titulo}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {items.map(({ href, label, icon: Icon }) => {
                      const activo = estaActivo(pathname, href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setAbierta(false)}
                          className={cn(
                            'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors',
                            activo ? 'bg-surface-2 text-txt' : 'text-muted active:bg-surface-2',
                          )}
                        >
                          <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={activo ? 2.2 : 1.9} />
                          <span className="truncate">{label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2.5 border-t border-border px-5 py-3">
              <Avatar src={user.photoURL} name={user.displayName ?? user.email} size={30} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-tight">
                  {user.displayName ?? user.email.split('@')[0]}
                </p>
                <p className="truncate text-[11px] text-faint">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
