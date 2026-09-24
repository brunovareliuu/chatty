'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

/** Entrada de palabras clave: Enter o coma confirman, Backspace borra la última. */
export function TagInput({
  values,
  onChange,
  placeholder = 'Escribe y presiona Enter',
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => !values.includes(p));
    if (parts.length) onChange([...values, ...parts]);
    setDraft('');
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-transparent bg-surface-2 px-2 py-1.5 transition-colors focus-within:border-accent focus-within:bg-surface">
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2 py-1 text-[13px] font-medium text-accent"
        >
          {v}
          <button
            type="button"
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="opacity-60 transition-opacity hover:opacity-100"
            aria-label={`Quitar ${v}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit(draft);
          } else if (e.key === 'Backspace' && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => draft && commit(draft)}
        placeholder={values.length === 0 ? placeholder : ''}
        className="min-w-[140px] flex-1 bg-transparent px-1 py-0.5 text-[14px] outline-none placeholder:text-faint"
      />
    </div>
  );
}
