'use client';

import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const base =
  'w-full bg-surface-2 border border-transparent rounded-xl px-3 text-[14px] text-txt placeholder:text-faint transition-colors focus:border-accent focus:bg-surface outline-none disabled:opacity-50';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(base, 'h-10', className)} {...props} />;
}

// `ComponentProps` incluye `ref` (React 19 lo pasa como prop normal).
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(base, 'py-2.5 leading-[1.45] resize-y min-h-20', className)} {...props} />;
}

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="text-[12px] font-semibold tracking-[0.4px] text-muted uppercase">{children}</span>
      {hint && <span className="text-[11px] text-faint">{hint}</span>}
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
