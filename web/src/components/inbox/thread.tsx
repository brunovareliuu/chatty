'use client';

import { Fragment, useEffect, useMemo, useRef } from 'react';
import { Bot, ChevronLeft, Clock3, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { Conversation, Message } from '@/lib/types';
import { useMessages } from '@/lib/client/firestore-hooks';
import { cn, windowRemaining } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { MessageBubble } from './message-bubble';
import { Composer } from './composer';
import { etiquetaDeDia, hora, mismoDia } from './fechas';

/** Mensajes seguidos del mismo lado con menos de esto entre uno y otro van juntos. */
const PAUSA_GRUPO_MS = 5 * 60_000;
/** Lo que te escriben solo lleva la hora si nadie contestó en este rato (la respuesta ya la dice). */
const PAUSA_RESPUESTA_MS = 30 * 60_000;

export function Thread({
  accountId,
  conversation,
  onBack,
}: {
  accountId: string;
  conversation: Conversation;
  /** En celular, regresa a la lista. En escritorio el botón no se pinta. */
  onBack?: () => void;
}) {
  const { data: messages, loading } = useMessages(accountId, conversation.id);

  // Al abrir la conversación dejamos de contarla como no leída.
  useEffect(() => {
    if (conversation.unreadCount === 0) return;
    void fetch(`/api/conversations/${conversation.id}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    });
  }, [accountId, conversation.id, conversation.unreadCount]);

  async function toggleAutomation(enabled: boolean) {
    const res = await fetch(`/api/conversations/${conversation.id}/automation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, paused: !enabled }),
    });
    if (!res.ok) toast.error('No se pudo cambiar la automatización');
    else toast.success(enabled ? 'Automatización activada' : 'Automatización pausada');
  }

  return (
    <VistaHilo
      accountId={accountId}
      conversation={conversation}
      messages={messages}
      loading={loading}
      onToggleAutomation={toggleAutomation}
      onBack={onBack}
    />
  );
}

/** Un mensaje con lo que hace falta para pintarlo en su grupo. */
type Fila = { message: Message; dia: string | null; primera: boolean; ultima: boolean };

/**
 * Agrupa como Mensajes: un separador cada vez que cambia el día, y los
 * mensajes seguidos del mismo lado (y del mismo remitente, bot o tú) van
 * pegados. La hora va bajo el último del grupo: siempre en lo que mandas (dice
 * quién lo mandó y si ya lo vieron) y en lo que te escriben solo si se quedó
 * sin respuesta un rato. Pasando el cursor por una burbuja sale su hora.
 */
function agrupar(messages: Message[]): Fila[] {
  const mismoGrupo = (a?: Message, b?: Message): boolean => {
    if (!a || !b) return false;
    return (
      a.direction === b.direction &&
      (a.direction === 'in' || a.sentBy === b.sentBy) &&
      Math.abs(b.timestamp - a.timestamp) < PAUSA_GRUPO_MS &&
      mismoDia(a.timestamp, b.timestamp)
    );
  };

  return messages.map((m, i) => {
    const antes = messages[i - 1];
    const despues = messages[i + 1];
    const nuevoDia = !antes || !mismoDia(antes.timestamp, m.timestamp);
    const cierraGrupo = !mismoGrupo(m, despues);
    const sinRespuestaPronto =
      !despues || despues.timestamp - m.timestamp >= PAUSA_RESPUESTA_MS || !mismoDia(m.timestamp, despues.timestamp);
    return {
      message: m,
      dia: nuevoDia ? etiquetaDeDia(m.timestamp) : null,
      primera: !mismoGrupo(antes, m),
      ultima: cierraGrupo && (m.direction === 'out' || sinRespuestaPronto),
    };
  });
}

/**
 * El hilo sin datos propios: cabecera, mensajes y caja de texto. Lo usan
 * `Thread` (con Firestore en vivo) y cualquier vista con mensajes de ejemplo.
 */
