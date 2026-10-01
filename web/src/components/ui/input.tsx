'use client';

import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * El campo de texto del sistema: blanco con filo en claro, relleno tenue en
 * oscuro, y al enfocarlo el filo toma el acento con un halo suave (el anillo
 * azul de macOS, pero con el acento).
 */
export const campoClases =
  'w-full rounded-[10px] border border-border bg-field px-3 text-[14px] text-txt placeholder:text-faint outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:ring-[3px] focus:ring-accent/15 disabled:opacity-50';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(campoClases, 'h-9', className)} {...props} />;
}

// `ComponentProps` incluye `ref` (React 19 lo pasa como prop normal).
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(campoClases, 'min-h-20 resize-y py-2 leading-[1.45]', className)} {...props} />;
}

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="text-[13px] font-medium text-muted">{children}</span>
      {hint && <span className="text-[12px] text-faint">{hint}</span>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label hint={hint}>{label}</Label>
      {children}
    </div>
  );
}
