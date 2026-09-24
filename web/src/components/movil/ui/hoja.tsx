'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * La hoja de iOS: sube desde abajo, deja ver el fondo por arriba y se cierra
 * tocando fuera o arrastrando el tirador. Aquí se usa para los formularios y
 * para elegir una opción de una lista, igual que en las apps de iOS.
 *
 * No es un `<dialog>` a propósito: necesitamos el fondo difuminado y la
 * animación de subida, y `<dialog>` en Safari de iOS todavía se pelea con el
 * teclado.
 */
export function Hoja({
  abierta,
  onCerrar,
  titulo,
  /** El botón de la izquierda; por omisión «Cancelar». */
  izquierda,
  /** El de la derecha: «Guardar», «Listo»… */
  derecha,
  /** Alta: para formularios largos. Por omisión se ajusta al contenido. */
  alta = false,
  children,
}: {
  abierta: boolean;
  onCerrar: () => void;
  titulo?: string;
  izquierda?: React.ReactNode;
  derecha?: React.ReactNode;
  alta?: boolean;
  children: React.ReactNode;
}) {
  // Con la hoja abierta, lo de atrás no se mueve.
  useEffect(() => {
    if (!abierta) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, [abierta]);

  useEffect(() => {
    if (!abierta) return;
    function alTeclear(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar();
    }
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierta, onCerrar]);

  if (!abierta) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={titulo}>
      <button
        className="absolute inset-0 bg-black/40"
        onClick={onCerrar}
        aria-label="Cerrar"
        tabIndex={-1}
      />
      <div
        className={cn(
          'anima-hoja absolute inset-x-0 bottom-0 flex flex-col rounded-t-[14px] bg-bg',
          alta ? 'top-[max(44px,env(safe-area-inset-top))]' : 'max-h-[88dvh]',
        )}
      >
        {/* El tirador gris de iOS. */}
        <div className="flex shrink-0 justify-center pt-2 pb-1">
          <div className="h-[5px] w-9 rounded-full bg-faint" />
        </div>

        {(titulo || izquierda || derecha) && (
          <div className="relative flex shrink-0 items-center gap-2 px-4 pb-2">
            <div className="flex min-w-0 flex-1 justify-start">
              {izquierda ?? (
                <button
                  type="button"
                  onClick={onCerrar}
                  className="h-9 text-[17px] text-accent active:opacity-50"
                >
                  Cancelar
                </button>
              )}
            </div>
            {titulo && (
              <p className="max-w-[50%] truncate text-center text-[17px] font-semibold">{titulo}</p>
            )}
            <div className="flex min-w-0 flex-1 justify-end">{derecha}</div>
          </div>
        )}

        <div className="scroll-ios min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-[max(20px,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * El menú de acciones que sale desde abajo cuando tocas «…» o compartes.
 * Una lista de opciones y, separado, Cancelar.
 */
export function HojaAcciones({
  abierta,
  onCerrar,
  titulo,
  mensaje,
  acciones,
}: {
  abierta: boolean;
  onCerrar: () => void;
  titulo?: string;
  mensaje?: string;
  acciones: { label: string; onClick: () => void; peligro?: boolean; disabled?: boolean }[];
}) {
  useEffect(() => {
    if (!abierta) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, [abierta]);

  if (!abierta) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/40" onClick={onCerrar} aria-label="Cerrar" />
      <div className="anima-hoja absolute inset-x-0 bottom-0 space-y-2 px-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        <div className="overflow-hidden rounded-[14px] bg-surface/95 backdrop-blur-xl">
          {(titulo || mensaje) && (
            <div className="sep-ios relative px-4 py-3 text-center" style={{ ['--sangria' as string]: '0px' }}>
              {titulo && <p className="text-[13px] font-semibold text-muted">{titulo}</p>}
              {mensaje && <p className="mt-0.5 text-[13px] leading-snug text-muted">{mensaje}</p>}
            </div>
          )}
          {acciones.map((a, i) => (
            <button
              key={a.label}
              type="button"
              disabled={a.disabled}
              onClick={() => {
                onCerrar();
                a.onClick();
              }}
              className={cn(
                'relative flex h-[57px] w-full items-center justify-center px-4 text-[20px] active:bg-surface-2 disabled:opacity-40',
                a.peligro ? 'text-neg' : 'text-accent',
                i < acciones.length - 1 && 'sep-ios',
              )}
              style={{ ['--sangria' as string]: '0px' }}
            >
              {a.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="h-[57px] w-full rounded-[14px] bg-surface text-[20px] font-semibold text-accent active:bg-surface-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
