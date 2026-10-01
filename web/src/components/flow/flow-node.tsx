'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { FlowNodeData, NodeType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { NODE_META, nodeSummary, outputHandles } from './node-config';

export type ChattyNodeData = FlowNodeData & Record<string, unknown>;
export type ChattyNode = Node<ChattyNodeData, NodeType>;

// El aro es del color de la tarjeta: el punto parece salir de su orilla.
const handleClass =
  '!h-2.5 !w-2.5 !rounded-full !border-2 !border-card !bg-faint transition-colors hover:!bg-accent';

function FlowNodeCard({ id, type, data, selected }: NodeProps<ChattyNode>) {
  const nodeType = (type ?? 'send_text') as NodeType;
  const meta = NODE_META[nodeType];
  const Icon = meta.icon;
  const outputs = outputHandles(nodeType, data);
  const isTrigger = nodeType === 'trigger';

  return (
    <div
      // Con muchas salidas (respuestas rápidas) la tarjeta crece: cada opción se lee y su punto se distingue.
      style={{ width: Math.max(240, outputs.length * 78) }}
      className={cn(
        // Una tarjeta blanca sobre la página gris; elegida, el filo del acento con su halo (como un campo enfocado).
        'relative rounded-[16px] border bg-card shadow-card transition-[border-color,box-shadow]',
        selected ? 'border-accent ring-[3px] ring-accent/15' : 'border-hairline hover:border-border',
      )}
    >
      {!isTrigger && (
        <Handle type="target" position={Position.Top} className={handleClass} id="in" />
      )}

      <div className="flex items-center gap-2 px-3 pt-2.5">
        {/* El disparador es el único en el color sólido de la marca: por ahí entra todo. */}
        <span
          className={cn(
            'grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px]',
            isTrigger ? 'bg-accent text-accent-fg' : 'bg-fill-soft text-muted',
          )}
        >
          <Icon className="h-3 w-3" strokeWidth={2.2} />
        </span>
        <span className="truncate text-[12px] font-semibold text-muted">{meta.label}</span>
      </div>

      <div className="px-3 pt-1.5 pb-3">
        <p className="line-clamp-3 text-[13px] leading-[1.4] break-words text-txt">
          {nodeSummary(nodeType, data)}
        </p>
      </div>

      {outputs.length > 0 && (
        <div
          className={cn(
            'relative flex',
            outputs.length === 1 && !outputs[0].label ? 'h-0' : '-mt-0.5 gap-1 px-2.5 pb-2.5',
          )}
        >
          {outputs.map((out, i) => {
            const single = outputs.length === 1 && !out.label;
            const left = single ? '50%' : `${((i + 0.5) / outputs.length) * 100}%`;

            return (
              <div key={out.id} className="min-w-0 flex-1">
                {!single && (
                  <div
                    title={out.label}
                    className="line-clamp-2 rounded-[8px] bg-surface px-1.5 py-[3px] text-center text-[10.5px] leading-tight font-semibold break-words text-muted"
                  >
                    {out.label}
                  </div>
                )}
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id={out.id}
                  className={handleClass}
                  style={{ left, transform: 'translateX(-50%)' }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Sin salidas: el flujo termina aquí. */}
      {outputs.length === 0 && <div className="h-1.5" />}

      <span className="sr-only">{id}</span>
    </div>
  );
}

export const FlowNodeCardMemo = memo(FlowNodeCard);
