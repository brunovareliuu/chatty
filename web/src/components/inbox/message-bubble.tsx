'use client';

import { AlertCircle, Bot, Check, CheckCheck, Clock, Link2, User } from 'lucide-react';
import type { Attachment, Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { hora } from './fechas';

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'pending') return <Clock className="h-3 w-3" />;
  if (status === 'failed') return <AlertCircle className="h-3 w-3 text-neg" />;
  if (status === 'read') return <CheckCheck className="h-3 w-3" />;
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 opacity-60" />;
  return <Check className="h-3 w-3 opacity-60" />;
}

/** Fotos, videos y audios van sueltos, sin burbuja; lo demás es una tarjeta de enlace. */
function esMedio(att: Attachment): boolean {
  return att.type === 'image' || att.type === 'video' || att.type === 'audio';
}

function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function MessageBubble({
  message,
  ultima = true,
}: {
  message: Message;
  /** Último mensaje de su grupo: solo ese lleva la hora debajo (los fallidos, siempre). */
  ultima?: boolean;
}) {
  const outgoing = message.direction === 'out';
  const failed = message.status === 'failed';
  const medios = message.attachments.filter(esMedio);
  const enlaces = message.attachments.filter((att) => !esMedio(att));
  const vacio = !message.text && message.attachments.length === 0;
  const muestraMeta = ultima || failed || Boolean(message.reaction);

  return (
    <div className={cn('flex w-full min-w-0 flex-col', outgoing ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'flex max-w-[85%] min-w-0 flex-col gap-1 md:max-w-[min(62%,520px)]',
          outgoing ? 'items-end' : 'items-start',
        )}
        title={hora(message.timestamp)}
      >
        {message.replyTo?.storyUrl && (
          <div className="flex items-center gap-2 rounded-[14px] bg-fill-soft p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={message.replyTo.storyUrl} alt="Historia" className="h-10 w-10 rounded-[9px] object-cover" />
            <span className="pr-2 text-[11.5px] font-medium text-muted">Respondió a tu historia</span>
          </div>
        )}

        {medios.map((att, i) =>
          att.type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={att.url}
              alt=""
              className="max-h-72 max-w-full rounded-[18px] object-cover"
              loading="lazy"
            />
          ) : att.type === 'video' ? (
            <video key={i} src={att.url} controls className="max-h-72 max-w-full rounded-[18px]" />
          ) : (
            <audio key={i} src={att.url} controls className="w-56 max-w-full" />
          ),
        )}

        {(message.text || vacio) && (
          <div
            className={cn(
              'rounded-[19px] px-3.5 pt-[9px] pb-2.5 text-[14px] leading-[1.42] tracking-[-0.008em] break-words',
              outgoing
                ? failed
                  ? 'bg-neg/10 text-txt ring-1 ring-neg/30'
                  : 'bg-accent text-accent-fg'
                : 'bg-surface-2 text-txt',
            )}
          >
            {message.text ? (
              <p className="whitespace-pre-wrap">{message.text}</p>
            ) : (
              <p className="italic opacity-60">
                {message.type === 'deleted' ? 'Mensaje eliminado' : 'Mensaje sin texto'}
              </p>
            )}
          </div>
        )}

        {enlaces.map((att, i) => (
          <a
            key={i}
            href={att.url}
            target="_blank"
            rel="noreferrer"
            className="flex w-[300px] max-w-full items-center gap-3 rounded-2xl bg-card py-2.5 pr-3.5 pl-2.5 ring-1 ring-border transition-colors hover:bg-fill-soft"
          >
            <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[10px] bg-fill-soft text-muted">
              <Link2 className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold">Ver adjunto</span>
              <span className="block truncate text-[12px] text-faint">{dominio(att.url)}</span>
            </span>
          </a>
        ))}
      </div>

      {muestraMeta && (
        <div
          className={cn(
            'tabular mt-1 flex items-center gap-[5px] px-1.5 text-[11px] text-faint',
            outgoing ? 'justify-end' : 'justify-start',
          )}
        >
          {outgoing && message.sentBy === 'automation' && (
            <span className="flex items-center gap-[3px] font-medium text-accent-ink">
              <Bot className="h-3 w-3" strokeWidth={2} /> bot
            </span>
          )}
          {outgoing && message.sentBy === 'human' && <User className="h-3 w-3" strokeWidth={2} />}
          <span>{hora(message.timestamp)}</span>
          {outgoing && <StatusIcon status={message.status} />}
          {message.reaction && <span>{message.reaction.emoji}</span>}
        </div>
      )}

      {failed && message.error && (
        <p className={cn('mt-0.5 px-1.5 text-[11px] text-neg', outgoing && 'text-right')}>{message.error}</p>
      )}
    </div>
  );
}
