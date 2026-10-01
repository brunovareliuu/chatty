'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
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
import { LogoConNombre } from '@/components/identidad/logo';
import { Avance, EnlaceBarra, GrupoBarra, MarcoBarra } from '@/components/shell/barra-piezas';
import { Badge } from '@/components/ui/badge';

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
  const global = cuenta(todos, hechos);
  const instagram = entradas.filter((e) => e.id !== 'ajustes');
  const panel = entradas.filter((e) => e.id === 'ajustes');
  const activo = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const enlace = (href: string, label: string, Icon: LucideIcon, avance: { listos: number; total: number }) => (
    <EnlaceBarra key={href} href={href} label={label} icon={Icon} activo={activo(href)} extra={<Avance {...avance} />} />
  );

  return (
    <>
      {/* Escritorio */}
      <MarcoBarra
        arriba={
          <Badge tone="accent" className="shrink-0">
            Modo guía
          </Badge>
        }
        pie={
          <div className="flex items-center gap-2.5 rounded-[10px] px-2 py-1.5">
            <span className="monograma grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold">
              ?
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] leading-tight font-semibold">Sin conectar</p>
              <p className="mt-0.5 truncate text-[11.5px] leading-tight text-faint">Falta tu Firebase</p>
            </div>
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="grid h-7 w-7 place-items-center rounded-full text-muted transition-colors hover:bg-fill hover:text-txt"
              aria-label="Cambiar tema"
            >
              {/* El tema lo sabe el CSS desde el primer pintado; el servidor no. Así no hay desajuste al hidratar. */}
              <Sun className="hidden h-4 w-4 dark:block" strokeWidth={1.8} />
              <Moon className="h-4 w-4 dark:hidden" strokeWidth={1.8} />
            </button>
          </div>
        }
      >
        <div>{enlace('/primeros-pasos', 'Primeros pasos', ListChecks, global)}</div>
        <GrupoBarra titulo="Instagram">
          {instagram.map((e) => enlace(e.ruta, e.titulo, ICONOS[e.id], cuenta(e.pasos, hechos)))}
        </GrupoBarra>
        <GrupoBarra titulo="Panel">
          {panel.map((e) => enlace(e.ruta, e.titulo, ICONOS[e.id], cuenta(e.pasos, hechos)))}
        </GrupoBarra>
      </MarcoBarra>

      {/* Celular: la misma navegación, en una tira que se desliza */}
      <div className="vidrio border-b border-border pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
          <LogoConNombre tam={24} claseNombre="min-w-0 truncate text-[17px] font-bold tracking-[-0.02em]" />
          <Badge tone="accent" className="shrink-0">
            Modo guía
          </Badge>
          <span className="tabular ml-auto shrink-0 text-[12px] font-medium text-muted">
            {global.listos}/{global.total} pasos
          </span>
        </div>
        <nav className="flex gap-1.5 overflow-x-auto px-3 pb-3 [scrollbar-width:none]">
          {[{ ruta: '/primeros-pasos', titulo: 'Primeros pasos' }, ...entradas].map((e) => (
            <Link
              key={e.ruta}
              href={e.ruta}
              aria-current={activo(e.ruta) ? 'page' : undefined}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition-colors',
                activo(e.ruta) ? 'bg-accent font-semibold text-accent-fg' : 'bg-fill font-medium text-txt active:bg-fill-strong',
              )}
            >
              {e.titulo}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
