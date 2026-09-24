'use client';

import { useEffect, useRef } from 'react';
import { AtSign, Bot, ChevronLeft, Clock3, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { Conversation } from '@/lib/types';
import { useMessages } from '@/lib/client/firestore-hooks';
import { cn, windowRemaining } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { MessageBubble } from './message-bubble';
import { Composer } from './composer';

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
  const bottomRef = useRef<HTMLDivElement>(null);

  // Al abrir la conversación dejamos de contarla como no leída.
  useEffect(() => {
    if (conversation.unreadCount === 0) return;
    void fetch(`/api/conversations/${conversation.id}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    });
  }, [accountId, conversation.id, conversation.unreadCount]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  async function toggleAutomation(enabled: boolean) {
    const res = await fetch(`/api/conversations/${conversation.id}/automation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, paused: !enabled }),
    });
    if (!res.ok) toast.error('No se pudo cambiar la automatización');
    else toast.success(enabled ? 'Automatización activada' : 'Automatización pausada');
  }

  const remaining = windowRemaining(conversation.windowExpiresAt);
  const ventanaCorta = remaining !== null && remaining.hours < 2;
  const handle = conversation.contactUsername;
  const muestraHandle = Boolean(handle && conversation.contactName);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-border px-2 py-2 md:gap-3 md:px-4 md:py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted transition-colors active:bg-surface-2 md:hidden"
            aria-label="Volver a la lista"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
          </button>
        )}

        <Avatar
          src={conversation.contactPic}
          name={conversation.contactName ?? handle}
          size={38}
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">
            {conversation.contactName ?? (handle ? `@${handle}` : 'Sin nombre')}
          </p>
          <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
            {muestraHandle && (
              <a
                href={`https://instagram.com/${handle}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-w-0 items-center gap-0.5 hover:text-accent"
              >
                <AtSign className="h-3 w-3 shrink-0" />
                <span className="truncate">{handle}</span>
              </a>
            )}
            {/* En celular la ventana de 24 h va aquí, bajo el nombre, para que la cabecera no se desborde. */}
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 md:hidden',
                remaining ? (ventanaCorta ? 'text-warn' : 'text-muted') : 'text-neg',
              )}
            >
              {muestraHandle && <span aria-hidden>·</span>}
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
          <Badge tone={ventanaCorta ? 'warn' : 'neutral'} className="hidden md:inline-flex">
            <Clock3 className="h-3 w-3" />
            {remaining.hours}h {remaining.minutes}m
          </Badge>
        ) : (
          <Badge tone="neg" className="hidden md:inline-flex">
            <TriangleAlert className="h-3 w-3" />
            Ventana cerrada
          </Badge>
        )}

        <div className="flex shrink-0 items-center gap-2 rounded-full bg-surface-2 py-1 pr-1 pl-2.5">
          <Bot
            className={conversation.automationPaused ? 'h-3.5 w-3.5 text-faint' : 'h-3.5 w-3.5 text-accent'}
          />
          <Switch
            checked={!conversation.automationPaused}
            onCheckedChange={toggleAutomation}
          />
        </div>
      </header>

      {!remaining && (
        <div className="border-b border-border bg-warn/8 px-3 py-2 text-[12px] leading-snug text-muted md:px-4">
          Pasaron más de 24 horas desde su último mensaje. Instagram solo permite responder con
          la etiqueta de agente humano — lo haremos automáticamente, pero puede fallar si ya
          pasaron 7 días.
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-3 py-4 md:px-4">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`h-12 animate-pulse rounded-[18px] bg-surface-2/60 ${
                  i % 2 ? 'ml-auto w-1/2' : 'w-2/3'
                }`}
              />
            ))}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <p className="py-10 text-center text-[13px] text-faint">
            Todavía no hay mensajes en esta conversación.
          </p>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        <div ref={bottomRef} />
      </div>

      <Composer accountId={accountId} conversation={conversation} />
    </div>
  );
}
