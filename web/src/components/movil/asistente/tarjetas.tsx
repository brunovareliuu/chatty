'use client';

import Link from 'next/link';
import { Sparkles, Zap } from 'lucide-react';
import type { AssistantCard } from '@/lib/asistente/eventos';
import { cn } from '@/lib/utils';

/**
 * Lo que el asistente creó, en tamaño de celular.
 *
 * Las tarjetas del panel grande (`components/asistente/tarjetas.tsx`) llevan
 * tablas de etiqueta y valor a dos columnas y sus botones apuntan a las rutas
 * de escritorio (`/flows/…`, `/automations`): desde la app
 * te sacarían del celular a una herramienta de ratón. Aquí se enseña lo mismo
 * resumido y con las rutas de `/m`, que es la app donde estás.
 */


export function TarjetaAsistente({ card }: { card: AssistantCard; live?: boolean }) {
  return <TarjetaAutomatizacion card={card} />;
}

const CAJA = 'overflow-hidden rounded-card bg-surface';
const BOTON =
  'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-accent px-3 text-[15px] font-semibold text-accent-fg active:opacity-70';

function Cabecera({
  icon: Icon,
  titulo,
  detalle,
  insignia,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  titulo: string;
  detalle: string;
  insignia?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-3.5 pt-3.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent-soft">
        <Icon className="h-[18px] w-[18px] text-accent" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[16px] font-semibold">{titulo}</p>
          {insignia}
        </div>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">{detalle}</p>
      </div>
    </div>
  );
}

function TarjetaAutomatizacion({ card }: { card: Extract<AssistantCard, { kind: 'automation' }> }) {
  return (
    <div className={CAJA}>
      <Cabecera
        icon={Zap}
        titulo={card.name}
        detalle={`${card.created ? 'Nueva' : 'Actualizada'} · ${card.trigger}`}
        insignia={
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold',
              card.enabled ? 'bg-pos/15 text-pos' : 'bg-surface-2 text-muted',
            )}
          >
            {card.enabled ? 'Activa' : 'Pausada'}
          </span>
        }
      />

      <div className="space-y-2 px-3.5 pt-3">
        {card.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.keywords.map((k) => (
              <span
                key={k}
                className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[13px] font-medium text-accent"
              >
                {k}
              </span>
            ))}
          </div>
        )}
        <ul className="space-y-0.5 text-[13px] text-muted">
          {card.trigger === 'Comentario en publicación' && (
            <li>
              {card.posts === 0
                ? 'En todas tus publicaciones'
                : `En ${card.posts} ${card.posts === 1 ? 'publicación' : 'publicaciones'}`}
            </li>
          )}
          {card.publicReplies > 0 && (
            <li>
              {card.publicReplies === 1
                ? 'Contesta el comentario en público'
                : `${card.publicReplies} respuestas públicas, sale una al azar`}
            </li>
          )}
          {card.followGate && <li>Pide que te siga antes del mensaje</li>}
          {card.link && <li className="truncate text-accent">{card.link}</li>}
        </ul>
      </div>

      <div className="flex gap-2 p-3.5">
        <Link href={`/m/automatizaciones/${card.id}`} className={BOTON}>
          Ver la automatización
        </Link>
      </div>
    </div>
  );
}



/** El avatar del asistente, para el turno de Claude. */
export function Chispa() {
  return (
    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft">
      <Sparkles className="h-3.5 w-3.5 text-accent" />
    </span>
  );
}
