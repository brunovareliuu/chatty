'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ListChecks, X } from 'lucide-react';
import type { ModuloId } from '@/lib/guia/pasos';
import { cuenta, useHechos, type Resumen } from './hechos';

/**
 * Ya conectado, una sección a la que le faltan pasos lo dice arriba, en una
 * línea, con el enlace a su lista. Se puede cerrar; vuelve a salir si mañana
 * sigue faltando algo.
 */

const CLAVE = (m: ModuloId) => `chatty:guia:aviso:${m}`;
const EVENTO = 'chatty:guia-aviso';
const UN_DIA = 24 * 60 * 60 * 1000;

function suscribe(avisa: () => void) {
  window.addEventListener(EVENTO, avisa);
  return () => window.removeEventListener(EVENTO, avisa);
}

function cerradoHace(modulo: ModuloId): number | null {
  try {
    const v = Number(localStorage.getItem(CLAVE(modulo)));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function AvisoPasos({ modulo, titulo, pasos }: { modulo: ModuloId; titulo: string; pasos: Resumen[] }) {
  const hechos = useHechos();
  const cerrado = useSyncExternalStore(
    suscribe,
    () => {
      const en = cerradoHace(modulo);
      return en !== null && Date.now() - en < UN_DIA;
    },
    () => true,
  );
  const { listos, total } = cuenta(pasos, hechos);
  if (cerrado || listos === total) return null;

  const faltan = total - listos;
  function cerrar() {
    try {
      localStorage.setItem(CLAVE(modulo), String(Date.now()));
    } catch {
      // Sin almacenamiento, se cierra hasta recargar.
    }
    window.dispatchEvent(new Event(EVENTO));
  }

  return (
    <div className="px-pagina flex shrink-0 items-center gap-3 border-b border-hairline bg-card py-2.5 text-[13px]">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-accent-soft text-accent">
        <ListChecks className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <p className="min-w-0 flex-1 text-muted">
        A {titulo} {faltan === 1 ? 'le falta 1 paso' : `le faltan ${faltan} pasos`} para funcionar completo.{' '}
        <Link href={`/primeros-pasos/${modulo}`} className="font-semibold text-accent-ink hover:underline">
          Ver los pasos
        </Link>
      </p>
      <button
        type="button"
        onClick={cerrar}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-fill-soft hover:text-txt"
        aria-label="Cerrar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
