'use client';

import Link from 'next/link';
import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoConNombre } from '@/components/identidad/logo';

/*
 * Las piezas de la barra lateral. Viven aparte de `sidebar.tsx` porque las usa
 * también la barra del modo guía, que no puede importar nada de Firebase: sin
 * sus variables, el SDK del navegador truena al cargar.
 */

/** El armazón de vidrio de la barra lateral: logo y `arriba` en la cabeza, el menú y el `pie`. */
export function MarcoBarra({
  arriba,
  pie,
  children,
}: {
  arriba?: React.ReactNode;
  pie: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // En celular no existe: ahí navega la barra inferior (barra-movil.tsx).
    <aside className="vidrio hidden w-[244px] shrink-0 flex-col border-r border-border md:flex">
      <div className="flex h-[56px] shrink-0 items-center justify-between gap-2 pr-3 pl-[18px]">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <LogoConNombre tam={24} claseNombre="min-w-0 truncate text-[16px] font-bold tracking-[-0.02em]" />
        </Link>
        {arriba}
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-3 pt-1 pb-3">{children}</nav>

      <div className="border-t border-hairline px-2.5 pt-2 pb-2.5">{pie}</div>
    </aside>
  );
}

export function GrupoBarra({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2.5 pb-1 text-[11px] font-semibold text-faint">{titulo}</p>
      <div className="space-y-px">{children}</div>
    </div>
  );
}

/** Una línea del menú: la activa va en el color de la marca. `extra` va a la derecha (un contador). */
export function EnlaceBarra({
  href,
  label,
  icon: Icon,
  activo,
  extra,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  activo: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={activo ? 'page' : undefined}
      data-activo={activo || undefined}
      className={cn(
        'group/enlace flex h-[30px] items-center gap-2.5 rounded-[8px] px-2.5 text-[13.5px] transition-colors',
        activo ? 'bg-accent font-semibold text-accent-fg' : 'font-[450] text-txt hover:bg-fill-soft',
      )}
    >
      <Icon className={cn('h-[17px] w-[17px] shrink-0', activo ? 'text-accent-fg' : 'text-muted')} strokeWidth={1.6} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {extra}
    </Link>
  );
}

/** El avance de unos pasos: «3/7», o una palomita cuando ya están todos. */
export function Avance({ listos, total }: { listos: number; total: number }) {
  if (total > 0 && listos === total) {
    return <Check className="h-3.5 w-3.5 text-pos group-data-[activo]/enlace:text-accent-fg" strokeWidth={3} />;
  }
  return (
    <span className="tabular text-[12px] text-faint group-data-[activo]/enlace:text-accent-fg/80">
      {listos}/{total}
    </span>
  );
}
