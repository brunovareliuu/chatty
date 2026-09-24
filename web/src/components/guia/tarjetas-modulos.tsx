'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ModuloId } from '@/lib/guia/pasos';
import { Anillo } from './checklist';
import { cuenta, useHechos, type Resumen } from './hechos';

export type TarjetaModulo = { id: ModuloId; titulo: string; que: string; href: string; pasos: Resumen[] };

/** Cada sección con su avance: se ve de un vistazo qué ya funciona. */
export function TarjetasModulos({ modulos }: { modulos: TarjetaModulo[] }) {
  const hechos = useHechos();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {modulos.map((m) => {
        const { listos, total } = cuenta(m.pasos, hechos);
        return (
          <Link
            key={m.id}
            href={m.href}
            className="group flex items-center gap-4 rounded-panel border border-border bg-surface p-4 transition-colors hover:border-accent/40"
          >
            <Anillo listos={listos} total={total} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">{m.titulo}</span>
              <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-muted">{m.que}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
          </Link>
        );
      })}
    </div>
  );
}
