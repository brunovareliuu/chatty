'use client';

import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { campoClases } from './input';

/**
 * Select nativo con la piel del sistema. Para listas cortas de opciones el
 * nativo gana: teclado, móvil y accesibilidad gratis.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(campoClases, 'h-9 cursor-pointer appearance-none pr-8 font-medium')}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {/* Las dos flechitas de los menús emergentes de macOS. */}
      <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
    </div>
  );
}
