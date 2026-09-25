'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { FlowNodeData, NodeType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { NODE_META, nodeSummary, outputHandles } from './node-config';

export type ChattyNodeData = FlowNodeData & Record<string, unknown>;
export type ChattyNode = Node<ChattyNodeData, NodeType>;

const handleClass =
  '!h-2.5 !w-2.5 !rounded-full !border-2 !border-bg !bg-muted transition-colors';

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
        'rounded-[15px] border bg-surface transition-shadow',
        selected
          ? 'border-accent shadow-lg shadow-accent/15'
          : 'border-border hover:border-muted/50',
        isTrigger && 'border-accent/50 bg-accent-soft',
      )}
    >
      {!isTrigger && (
        <Handle type="target" position={Position.Top} className={handleClass} id="in" />
      )}

      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Icon
          className={cn('h-3.5 w-3.5 shrink-0', isTrigger ? 'text-accent' : 'text-muted')}
          strokeWidth={2.1}
        />
        <span className="truncate text-[11px] font-bold tracking-[0.4px] text-muted uppercase">
          {meta.label}
        </span>
      </div>

      <div className="px-3 py-2.5">
        <p className="line-clamp-3 text-[13px] leading-[1.4] break-words">
          {nodeSummary(nodeType, data)}
        </p>
      </div>

      {outputs.length > 0 && (
        <div
          className={cn(
            'relative flex',
            outputs.length === 1 && !outputs[0].label ? 'h-0' : 'gap-1 px-2 pt-1 pb-2.5',
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
                    className="line-clamp-2 rounded-md bg-surface-2 px-1.5 py-1 text-center text-[10px] leading-tight font-semibold break-words text-muted"
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
