'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Listas agrupadas de iOS — las mismas de Ajustes: encabezado en mayúsculas
 * chiquito, tarjeta blanca redondeada y separadores que no llegan al borde
 * izquierdo. Son las listas agrupadas de UIKit, pasadas a HTML.
 *
 * Regla: si dudas de cómo pintar algo en la app, es una `Seccion` con `Fila`s.
 * No inventes tarjetas nuevas.
 */

export function Seccion({
  titulo,
  pie,
  children,
  className,
  accion,
}: {
  titulo?: React.ReactNode;
  /** Texto gris debajo de la tarjeta, para explicar sin meter ruido dentro. */
  pie?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Un botón a la derecha del encabezado (iOS pone ahí «Ver todo», «Editar»). */
  accion?: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      {(titulo || accion) && (
        /* El encabezado se alinea con el TEXTO de las filas (16 del margen de
           la tarjeta + 16 de su relleno), no con el borde de la tarjeta. Así lo
           hace Ajustes de iOS. */
        <div className="flex items-end justify-between gap-3 px-8 pb-1.5">
          {titulo ? (
            <h2 className="text-[13px] font-normal uppercase tracking-[0.03em] text-muted">
              {titulo}
            </h2>
          ) : (
            <span />
          )}
          {accion}
        </div>
      )}
      {/* Lista agrupada con sangría (insetGrouped): la tarjeta nunca toca el borde. */}
      <div className={cn('mx-4 overflow-hidden rounded-card bg-surface', className)}>{children}</div>
      {pie && <p className="px-8 pt-2 text-[13px] leading-[1.35] text-muted">{pie}</p>}
    </section>
  );
}

type FilaBase = {
  /** Icono, avatar o emoji a la izquierda. */
  izquierda?: React.ReactNode;
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  /** Texto gris a la derecha, antes del chevron. */
  valor?: React.ReactNode;
  /** Lo que va pegado a la derecha en vez del chevron: un interruptor, una insignia. */
  derecha?: React.ReactNode;
  chevron?: boolean;
  peligro?: boolean;
  /** Última fila de la tarjeta: sin separador. */
  ultima?: boolean;
  className?: string;
};

/**
 * La sangría del separador. iOS lo arranca después del icono, no del borde:
 * con `izquierda` son 16 del margen + 29 del icono + 12 del hueco.
 */
function sangria(conIzquierda: boolean): string {
  return conIzquierda ? '57px' : '16px';
}

function Contenido({ izquierda, titulo, subtitulo, valor, derecha, chevron, peligro }: FilaBase) {
  return (
    <>
      {izquierda && <span className="flex w-[29px] shrink-0 justify-center">{izquierda}</span>}
      <span className="min-w-0 flex-1">
        {typeof titulo === 'string' ? (
          <span
            className={cn(
              'block truncate text-[17px] leading-[1.35]',
              peligro ? 'text-neg' : 'text-txt',
            )}
          >
            {titulo}
          </span>
        ) : (
          titulo
        )}
        {subtitulo &&
          (typeof subtitulo === 'string' ? (
            <span className="mt-0.5 block truncate text-[13px] leading-[1.35] text-muted">
              {subtitulo}
            </span>
          ) : (
            subtitulo
          ))}
      </span>
      {valor &&
        (typeof valor === 'string' ? (
          <span className="shrink-0 text-[17px] text-muted">{valor}</span>
        ) : (
          valor
        ))}
      {derecha}
      {chevron && <ChevronRight className="h-[17px] w-[17px] shrink-0 text-faint" strokeWidth={2.6} />}
    </>
  );
}

const CLASES_FILA =
  'relative flex w-full min-h-[44px] items-center gap-3 px-4 py-[11px] text-left';

/** Una fila que no lleva a ningún lado (un dato, un interruptor). */
export function Fila(props: FilaBase) {
  const { ultima, className, ...resto } = props;
  return (
    <div
      className={cn(CLASES_FILA, !ultima && 'sep-ios', className)}
      style={{ ['--sangria' as string]: sangria(Boolean(resto.izquierda)) }}
    >
      <Contenido {...resto} />
    </div>
  );
}

/** Una fila que abre otra pantalla. */
export function FilaEnlace({
  href,
  ...props
}: FilaBase & { href: string }) {
  const { ultima, className, chevron = true, ...resto } = props;
  return (
    <Link
      href={href}
      className={cn(CLASES_FILA, 'active:bg-surface-2', !ultima && 'sep-ios', className)}
      style={{ ['--sangria' as string]: sangria(Boolean(resto.izquierda)) }}
    >
      <Contenido {...resto} chevron={chevron} />
    </Link>
  );
}

/** Una fila que hace algo al tocarla. */
export function FilaBoton({
  onClick,
  disabled,
  ...props
}: FilaBase & { onClick: () => void; disabled?: boolean }) {
  const { ultima, className, ...resto } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        CLASES_FILA,
        'active:bg-surface-2 disabled:opacity-40',
        !ultima && 'sep-ios',
        className,
      )}
      style={{ ['--sangria' as string]: sangria(Boolean(resto.izquierda)) }}
    >
      <Contenido {...resto} />
    </button>
  );
}

/**
 * El cuadrito de color con un icono que iOS pone a la izquierda de cada fila
 * en Ajustes. `tono` es una clase de fondo (`bg-accent`, `bg-pos`…).
 *
 * El icono va en blanco salvo que `tono` traiga su propio color. Hace falta
 * para el cuadrito de tinta: `bg-txt` es negro en claro pero BLANCO en oscuro,
 * así que ahí el icono tiene que ser `text-bg` o desaparece.
 */
export function IconoFila({
  icon: Icon,
  tono = 'bg-accent',
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tono?: string;
}) {
  return (
    <span
      className={cn('grid h-[29px] w-[29px] place-items-center rounded-[7px] text-white', tono)}
    >
      <Icon className="h-[17px] w-[17px]" strokeWidth={2.1} />
    </span>
  );
}
