'use client';

import { AlertCircle, Bot, Check, CheckCheck, Clock } from 'lucide-react';
import type { Message } from '@/lib/types';
import { cn, formatClock } from '@/lib/utils';

/**
 * Una burbuja de Mensajes: las tuyas a la derecha en naranja, las de ella a la
 * izquierda en gris, nunca más anchas que el 78 % de la pantalla. Debajo, la
 * hora y — solo en las tuyas — si ya se entregó y quién la mandó.
 */
export function Burbuja({ mensaje }: { mensaje: Message }) {
  const mia = mensaje.direction === 'out';
  const fallo = mensaje.status === 'failed';

  return (
    <div className={cn('flex w-full', mia ? 'justify-end' : 'justify-start')}>
      <div className="min-w-0 max-w-[78%]">
        {mensaje.replyTo?.storyUrl && (
          <div
            className={cn(
              'mb-1 flex items-center gap-2 rounded-[14px] bg-surface-2 p-1.5',
              mia && 'flex-row-reverse',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mensaje.replyTo.storyUrl}
              alt="Historia"
              className="h-10 w-10 rounded-[8px] object-cover"
            />
            <span className="px-1 text-[12px] font-medium text-muted">Respondió a tu historia</span>
          </div>
        )}

        <div
          className={cn(
            'rounded-[20px] px-3.5 py-2 text-[16px] leading-[1.35] break-words',
            mia
              ? fallo
                ? 'bg-neg/10 text-txt ring-1 ring-neg/30'
                : 'bg-accent text-accent-fg'
              : 'bg-surface-2 text-txt',
          )}
        >
          {mensaje.attachments.map((a, i) =>
            a.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={a.url}
                alt=""
                className="mb-1.5 max-h-72 max-w-full rounded-[14px] object-cover"
                loading="lazy"
              />
            ) : a.type === 'video' ? (
              <video key={i} src={a.url} controls className="mb-1.5 max-h-72 max-w-full rounded-[14px]" />
            ) : a.type === 'audio' ? (
              <audio key={i} src={a.url} controls className="mb-1.5 w-52 max-w-full" />
            ) : (
              <a
                key={i}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="mb-1.5 block underline underline-offset-2"
              >
                Ver adjunto
              </a>
            ),
          )}

          {mensaje.text && <p className="whitespace-pre-wrap">{mensaje.text}</p>}

          {!mensaje.text && mensaje.attachments.length === 0 && (
            <p className="italic opacity-60">
              {mensaje.type === 'deleted' ? 'Mensaje eliminado' : 'Mensaje sin texto'}
            </p>
          )}
        </div>

        <div
          className={cn(
            'flex items-center gap-1 px-1.5 pt-0.5 text-[11px] text-faint',
            mia ? 'justify-end' : 'justify-start',
          )}
        >
          {mia && mensaje.sentBy === 'automation' && (
            <span className="flex items-center gap-0.5 text-accent">
              <Bot className="h-3 w-3" /> bot
            </span>
          )}
          <span className="tabular-nums">{formatClock(mensaje.timestamp)}</span>
          {mia && <Estado estado={mensaje.status} />}
          {mensaje.reaction && <span>{mensaje.reaction.emoji}</span>}
        </div>

        {fallo && mensaje.error && (
          <p className={cn('px-1.5 text-[11px] text-neg', mia && 'text-right')}>{mensaje.error}</p>
        )}
      </div>
    </div>
  );
}

function Estado({ estado }: { estado: Message['status'] }) {
  if (estado === 'pending') return <Clock className="h-3 w-3" />;
  if (estado === 'failed') return <AlertCircle className="h-3 w-3 text-neg" />;
  if (estado === 'read') return <CheckCheck className="h-3 w-3" />;
  if (estado === 'delivered') return <CheckCheck className="h-3 w-3 opacity-60" />;
  return <Check className="h-3 w-3 opacity-60" />;
}

/** El día en el hilo: «Hoy», «Ayer» o la fecha, como el separador de Mensajes. */
export function SeparadorDia({ ts }: { ts: number }) {
  return (
    <div className="flex justify-center py-1.5">
      <span className="text-[12px] font-medium text-muted">{etiquetaDia(ts)}</span>
    </div>
  );
}

export function mismoDia(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
  );
}

function etiquetaDia(ts: number): string {
  const hoy = Date.now();
  if (mismoDia(ts, hoy)) return 'Hoy';
  if (mismoDia(ts, hoy - 86_400_000)) return 'Ayer';
  const d = new Date(ts);
  const mismoAno = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: mismoAno ? undefined : 'numeric',
  });
}
