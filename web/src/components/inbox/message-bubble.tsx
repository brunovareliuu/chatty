'use client';

import { AlertCircle, Bot, Check, CheckCheck, Clock, User } from 'lucide-react';
import type { Message } from '@/lib/types';
import { cn, formatClock } from '@/lib/utils';

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'pending') return <Clock className="h-3 w-3" />;
  if (status === 'failed') return <AlertCircle className="h-3 w-3 text-neg" />;
  if (status === 'read') return <CheckCheck className="h-3 w-3" />;
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 opacity-60" />;
  return <Check className="h-3 w-3 opacity-60" />;
}

export function MessageBubble({ message }: { message: Message }) {
  const outgoing = message.direction === 'out';
  const failed = message.status === 'failed';

  return (
    <div className={cn('flex w-full', outgoing ? 'justify-end' : 'justify-start')}>
      <div className={cn('min-w-0 max-w-[85%] space-y-1 md:max-w-[min(68%,520px)]', outgoing && 'items-end')}>
        {message.replyTo?.storyUrl && (
          <div className="mb-1 flex items-center gap-2 rounded-xl bg-surface-2 p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.replyTo.storyUrl}
              alt="Historia"
              className="h-10 w-10 rounded-lg object-cover"
            />
            <span className="pr-2 text-[11px] font-medium text-muted">Respondió a tu historia</span>
          </div>
        )}

        <div
          className={cn(
            'rounded-[18px] px-3.5 py-2.5 text-[14px] leading-[1.45] break-words',
            outgoing
              ? failed
                ? 'bg-neg/10 text-txt ring-1 ring-neg/30'
                : 'bg-accent text-accent-fg'
              : 'bg-surface-2 text-txt',
          )}
        >
          {message.attachments.map((att, i) =>
            att.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={att.url}
                alt=""
                className="mb-1.5 max-h-72 max-w-full rounded-xl object-cover"
                loading="lazy"
              />
            ) : att.type === 'video' ? (
              <video key={i} src={att.url} controls className="mb-1.5 max-h-72 max-w-full rounded-xl" />
            ) : att.type === 'audio' ? (
              <audio key={i} src={att.url} controls className="mb-1.5 w-56 max-w-full" />
            ) : (
              <a
                key={i}
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="mb-1.5 block underline underline-offset-2"
              >
                Ver adjunto
              </a>
            ),
          )}

          {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}

          {!message.text && message.attachments.length === 0 && (
            <p className="italic opacity-60">
              {message.type === 'deleted' ? 'Mensaje eliminado' : 'Mensaje sin texto'}
            </p>
          )}
        </div>

        <div
          className={cn(
            'flex items-center gap-1.5 px-1 text-[11px] text-faint',
            outgoing ? 'justify-end' : 'justify-start',
          )}
        >
          {outgoing && message.sentBy === 'automation' && (
            <span className="flex items-center gap-1 text-accent">
              <Bot className="h-3 w-3" /> bot
            </span>
          )}
          {outgoing && message.sentBy === 'human' && <User className="h-3 w-3" />}
          <span className="tabular">{formatClock(message.timestamp)}</span>
          {outgoing && <StatusIcon status={message.status} />}
          {message.reaction && <span>{message.reaction.emoji}</span>}
        </div>

        {failed && message.error && (
          <p className={cn('px-1 text-[11px] text-neg', outgoing && 'text-right')}>{message.error}</p>
        )}
      </div>
    </div>
  );
}
