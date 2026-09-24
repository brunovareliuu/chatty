'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { SendHorizonal } from 'lucide-react';
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
    <div className="shrink-0 border-t border-border p-2 md:p-3">
      <div className="flex items-end gap-2 rounded-[18px] bg-surface-2 p-1.5 focus-within:ring-1 focus-within:ring-accent md:p-2">
        {/* 16 px en celular: con menos, iOS hace zoom al enfocar el campo. */}
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Escribe un mensaje…"
          className="max-h-40 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-[16px] leading-[1.45] outline-none placeholder:text-faint md:px-1.5 md:py-1.5 md:text-[14px]"
        />
        <Button
          variant="primary"
          size="icon"
          onClick={send}
          disabled={!text.trim()}
          loading={sending}
          aria-label="Enviar"
          className="h-11 w-11 shrink-0 rounded-[14px] md:h-9 md:w-9 md:rounded-[10px]"
        >
          {!sending && <SendHorizonal className="h-4 w-4" />}
        </Button>
      </div>
      <p className="mt-1.5 hidden px-1 text-[11px] text-faint md:block">
        Enter para enviar · Shift + Enter para salto de línea
      </p>
    </div>
  );
}
