'use client';

import { Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Los mandos sueltos de iOS: el control segmentado, el campo de búsqueda, los
 * botones grandes del pie y los estados de vacío y de carga. Nada de esto
 * existe en el panel de escritorio: allá las cosas son más chicas y con hover,
 * aquí todo se toca con el dedo (44 px de alto mínimo).
 */

/** Control segmentado: las pestañas en pastilla de iOS. */
export function Segmentado<T extends string>({
  valor,
  onChange,
  opciones,
  className,
}: {
  valor: T;
  onChange: (v: T) => void;
  opciones: { valor: T; label: string; contador?: number }[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn('flex gap-0.5 rounded-[9px] bg-surface-2 p-0.5', className)}
    >
      {opciones.map((o) => {
        const on = o.valor === valor;
        return (
          <button
            key={o.valor}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.valor)}
            className={cn(
              'flex min-h-[32px] flex-1 items-center justify-center gap-1.5 rounded-[7px] px-2 text-[13px] font-medium transition-colors',
              on ? 'bg-surface text-txt shadow-sm' : 'text-muted active:opacity-60',
            )}
          >
            <span className="truncate">{o.label}</span>
            {typeof o.contador === 'number' && o.contador > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                  on ? 'bg-accent text-accent-fg' : 'bg-surface text-muted',
                )}
              >
                {o.contador}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** El campo de búsqueda gris redondeado que iOS pone bajo el título. */
export function Busqueda({
  valor,
  onChange,
  placeholder = 'Buscar',
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-[17px] w-[17px] -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        // 16 px o más: con menos, Safari hace zoom al enfocar el campo.
        className="h-9 w-full rounded-[10px] bg-surface-2 pr-8 pl-8 text-[16px] text-txt outline-none placeholder:text-muted"
      />
      {valor && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-muted/60 text-surface"
          aria-label="Borrar búsqueda"
        >
          <X className="h-3 w-3" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

/** El botón ancho que iOS pone abajo del todo para la acción principal. */
export function BotonGrande({
  children,
  onClick,
  href,
  tono = 'acento',
  disabled,
  cargando,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  tono?: 'acento' | 'suave' | 'peligro';
  disabled?: boolean;
  cargando?: boolean;
}) {
  const clases = cn(
    'flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] text-[17px] font-semibold transition-opacity active:opacity-70 disabled:opacity-40',
    tono === 'acento' && 'bg-accent text-accent-fg',
    tono === 'suave' && 'bg-surface-2 text-txt',
    tono === 'peligro' && 'bg-neg text-white',
  );
  const contenido = (
    <>
      {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </>
  );
  if (href) {
    return (
      <a href={href} className={clases}>
        {contenido}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled || cargando} className={clases}>
      {contenido}
    </button>
  );
}

/** Nada que enseñar todavía. */
export function Vacio({
  icon: Icon,
  titulo,
  detalle,
  accion,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  titulo: string;
  detalle?: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <Icon className="h-10 w-10 text-faint" strokeWidth={1.5} />
      <p className="mt-4 text-[17px] font-semibold">{titulo}</p>
      {detalle && <p className="mt-1.5 text-[15px] leading-[1.4] text-muted">{detalle}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}

/** La ruedita de iOS mientras llegan los datos. */
export function Cargando({ className }: { className?: string }) {
  return (
    <div className={cn('flex justify-center py-14', className)}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  );
}

/**
 * La insignia redonda con un número, como la de la app de Mensajes. En cero
 * no se pinta: iOS tampoco la enseña.
 */
export function Globo({ n, tono = 'accent' }: { n: number; tono?: 'accent' | 'neg' | 'muted' }) {
  if (!n) return null;
  return (
    <span
      className={cn(
        'inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[12px] font-semibold tabular-nums',
        tono === 'accent' && 'bg-accent text-accent-fg',
        tono === 'neg' && 'bg-neg text-white',
        tono === 'muted' && 'bg-surface-2 text-muted',
      )}
    >
      {n > 99 ? '99+' : n}
    </span>
  );
}
