'use client';

import type { NodeType } from '@/lib/types';
import { NODE_META, PALETTE_ORDER, type NodeMeta } from './node-config';

const GROUPS: NodeMeta['group'][] = ['Mensajes', 'Lógica', 'Contacto', 'Avanzado'];

export function NodePalette({ onAdd }: { onAdd: (type: NodeType) => void }) {
  return (
    <aside className="w-[200px] shrink-0 overflow-y-auto border-r border-border bg-surface/40 px-2.5 py-3">
      {GROUPS.map((group) => {
        const items = PALETTE_ORDER.filter((t) => NODE_META[t].group === group);
        if (items.length === 0) return null;

        return (
          <div key={group} className="mb-4">
            <p className="px-2 pb-1.5 text-[10px] font-bold tracking-[0.6px] text-faint uppercase">
              {group}
            </p>

            <div className="space-y-0.5">
              {items.map((type) => {
                const meta = NODE_META[type];
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    onClick={() => onAdd(type)}
                    title={meta.description}
                    className="flex w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-left text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-txt"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
                    <span className="truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="px-2 pt-1 text-[11px] leading-relaxed text-faint">
        Haz clic para añadir. Arrastra de un punto a otro para conectar.
      </p>
    </aside>
  );
}
