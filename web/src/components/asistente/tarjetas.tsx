'use client';

import Link from 'next/link';
import { AlertCircle, Check, Loader2, Zap } from 'lucide-react';
import { TOOL_LABELS, type AssistantCard, type ViewBlock } from '@/lib/asistente/eventos';
import { botonClases } from '@/components/ui/button';
import { Badge, Punto } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const secondaryLink = botonClases({ variant: 'secondary', size: 'sm' });

/** Cada tarjeta es blanca con su filo y su sombra, como una vista previa de enlace en Mensajes. */
const tarjeta = 'tarjeta rounded-card';

/** «● Activa», «● Pausada»: el punto dice el estado y el texto gris lo nombra. */
function Estado({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-muted">
      <Punto tone={on ? 'pos' : 'neutral'} />
      {children}
    </span>
  );
}

/** Una herramienta que el asistente está usando o ya usó. */
export function ToolRow({ block }: { block: Extract<ViewBlock, { type: 'tool' }> }) {
  const label = TOOL_LABELS[block.name] ?? { working: block.name, done: block.name };
  return (
    <div className="inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-full bg-fill-soft pr-3 pl-2 text-[12.5px] text-muted">
      {block.status === 'working' && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
      {block.status === 'done' && <Check className="h-3.5 w-3.5 shrink-0 text-pos" strokeWidth={2.4} />}
      {block.status === 'error' && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-neg" />}
      <span className="shrink-0 font-medium">
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
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-muted sm:w-[128px]">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}

function AutomationCard({ card }: { card: Extract<AssistantCard, { kind: 'automation' }> }) {
  return (
    <div className={cn(tarjeta, 'p-4')}>
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent-soft">
          <Zap className="h-4 w-4 text-accent" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <p className="truncate text-[15px] font-semibold tracking-[-0.012em]">{card.name}</p>
            <Estado on={card.enabled}>{card.enabled ? 'Activa' : 'Pausada'}</Estado>
          </div>
          <p className="mt-0.5 text-[13px] text-muted">
            {card.created ? 'Nueva' : 'Actualizada'} · {card.trigger}
          </p>
        </div>
      </div>

      {/* Los datos en celdas agrupadas, como una ficha de Ajustes. */}
      <dl className="mt-3.5 divide-y divide-hairline rounded-[12px] bg-surface px-3.5 text-[13px] empty:hidden">
        {card.keywords.length > 0 && (
          <Row label="Palabras clave">
            <span className="flex flex-wrap gap-1">
              {card.keywords.map((k) => (
                <Badge key={k} tone="accent">
                  {k}
                </Badge>
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

      <div className="mt-3.5 flex flex-wrap gap-2">
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