export function VistaHilo({
  accountId,
  conversation,
  messages,
  loading,
  onToggleAutomation,
  onBack,
}: {
  accountId: string;
  conversation: Conversation;
  messages: Message[];
  loading: boolean;
  onToggleAutomation: (enabled: boolean) => void;
  onBack?: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const filas = useMemo(() => agrupar(messages), [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const remaining = windowRemaining(conversation.windowExpiresAt);
  const ventanaCorta = remaining !== null && remaining.hours < 2;
  const handle = conversation.contactUsername;
  const muestraHandle = Boolean(handle && conversation.contactName);
  const botActivo = !conversation.automationPaused;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-[60px] shrink-0 items-center gap-2 border-b border-hairline px-2 md:h-16 md:gap-3 md:px-5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="grid h-11 w-9 shrink-0 place-items-center rounded-full text-accent transition-colors active:bg-fill-soft md:hidden"
            aria-label="Volver a la lista"
          >
            <ChevronLeft className="h-7 w-7" strokeWidth={2.2} />
          </button>
        )}

        <Avatar src={conversation.contactPic} name={conversation.contactName ?? handle} size={38} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] leading-tight font-semibold tracking-[-0.014em]">
            {conversation.contactName ?? (handle ? `@${handle}` : 'Sin nombre')}
          </p>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-faint">
            {muestraHandle && (
              <a
                href={`https://instagram.com/${handle}`}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 truncate transition-colors hover:text-accent-ink"
              >
                @{handle}
              </a>
            )}
            {/* En celular la ventana de 24 h va aquí, bajo el nombre, para que la cabecera no se desborde. */}
            <span
              className={cn(
                'tabular inline-flex shrink-0 items-center gap-1 md:hidden',
                remaining ? (ventanaCorta ? 'text-warn' : 'text-faint') : 'text-neg',
              )}
            >
              {muestraHandle && (
                <span aria-hidden className="text-faint">
                  ·
                </span>
              )}
              {remaining ? (
                <>
                  <Clock3 className="h-3 w-3" />
                  {remaining.hours}h {remaining.minutes}m
                </>
              ) : (
                <>
                  <TriangleAlert className="h-3 w-3" />
                  Ventana cerrada
                </>
              )}
            </span>
          </div>
        </div>

        {remaining ? (
          <Badge tone={ventanaCorta ? 'warn' : 'neutral'} className="tabular hidden md:inline-flex">
            <Clock3 className="h-3 w-3" strokeWidth={2} />
            {remaining.hours}h {remaining.minutes}m
          </Badge>
        ) : (
          <Badge tone="neg" className="hidden md:inline-flex">
            <TriangleAlert className="h-3 w-3" strokeWidth={2} />
            Ventana cerrada
          </Badge>
        )}

        <div className="flex h-8 shrink-0 items-center gap-2 rounded-full bg-fill-soft pr-1 pl-2.5 md:pl-3">
          <Bot className={cn('h-3.5 w-3.5', botActivo ? 'text-accent' : 'text-faint')} strokeWidth={1.9} />
          <span className="hidden text-[12.5px] font-medium md:inline">Bot</span>
          <Switch checked={botActivo} onCheckedChange={onToggleAutomation} />
        </div>
      </header>

      {!remaining && (
        <div className="flex shrink-0 items-start gap-2 border-b border-hairline bg-surface px-4 py-2.5 text-[12.5px] leading-snug text-muted md:px-5">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0 text-neg" strokeWidth={2} />
          <p>
            Pasaron más de 24 horas desde su último mensaje. Instagram solo permite responder con la
            etiqueta de agente humano — lo haremos automáticamente, pero puede fallar si ya pasaron 7
            días.
          </p>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-4 pb-2 md:px-7">
        {/* Pocos mensajes se asientan abajo, junto a la caja de texto, como en Mensajes. */}
        <div className="flex min-h-full flex-col justify-end">
          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-11 animate-pulse rounded-[19px] bg-fill-soft',
                    i % 2 ? 'ml-auto w-1/2' : 'w-2/3',
                  )}
                />
              ))}
            </div>
          )}

          {!loading && messages.length === 0 && (
            <p className="py-10 text-center text-[13px] text-faint">
              Todavía no hay mensajes en esta conversación.
            </p>
          )}

          {filas.map(({ message, dia, primera, ultima }, i) => (
            <Fragment key={message.id}>
              {dia && (
                <p
                  className={cn(
                    'tabular self-center pb-2.5 text-[11.5px] font-medium text-faint',
                    i > 0 ? 'pt-5' : 'pt-0.5',
                  )}
                >
                  <span className="font-semibold text-muted">{dia}</span> {hora(message.timestamp)}
                </p>
              )}
              <div className={cn(!dia && (primera ? 'mt-2.5' : 'mt-1'))}>
                <MessageBubble message={message} ultima={ultima} />
              </div>
            </Fragment>
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      <Composer accountId={accountId} conversation={conversation} />
    </div>
  );
}
