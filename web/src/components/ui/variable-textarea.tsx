'use client';

import { useRef, useState, type ComponentProps } from 'react';
import { Braces, ChevronDown } from 'lucide-react';
import { Textarea } from './input';
import { cn } from '@/lib/utils';

export type VariableOption = {
  key: string;
  label: string;
  hint?: string;
};

/** Variables que existen en cualquier flujo; ver `engine/interpolate.ts`. */
export const BASE_VARIABLES: VariableOption[] = [
  { key: 'first_name', label: 'Nombre', hint: 'solo el primer nombre' },
  { key: 'full_name', label: 'Nombre completo' },
  { key: 'username', label: 'Usuario de Instagram', hint: 'sin la @' },
  { key: 'last_message', label: 'Último mensaje', hint: 'lo que escribió por DM' },
  { key: 'comment_text', label: 'Texto del comentario', hint: 'si arrancó por un comentario' },
];

/**
 * Textarea con un menú para insertar {{variables}} donde esté el cursor, para
 * no tener que aprenderse los nombres. Las variables se sustituyen al enviar.
 */
export function VariableTextarea({
  value,
  onChange,
  variables = BASE_VARIABLES,
  className,
  ...props
}: Omit<ComponentProps<'textarea'>, 'value' | 'onChange' | 'ref'> & {
  value: string;
  onChange: (value: string) => void;
  variables?: VariableOption[];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);

  function insert(key: string) {
    const el = ref.current;
    const token = `{{${key}}}`;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    // Un espacio antes si el cursor viene pegado a una palabra.
    const before = value.slice(0, start);
    const needsSpace = before.length > 0 && !/\s$/.test(before);
    const inserted = (needsSpace ? ' ' : '') + token;
    onChange(before + inserted + value.slice(end));
    setOpen(false);

    // Devolvemos el foco con el cursor justo después de la variable.
    const cursor = start + inserted.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="space-y-1.5">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        {...props}
      />

      <div className="relative flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'flex h-7 items-center gap-1 rounded-lg px-2 text-[12px] font-medium transition-colors',
            open ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-txt',
          )}
        >
          <Braces className="h-3.5 w-3.5" />
          Insertar variable
          <ChevronDown className="h-3 w-3" />
        </button>

        {open && (
          <>
            {/* Capa invisible: un clic fuera cierra el menú. */}
            <button
              type="button"
              aria-label="Cerrar"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setOpen(false)}
            />
            <ul
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
              onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
            >
              {variables.map((v) => (
                <li key={v.key}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => insert(v.key)}
                    className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-surface-2"
                  >
                    <span className="text-[13px] font-medium text-txt">{v.label}</span>
                    <span className="text-[11px] text-faint">
                      <code>{`{{${v.key}}}`}</code>
                      {v.hint && ` · ${v.hint}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
