'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Píldoras, como los botones de Apple: el alto manda y las esquinas van redondas del todo.
const button = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-[background-color,color,box-shadow,opacity,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 select-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // El acento es el elemento de mayor contraste: un solo primario por pantalla.
        primary: 'bg-accent text-accent-fg hover:opacity-90',
        // Relleno gris translúcido: se ve igual sobre la página y dentro de una tarjeta.
        secondary: 'bg-fill text-txt hover:bg-fill-strong',
        ghost: 'text-muted hover:bg-fill-soft hover:text-txt',
        // La pieza blanca levantada de las maquetas («Fases», «Abrir diseño»).
        outline: 'bg-control text-txt shadow-control hover:brightness-[0.97] dark:hover:brightness-110',
        // Rojo teñido, no sólido: así no se confunde con el primario (la marca puede ser roja o naranja).
        danger: 'bg-neg/12 text-neg hover:bg-neg/20',
      },
      size: {
        sm: 'h-8 px-3.5 text-[13px]',
        md: 'h-9 px-4 text-[13.5px]',
        lg: 'h-11 px-6 text-[15px]',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & { loading?: boolean };

/** Las clases del botón, para un `<Link>` o `<a>` que tiene que verse igual. */
export const botonClases = button;

export function Button({ className, variant, size, loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(button({ variant, size }), loading && 'disabled:opacity-70', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
