'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { signOut } from 'firebase/auth';
import { ListChecks, Moon, Sun, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { AccountSwitcher } from './account-switcher';
import { NAV, estaActivo } from './navegacion';
import { cuenta, useHechos, type Resumen } from '@/components/guia/hechos';
import { Avance, EnlaceBarra, GrupoBarra, MarcoBarra } from './barra-piezas';
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
        className="vidrio fixed bottom-4 left-4 z-40 hidden h-9 w-9 place-items-center rounded-full text-muted shadow-float transition-colors hover:text-txt md:grid"
        aria-label="Mostrar barra lateral"
        title="Mostrar barra lateral (⌘B)"
      >
        <PanelLeftOpen className="h-4 w-4" strokeWidth={1.8} />
      </button>
    );
  }

  const oscuro = resolvedTheme === 'dark';

  return (
    <BarraLateral
      pathname={pathname}
      onOcultar={() => ponOculta(true)}
      avance={avance}
      pie={
        <AccountSwitcher
          lado="top"
          usuario={{
            nombre: user.displayName ?? user.email.split('@')[0],
            detalle: user.role === 'owner' ? `Dueño · ${user.email}` : `Agente · ${user.email}`,
            foto: user.photoURL,
          }}
          acciones={[
            {
              label: oscuro ? 'Modo claro' : 'Modo oscuro',
              icon: oscuro ? Sun : Moon,
              onClick: () => setTheme(oscuro ? 'light' : 'dark'),
            },
            { label: 'Cerrar sesión', icon: LogOut, onClick: logout, tono: 'neg' },
          ]}
        />
      }
    />
  );
}

/**
 * La barra lateral sin ganchos de sesión: vidrio esmerilado estilo macOS, el
 * logo arriba, «Primeros pasos» con su avance, el menú agrupado y la cuenta al
 * pie. La del modo guía (`guia/barra-guia.tsx`) usa las mismas piezas
 * (`barra-piezas.tsx`, sin Firebase).
 */
export function BarraLateral({
  pathname,
  onOcultar,
  pie,
  avance,
}: {
  pathname: string;
  onOcultar: () => void;
  pie: React.ReactNode;
  /** Cuántos pasos de Primeros pasos van. */
  avance: { listos: number; total: number };
}) {
  return (
    <MarcoBarra
      arriba={
        <button
          onClick={onOcultar}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-faint transition-colors hover:bg-fill-soft hover:text-txt"
          aria-label="Ocultar barra lateral"
          title="Ocultar barra lateral (⌘B)"
        >
          <PanelLeftClose className="h-4 w-4" strokeWidth={1.7} />
        </button>
      }
      pie={pie}
    >
      {/* El checklist sigue a la mano: con su avance mientras falte algo. */}
      <div>
        <EnlaceBarra
          href="/primeros-pasos"
          label="Primeros pasos"
          icon={ListChecks}
          activo={estaActivo(pathname, '/primeros-pasos')}
          extra={<Avance {...avance} />}
        />
      </div>

      {NAV.map(({ titulo, items }) => (
        <GrupoBarra key={titulo} titulo={titulo}>
          {items.map(({ href, label, icon }) => (
            <EnlaceBarra key={href} href={href} label={label} icon={icon} activo={estaActivo(pathname, href)} />
          ))}
        </GrupoBarra>
      ))}
    </MarcoBarra>
  );
}
