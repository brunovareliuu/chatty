'use client';

import { cn } from '@/lib/utils';

export type OpcionSegmentada<T extends string> = {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Un número en la pastilla del acento («Abiertas 3»): solo lo que pide atención. */
  cuenta?: number;
};

/**
 * Control segmentado de Apple: riel gris translúcido y el segmento elegido
 * levantado en blanco. Para cambiar de vista o de filtro dentro de una
 * pantalla (Tablero | Lista, Abiertas | Cerradas | Todas). La piel vive en la
 * clase `.segmentado` de globals.css, por si hace falta armarlo a mano.
 */
export function Segmentado<T extends string>({
  value,
  onChange,
  opciones,
  className,
  ancho = false,
}: {
  value: T;
  onChange: (value: T) => void;
  opciones: OpcionSegmentada<T>[];
  className?: string;
  /** Ocupa todo el ancho y reparte los segmentos parejo. */
  ancho?: boolean;
}) {
  return (
    <div role="group" className={cn('segmentado', ancho && 'flex w-full [&>button]:flex-1', className)}>
      {opciones.map(({ value: v, label, icon: Icon, cuenta }) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>
          {Icon && <Icon strokeWidth={1.8} />}
          {label}
          {!!cuenta && (
            <span className="tabular grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-[5px] text-[11px] font-semibold text-accent-fg">
              {cuenta}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
