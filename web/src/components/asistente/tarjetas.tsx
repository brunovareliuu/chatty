'use client';

import Link from 'next/link';
import { AlertCircle, Check, Loader2, Zap } from 'lucide-react';
import { TOOL_LABELS, type AssistantCard, type ViewBlock } from '@/lib/asistente/eventos';
import { cn } from '@/lib/utils';

const secondaryLink =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-[10px] border border-border px-3 text-[13px] font-semibold text-txt transition-colors hover:bg-surface-2';

/** Una herramienta que el asistente está usando o ya usó. */
export function ToolRow({ block }: { block: Extract<ViewBlock, { type: 'tool' }> }) {
  const label = TOOL_LABELS[block.name] ?? { working: block.name, done: block.name };
  return (
    <div className="flex min-w-0 items-center gap-2 text-[13px] text-muted">
      {block.status === 'working' && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
      {block.status === 'done' && <Check className="h-3.5 w-3.5 shrink-0 text-pos" />}
      {block.status === 'error' && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-neg" />}
      <span className="shrink-0">
        {block.status === 'working' ? `${label.working}…` : block.status === 'done' ? label.done : `Falló: ${label.working.toLowerCase()}`}
      </span>
      {block.detail && <span className="truncate text-faint">· {block.detail}</span>}
    </div>
  );
}

export function AssistantCardView({ card }: { card: AssistantCard; live?: boolean }) {
  return <AutomationCard card={card} />;
}

// ---------------------------------------------------------------------------

/** Etiqueta y valor: en columna cuando la tarjeta es angosta, en fila cuando cabe. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-muted sm:w-[128px]">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}

function AutomationCard({ card }: { card: Extract<AssistantCard, { kind: 'automation' }> }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-accent-soft">
          <Zap className="h-4 w-4 text-accent" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-semibold">{card.name}</p>
            <span
              className={cn(
                'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                card.enabled ? 'bg-pos/15 text-pos' : 'bg-surface-2 text-muted',
              )}
            >
              {card.enabled ? 'Activa' : 'Pausada'}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-muted">
            {card.created ? 'Nueva' : 'Actualizada'} · {card.trigger}
          </p>
        </div>
      </div>

      <dl className="mt-3 space-y-2 text-[13px] sm:space-y-1.5">
        {card.keywords.length > 0 && (
          <Row label="Palabras clave">
            <span className="flex flex-wrap gap-1">
              {card.keywords.map((k) => (
                <span key={k} className="rounded-md bg-accent-soft px-1.5 py-0.5 font-medium text-accent">
                  {k}
                </span>
              ))}
            </span>
          </Row>
        )}
        {card.trigger === 'Comentario en publicación' && (
          <Row label="Publicaciones">{card.posts === 0 ? 'Todas' : `${card.posts} elegida${card.posts === 1 ? '' : 's'}`}</Row>
        )}
        {card.publicReplies > 0 && (
          <Row label="Respuesta pública">
            {card.publicReplies === 1 ? '1 respuesta' : `${card.publicReplies} variantes, sale una al azar`}
          </Row>
        )}
        {card.followGate && <Row label="Antes del mensaje">Pide que te siga</Row>}
        {card.link && (
          <Row label="Enlace">
            <a href={card.link} target="_blank" rel="noreferrer" className="block truncate text-accent hover:underline">
              {card.link}
            </a>
          </Row>
        )}
      </dl>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Link href={`/flows/${card.flowId}`} className={secondaryLink}>
          Editar flujo
        </Link>
        <Link href="/automations" className={secondaryLink}>
          Ver automatizaciones
        </Link>
      </div>
    </div>
  );
}

