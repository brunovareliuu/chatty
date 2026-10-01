'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import type { Conversation } from '@/lib/types';
import { Button } from '@/components/ui/button';

const ALTO_MAXIMO = 160;

export function Composer({
  accountId,
  conversation,
}: {
  accountId: string;
  conversation: Conversation;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // El textarea crece con lo escrito y vuelve a una línea al vaciarse (también
  // tras enviar, o al devolverle el texto si el envío falló).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, ALTO_MAXIMO)}px`;
  }, [text]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;

    setSending(true);
    // Vaciamos ya: el mensaje aparece solo en la lista vía Firestore.
    setText('');

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, conversationId: conversation.id, text: body }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(payload.error ?? 'No se pudo enviar el mensaje');
        setText(body); // se lo devolvemos para que no pierda lo escrito
      }
    } catch {
      toast.error('Sin conexión con el servidor');
      setText(body);
    } finally {
      setSending(false);
      ref.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    // Con teclado táctil, Enter hace salto de línea: se envía con el botón.
    if (window.matchMedia('(pointer: coarse)').matches) return;
    e.preventDefault();
    void send();
  }

  return (
    <div className="shrink-0 px-2 pt-2 pb-2 md:px-5 md:pt-3 md:pb-4">
      {/* La caja de Mensajes: una píldora con filo y el botón de enviar adentro, a la derecha. */}
      <div className="flex items-end gap-2 rounded-[21px] border border-border bg-field pr-1 pl-4 transition-[border-color,box-shadow] duration-150 focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/15 md:rounded-[19px]">
        {/* 16 px en celular: con menos, iOS hace zoom al enfocar el campo. */}
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Escribe un mensaje…"
          aria-label="Escribe un mensaje"
          className="max-h-40 min-w-0 flex-1 resize-none bg-transparent py-[9px] text-[16px] leading-[22px] outline-none placeholder:text-faint md:py-2 md:text-[14px] md:leading-5"
        />
        {/* Vacío, el botón se apaga a gris como en Mensajes (no al acento lavado). */}
        <Button
          variant="primary"
          size="icon"
          onClick={send}
          disabled={!text.trim()}
          loading={sending}
          aria-label="Enviar"
          className="mb-1 h-8 w-8 disabled:bg-fill-strong disabled:text-muted disabled:opacity-100 md:h-7 md:w-7"
        >
          {!sending && <ArrowUp className="h-4 w-4" strokeWidth={2.4} />}
        </Button>
      </div>
      <p className="mt-1.5 hidden pl-4 text-[11px] text-faint md:block">
        Enter para enviar · Shift + Enter para salto de línea
      </p>
    </div>
  );
}
