'use client';

import { useId } from 'react';
import { BURBUJA, type Identidad } from '@/lib/identidad/tipos';
import { cn } from '@/lib/utils';
import { useIdentidad } from './proveedor';

/**
 * El logo del panel: un cuadro de esquinas redondeadas en el color de la marca
 * con tu logo (o la burbuja de Chatty) encima. Si el logo ya trae su fondo,
 * ocupa el cuadro completo. Es el mismo dibujo que los iconos del celular
 * (`app/iconos/[archivo]/route.tsx`).
 */
export function LogoMarca({
  tam = 28,
  identidad,
  className,
}: {
  tam?: number;
  /** Para pintar otra que no es la actual (la vista previa). */
  identidad?: Pick<Identidad, 'logo' | 'logoCompleto'>;
  className?: string;
}) {
  const actual = useIdentidad();
  const { logo, logoCompleto } = identidad ?? actual;

  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center overflow-hidden bg-accent text-accent-fg', className)}
      // La misma curva que los iconos de iOS: 22.37 % del lado.
      style={{ width: tam, height: tam, borderRadius: Math.round(tam * 0.2237) }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          draggable={false}
          className={logoCompleto ? 'h-full w-full object-cover' : 'h-[74%] w-[74%] object-contain'}
        />
      ) : (
        <Burbuja className="h-[72%] w-[72%]" />
      )}
    </span>
  );
}

/** La burbuja de Chatty en un solo color (`currentColor`), con los puntos huecos. */
export function Burbuja({ className }: { className?: string }) {
  const mascara = useId();
  const { caja, cuerpo: c, cola, puntos } = BURBUJA;
  return (
    <svg viewBox={caja} className={className} aria-hidden>
      <defs>
        <mask id={mascara} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="white" />
          {puntos.map((p) => (
            <circle key={p.cx} cx={p.cx} cy={p.cy} r={p.r} fill="black" />
          ))}
        </mask>
      </defs>
      <g fill="currentColor" mask={`url(#${mascara})`}>
        <rect x={c.x} y={c.y} width={c.ancho} height={c.alto} rx={c.radio} />
        <path d={cola} />
      </g>
    </svg>
  );
}
