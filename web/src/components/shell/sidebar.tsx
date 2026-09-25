'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { signOut } from 'firebase/auth';
import { Check, ListChecks, Moon, Sun, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { AccountSwitcher } from './account-switcher';
import { NAV, estaActivo } from './navegacion';
import { cuenta, useHechos, type Resumen } from '@/components/guia/hechos';
import { LogoConNombre } from '@/components/identidad/logo';
import type { AppUser } from '@/lib/types';


// Oculta o visible se recuerda por navegador. No va en cookie: en producción
// el CDN solo deja pasar `__session`.
const CLAVE_OCULTA = 'chatty:sidebar-oculta';
const EVENTO_OCULTA = 'chatty:sidebar';

function leeOculta(): boolean {
  try {
    return localStorage.getItem(CLAVE_OCULTA) === '1';
  } catch {
    return false;
  }
}

function ponOculta(oculta: boolean) {
  try {
    localStorage.setItem(CLAVE_OCULTA, oculta ? '1' : '0');
  } catch {
    // Sin almacenamiento solo dura hasta recargar.
  }
  window.dispatchEvent(new Event(EVENTO_OCULTA));
}

function suscribe(avisa: () => void) {
  window.addEventListener(EVENTO_OCULTA, avisa);
  window.addEventListener('storage', avisa);
  return () => {
    window.removeEventListener(EVENTO_OCULTA, avisa);
    window.removeEventListener('storage', avisa);
  };
}

export function Sidebar({ user, pasos = [] }: { user: AppUser; pasos?: Resumen[] }) {
  const pathname = usePathname();
  const hechos = useHechos();
  const avance = cuenta(pasos, hechos);
  const guiaActiva = estaActivo(pathname, '/primeros-pasos');
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  // En el servidor siempre visible; el navegador aplica lo guardado al hidratar.
  const oculta = useSyncExternalStore(suscribe, leeOculta, () => false);

  // ⌘B / Ctrl+B, como en los editores.
  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        const destino = e.target as HTMLElement | null;
        if (destino?.closest('input, textarea, [contenteditable="true"]')) return;
        e.preventDefault();
        ponOculta(!leeOculta());
      }
    }
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);

  async function logout() {
    await fetch('/api/auth/session', { method: 'DELETE' });
    await signOut(auth);
    router.replace('/login');
  }

  if (oculta) {
    return (
      <button
        onClick={() => ponOculta(false)}
        className="fixed bottom-4 left-4 z-40 hidden h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-muted shadow-lg transition-colors hover:text-txt md:grid"
        aria-label="Mostrar barra lateral"
        title="Mostrar barra lateral (⌘B)"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </button>
    );
  }

  return (
    // En celular no existe: ahí navega la barra inferior (barra-movil.tsx).
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex items-center justify-between gap-2 pt-4 pr-3 pb-3 pl-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <LogoConNombre tam={26} claseNombre="truncate text-[17px] font-bold tracking-[-0.3px]" />
        </div>
        <button
          onClick={() => ponOculta(true)}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-txt"
          aria-label="Ocultar barra lateral"
          title="Ocultar barra lateral (⌘B)"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="px-3 pb-3">
        <AccountSwitcher />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-3">
        {/* El checklist sigue a la mano: con su avance mientras falte algo. */}
        <Link
          href="/primeros-pasos"
          className={cn(
            'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-medium transition-colors',
            guiaActiva ? 'bg-surface-2 text-txt' : 'text-muted hover:bg-surface-2/60 hover:text-txt',
          )}
        >
          <ListChecks className="h-4.5 w-4.5" strokeWidth={guiaActiva ? 2.2 : 1.9} />
          <span className="flex-1">Primeros pasos</span>
          {avance.total > 0 && avance.listos === avance.total ? (
            <Check className="h-3.5 w-3.5 text-pos" strokeWidth={3} />
          ) : (
            <span className="text-[11.5px] font-semibold tabular-nums text-faint">
              {avance.listos}/{avance.total}
            </span>
          )}
        </Link>

        {NAV.map(({ titulo, items }) => (
          <div key={titulo}>
            <p className="mb-1 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">
              {titulo}
            </p>
            <div className="space-y-0.5">
              {items.map(({ href, label, icon: Icon }) => {
                const active = estaActivo(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-medium transition-colors',
                      active ? 'bg-surface-2 text-txt' : 'text-muted hover:bg-surface-2/60 hover:text-txt',
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" strokeWidth={active ? 2.2 : 1.9} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
          <Avatar src={user.photoURL} name={user.displayName ?? user.email} size={30} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight">
              {user.displayName ?? user.email.split('@')[0]}
            </p>
            <p className="truncate text-[11px] text-faint">
              {user.role === 'owner' ? 'Dueño' : 'Agente'}
            </p>
          </div>
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-txt"
            aria-label="Cambiar tema"
          >
            {/* El tema lo sabe el CSS desde el primer pintado; el servidor no. Así no hay desajuste al hidratar. */}
            <Sun className="hidden h-4 w-4 dark:block" />
            <Moon className="h-4 w-4 dark:hidden" />
          </button>
          <button
            onClick={logout}
            className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-neg"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
