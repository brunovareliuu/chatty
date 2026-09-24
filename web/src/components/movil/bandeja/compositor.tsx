'use client';

import { useLayoutEffect, useRef } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ALTO_MAXIMO = 120;

/**
 * El compositor de iOS: la cápsula gris que crece con lo escrito y el botón
 * redondo de enviar a su derecha. Lo comparten el hilo de la bandeja y el
 * asistente, porque los dos son un chat.
 *
 * Con teclado táctil, Enter hace salto de línea y se manda con el botón — es
 * lo que espera quien escribe desde el celular. Con teclado de verdad
 * (escritorio, iPad con Magic Keyboard) Enter envía, como en el panel grande.
 */
export function Compositor({
  valor,
  onChange,
  onEnviar,
  enviando = false,
  deshabilitado = false,
  placeholder = 'Escribe un mensaje…',
  /** Un botón extra a la izquierda (el historial del asistente). */
  izquierda,
  /** Lo que se dibuja mientras trabaja: el botón de detener del asistente. */
  detener,
  /** Una línea chiquita bajo la cápsula. */
  pie,
}: {
  valor: string;
  onChange: (v: string) => void;
  onEnviar: () => void;
  enviando?: boolean;
  deshabilitado?: boolean;
  placeholder?: string;
  izquierda?: React.ReactNode;
  detener?: React.ReactNode;
  pie?: React.ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Crece con lo escrito y vuelve a una línea al vaciarse (también tras enviar).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, ALTO_MAXIMO)}px`;
  }, [valor]);

  function alTeclear(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    // En pantalla táctil Enter es salto de línea: se envía con el botón.
    if (window.matchMedia('(pointer: coarse)').matches) return;
    e.preventDefault();
    onEnviar();
  }

  const vacio = !valor.trim();

  return (
    <div className="shrink-0 border-t border-border bg-surface px-2 pt-2 pb-2">
      <div className="flex items-end gap-2">
        {izquierda}
        <div className="flex min-w-0 flex-1 items-end rounded-[20px] bg-surface-2 px-3 py-1.5">
          {/* 16 px o más: con menos, Safari hace zoom al enfocar el campo. */}
          <textarea
            ref={ref}
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={alTeclear}
            rows={1}
            disabled={deshabilitado}
            placeholder={placeholder}
            className="min-h-[28px] w-full resize-none bg-transparent py-1 text-[16px] leading-[1.35] text-txt outline-none placeholder:text-muted disabled:opacity-50"
            style={{ maxHeight: ALTO_MAXIMO }}
          />
        </div>
        {detener ?? (
          <button
            type="button"
            onClick={onEnviar}
            disabled={vacio || enviando || deshabilitado}
            aria-label="Enviar"
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center rounded-full transition-opacity',
              vacio || enviando || deshabilitado
                ? 'bg-surface-2 text-faint'
                : 'bg-accent text-accent-fg active:opacity-70',
            )}
          >
            {enviando ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowUp className="h-5 w-5" strokeWidth={2.6} />
            )}
          </button>
        )}
      </div>
      {pie && <div className="px-1 pt-1.5 text-center text-[11px] text-faint">{pie}</div>}
    </div>
  );
}
