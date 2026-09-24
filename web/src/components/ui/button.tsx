'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const button = cva(
  'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40 select-none',
  {
    variants: {
      variant: {
        // El acento es el elemento de mayor contraste: un solo primario por pantalla.
        primary: 'bg-accent text-accent-fg hover:opacity-90',
        secondary: 'bg-surface-2 text-txt hover:bg-border',
        ghost: 'text-muted hover:bg-surface-2 hover:text-txt',
        outline: 'border border-border text-txt hover:bg-surface',
        danger: 'bg-neg text-white hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3 text-[13px] rounded-[10px]',
        md: 'h-10 px-4 text-[14px] rounded-xl',
        lg: 'h-12 px-6 text-[15px] rounded-[14px]',
        icon: 'h-9 w-9 rounded-[10px]',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & { loading?: boolean };

export function Button({ className, variant, size, loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(button({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
