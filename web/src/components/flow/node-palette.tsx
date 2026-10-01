'use client';

import type { NodeType } from '@/lib/types';
import { NODE_META, PALETTE_ORDER, type NodeMeta } from './node-config';

const GROUPS: NodeMeta['group'][] = ['Mensajes', 'Lógica', 'Contacto', 'Avanzado'];

export function NodePalette({ onAdd }: { onAdd: (type: NodeType) => void }) {
  return (
    <aside className="w-[212px] shrink-0 overflow-y-auto border-r border-hairline bg-card px-2.5 py-4">
      {GROUPS.map((group) => {
        const items = PALETTE_ORDER.filter((t) => NODE_META[t].group === group);
        if (items.length === 0) return null;

        return (
          <div key={group} className="mb-4">
            <p className="px-2.5 pb-1 text-[11px] font-semibold text-faint">{group}</p>

            <div className="space-y-0.5">
              {items.map((type) => {
                const meta = NODE_META[type];
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    onClick={() => onAdd(type)}
                    title={meta.description}
                    className="group flex h-8 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[13px] font-medium text-txt transition-colors hover:bg-fill-soft active:bg-fill"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent" strokeWidth={1.7} />
                    <span className="truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="mx-1 border-t border-hairline px-1.5 pt-3 text-[11.5px] leading-relaxed text-faint">
        Haz clic para añadir. Arrastra de un punto a otro para conectar.
      </p>
    </aside>
  );
}
