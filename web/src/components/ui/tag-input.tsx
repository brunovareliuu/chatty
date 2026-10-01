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
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-[10px] border border-border bg-field px-1.5 py-1 transition-[border-color,box-shadow] duration-150 focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/15">
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex h-6 items-center gap-1 rounded-full bg-accent-soft pr-1.5 pl-2.5 text-[13px] font-medium text-accent-ink"
        >
          {v}
          <button
            type="button"
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="grid h-4 w-4 place-items-center rounded-full opacity-60 transition-opacity hover:bg-accent/15 hover:opacity-100"
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
