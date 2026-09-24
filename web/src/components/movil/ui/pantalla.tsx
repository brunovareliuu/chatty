'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * El marco de cada pantalla de la app: barra de navegación arriba, título
 * grande que se encoge al bajar y el contenido con scroll propio.
 *
 * Así se comporta iOS: arriba del todo la barra es del color del fondo y el
 * título va grande (34 px); en cuanto ruedas, el título salta a la barra en
 * chiquito, aparece el vidrio esmerilado y la rayita de abajo.
 */

export function Pantalla({
  titulo,
  /** Debajo del título grande: una frase corta que dice para qué es la pantalla. */
  descripcion,
  /** A dónde vuelve el chevron. Sin esto, la pantalla es raíz de su pestaña. */
  atras,
  /** Botón de la derecha de la barra (iOS: «Listo», «+», «Editar»). */
  accion,
  /** Barra fija bajo la de navegación: un buscador, un segmentado, pestañas. */
  bajoBarra,
  /** Algo pegado abajo, encima de la barra de pestañas (un botón grande). */
  pie,
  /** Sin el respiro de los lados: para listas a sangre o herramientas. */
  sinMargen = false,
  children,
}: {
  titulo: string;
  descripcion?: string;
  atras?: { href?: string; etiqueta?: string };
  accion?: React.ReactNode;
  bajoBarra?: React.ReactNode;
  pie?: React.ReactNode;
  sinMargen?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [rodado, setRodado] = useState(false);
  // El umbral con histéresis evita que el título parpadee justo en el borde.
  const rodadoRef = useRef(false);

  function alRodar(e: React.UIEvent<HTMLDivElement>) {
    const y = e.currentTarget.scrollTop;
    const nuevo = rodadoRef.current ? y > 22 : y > 34;
    if (nuevo !== rodadoRef.current) {
      rodadoRef.current = nuevo;
      setRodado(nuevo);
    }
  }

  const chevron = atras && (
    <button
      type="button"
      onClick={() => (atras.href ? router.push(atras.href) : router.back())}
      className="-ml-2 flex h-11 items-center gap-0.5 pr-2 pl-1 text-accent active:opacity-50"
      aria-label={atras.etiqueta ? `Volver a ${atras.etiqueta}` : 'Volver'}
    >
      <ChevronLeft className="h-[22px] w-[22px]" strokeWidth={2.6} />
      {atras.etiqueta && (
        <span className="max-w-[9ch] truncate text-[17px] leading-none">{atras.etiqueta}</span>
      )}
    </button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header
        className={cn(
          'relative z-20 shrink-0 pt-[env(safe-area-inset-top)] transition-colors duration-200',
          rodado ? 'bg-surface/80 backdrop-blur-xl' : 'bg-bg',
        )}
      >
        <div className="flex h-11 items-center gap-1 px-4">
          <div className="flex min-w-0 flex-1 items-center">{chevron}</div>
          <h1
            className={cn(
              'pointer-events-none max-w-[60%] truncate text-center text-[17px] font-semibold transition-opacity duration-200',
              rodado ? 'opacity-100' : 'opacity-0',
            )}
          >
            {titulo}
          </h1>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{accion}</div>
        </div>
        {/* La rayita de iOS: solo cuando hay contenido pasando por debajo. Si hay
            barra de buscador, la rayita es suya y se pinta más abajo. */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 h-px origin-bottom scale-y-50 bg-border transition-opacity duration-200',
            rodado && !bajoBarra ? 'opacity-100' : 'opacity-0',
          )}
        />
      </header>

      <div onScroll={alRodar} className="scroll-ios min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 pt-1 pb-2">
          <h2 className="text-[34px] leading-[1.15] font-bold tracking-[-0.025em]">{titulo}</h2>
          {descripcion && (
            <p className="mt-1 text-[15px] leading-[1.35] text-muted">{descripcion}</p>
          )}
        </div>

        {/* El buscador va DEBAJO del título grande, como en iOS: sube con él al
            rodar y se queda pegado bajo la barra de navegación. */}
        {bajoBarra && (
          <div
            className={cn(
              'sticky top-0 z-10 px-4 pt-1 pb-2 transition-colors duration-200',
              rodado ? 'bg-surface/80 backdrop-blur-xl' : 'bg-bg',
            )}
          >
            {bajoBarra}
            <div
              className={cn(
                'absolute inset-x-0 bottom-0 h-px origin-bottom scale-y-50 bg-border transition-opacity duration-200',
                rodado ? 'opacity-100' : 'opacity-0',
              )}
            />
          </div>
        )}

        <div className={cn('pb-8', sinMargen ? '' : 'pt-2')}>{children}</div>
      </div>

      {pie && (
        <div className="shrink-0 border-t border-border bg-surface/90 px-4 py-3 backdrop-blur-xl">
          {pie}
        </div>
      )}
    </div>
  );
}

/**
 * Una pantalla sin título grande: la que abre a sangre completa, como un hilo
 * de mensajes o una herramienta. Solo barra de navegación y contenido.
 */
export function PantallaPlana({
  titulo,
  subtitulo,
  atras,
  accion,
  children,
}: {
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  atras?: { href?: string; etiqueta?: string };
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="relative z-20 shrink-0 bg-surface/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="flex h-11 items-center gap-2 px-2">
          {atras && (
            <button
              type="button"
              onClick={() => (atras.href ? router.push(atras.href) : router.back())}
              className="flex h-11 shrink-0 items-center gap-0.5 pr-1 pl-1 text-accent active:opacity-50"
              aria-label="Volver"
            >
              <ChevronLeft className="h-[22px] w-[22px]" strokeWidth={2.6} />
              {atras.etiqueta && (
                <span className="max-w-[7ch] truncate text-[17px] leading-none">{atras.etiqueta}</span>
              )}
            </button>
          )}
          <div className="min-w-0 flex-1 text-center">
            {typeof titulo === 'string' ? (
              <p className="truncate text-[17px] leading-tight font-semibold">{titulo}</p>
            ) : (
              titulo
            )}
            {subtitulo &&
              (typeof subtitulo === 'string' ? (
                <p className="truncate text-[12px] leading-tight text-muted">{subtitulo}</p>
              ) : (
                subtitulo
              ))}
          </div>
          <div className="flex shrink-0 items-center gap-1 pr-1">{accion}</div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px origin-bottom scale-y-50 bg-border" />
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

/** El botón de texto de la barra: azul en iOS, naranja aquí. */
export function AccionBarra({
  children,
  onClick,
  href,
  fuerte,
  disabled,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  /** El de confirmar va en seminegrita, como «Listo» de iOS. */
  fuerte?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  const clases = cn(
    'flex h-11 items-center gap-1.5 text-[17px] text-accent active:opacity-50 disabled:opacity-30',
    fuerte && 'font-semibold',
  );
  if (href) {
    return (
      <Link href={href} className={clases} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={clases} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
