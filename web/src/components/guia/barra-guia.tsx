'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Check,
  ListChecks,
  MessageCircle,
  Moon,
  Settings,
  Sparkles,
  Sun,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ModuloId } from '@/lib/guia/pasos';
import { cn } from '@/lib/utils';
import { cuenta, useHechos, type Resumen } from './hechos';
import { LogoMarca } from '@/components/identidad/logo';
import { useIdentidad } from '@/components/identidad/proveedor';

/**
 * La barra del modo guía: la misma del panel, con sus mismas secciones, pero
 * sin cuenta ni Firebase detrás. Cada sección enseña cuántos de sus pasos van.
 */

const ICONOS: Record<ModuloId, LucideIcon> = {
  bandeja: MessageCircle,
  automatizaciones: Zap,
  contactos: Users,
  estadisticas: TrendingUp,
  asistente: Sparkles,
  ajustes: Settings,
};

export type EntradaGuia = { id: ModuloId; titulo: string; ruta: string; pasos: Resumen[] };

export function BarraGuia({ entradas, todos }: { entradas: EntradaGuia[]; todos: Resumen[] }) {
  const pathname = usePathname();
  const hechos = useHechos();
  const { resolvedTheme, setTheme } = useTheme();
  const { nombre } = useIdentidad();
  const global = cuenta(todos, hechos);
  const instagram = entradas.filter((e) => e.id !== 'ajustes');
  const panel = entradas.filter((e) => e.id === 'ajustes');

  const enlace = (href: string, label: string, Icon: LucideIcon, avance: { listos: number; total: number }) => {
    const activo = pathname === href || pathname.startsWith(`${href}/`);
    const listo = avance.total > 0 && avance.listos === avance.total;
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-medium transition-colors',
          activo ? 'bg-surface-2 text-txt' : 'text-muted hover:bg-surface-2/60 hover:text-txt',
        )}
      >
        <Icon className="h-4.5 w-4.5" strokeWidth={activo ? 2.2 : 1.9} />
        <span className="flex-1">{label}</span>
        {listo ? (
          <Check className="h-3.5 w-3.5 text-pos" strokeWidth={3} />
        ) : (
          <span className="text-[11.5px] font-semibold tabular-nums text-faint">
            {avance.listos}/{avance.total}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Escritorio */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-2.5 pt-4 pr-3 pb-4 pl-4">
          <LogoMarca tam={26} />
          <span className="min-w-0 truncate text-[17px] font-bold tracking-[-0.3px]">{nombre}</span>
          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">Modo guía</span>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-3">
          <div className="space-y-0.5">{enlace('/primeros-pasos', 'Primeros pasos', ListChecks, global)}</div>
          <Grupo titulo="Instagram">
            {instagram.map((e) => enlace(e.ruta, e.titulo, ICONOS[e.id], cuenta(e.pasos, hechos)))}
          </Grupo>
          <Grupo titulo="Panel">
            {panel.map((e) => enlace(e.ruta, e.titulo, ICONOS[e.id], cuenta(e.pasos, hechos)))}
          </Grupo>
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
            <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-surface-2 text-[13px] font-bold text-muted">
              ?
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] leading-tight font-semibold">Sin conectar</p>
              <p className="truncate text-[11px] text-faint">Falta tu Firebase</p>
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
          </div>
        </div>
      </aside>

      {/* Celular: la misma navegación, en una tira que se desliza */}
      <div className="border-b border-border bg-surface pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
          <LogoMarca tam={24} />
          <span className="min-w-0 truncate text-[17px] font-bold tracking-[-0.3px]">{nombre}</span>
          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">Modo guía</span>
          <span className="ml-auto shrink-0 text-[12px] font-semibold tabular-nums text-muted">
            {global.listos}/{global.total} pasos
          </span>
        </div>
        <nav className="flex gap-1.5 overflow-x-auto px-3 pb-3 [scrollbar-width:none]">
          {[{ ruta: '/primeros-pasos', titulo: 'Primeros pasos' }, ...entradas].map((e) => {
            const activo = pathname === e.ruta || pathname.startsWith(`${e.ruta}/`);
            return (
              <Link
                key={e.ruta}
                href={e.ruta}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                  activo ? 'bg-txt text-bg' : 'bg-surface-2 text-muted',
                )}
              >
                {e.titulo}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 px-3 text-[10.5px] font-semibold tracking-[0.14em] text-faint uppercase">{titulo}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
