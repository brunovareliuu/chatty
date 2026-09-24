'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, History, Loader2, MessageSquarePlus, Sparkles, Square, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/lib/client/accounts-context';
import type { AssistantEvent, ChatSummary, ViewBlock, ViewMessage } from '@/lib/asistente/eventos';
import { cn, relativeTime } from '@/lib/utils';
import { Dialog } from '@/components/ui/dialog';
import { Empty } from '@/components/ui/empty';
import { PageHeader } from '@/components/shell/page-header';
import { AssistantCardView, ToolRow } from './tarjetas';
import { RichText } from './texto';

const SUGGESTIONS = [
  'Cuando comenten GUÍA en mi último post, mándales el link de mi guía por DM, pero solo si me siguen',
  'Si alguien escribe PRECIO por DM, mándale mis precios y pregúntale su correo',
  'Escríbeme 4 respuestas públicas distintas para cuando alguien comente INFO',
  '¿Qué automatizaciones tengo activas?',
];

export function AsistenteScreen() {
  const { account, loading } = useAccounts();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (!account) {
    return (
      <Empty
        icon={Sparkles}
        title="Conecta una cuenta primero"
        description="El asistente trabaja sobre una cuenta de Instagram conectada: sus publicaciones y sus automatizaciones."
      />
    );
  }

  // La clave reinicia la conversación al cambiar de cuenta.
  return <Conversation key={account.id} accountId={account.id} username={account.username} />;
}

function Conversation({ accountId, username }: { accountId: string; username: string }) {
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ViewMessage[]>([]);
  const [opening, setOpening] = useState(false);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // En celular no hay columna de chats: se abren en un diálogo desde el compositor.
  const [listaAbierta, setListaAbierta] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const openRequest = useRef(0);

  const query = `accountId=${encodeURIComponent(accountId)}`;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/asistente/chats?${query}`)
      .then((res) => (res.ok ? res.json() : { chats: [] }))
      .then((data: { chats?: ChatSummary[] }) => {
        if (!cancelled) setChats(data.chats ?? []);
      })
      .catch(() => {
        if (!cancelled) setChats([]);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function updateTurn(turnId: string, change: (blocks: ViewBlock[]) => ViewBlock[]) {
    setMessages((prev) =>
      prev.map((m) => (m.id === turnId && m.role === 'assistant' ? { ...m, blocks: change(m.blocks) } : m)),
    );
  }

  function applyEvent(event: AssistantEvent, turnId: string) {
    switch (event.type) {
      case 'chat':
        setChatId(event.chatId);
        setChats((prev) => [
          { id: event.chatId, title: event.title, updatedAt: Date.now() },
          ...(prev ?? []).filter((c) => c.id !== event.chatId),
        ]);
        return;
      case 'text':
        updateTurn(turnId, (blocks) => {
          const last = blocks[blocks.length - 1];
          return last?.type === 'text'
            ? [...blocks.slice(0, -1), { type: 'text', text: last.text + event.text }]
            : [...blocks, { type: 'text', text: event.text }];
        });
        return;
      case 'tool':
        updateTurn(turnId, (blocks) => {
          const block: ViewBlock = { type: 'tool', id: event.id, name: event.name, status: event.status, detail: event.detail };
          const index = blocks.findIndex((b) => b.type === 'tool' && b.id === event.id);
          return index >= 0 ? blocks.map((b, i) => (i === index ? block : b)) : [...blocks, block];
        });
        return;
      case 'card':
        updateTurn(turnId, (blocks) => [...blocks, { type: 'card', card: event.card, live: true }]);
        return;
      case 'error':
        setError(event.message);
        return;
      default:
        return;
    }
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || streaming) return;

    const turnId = crypto.randomUUID();
    setDraft('');
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: `${turnId}-user`, role: 'user', text },
      { id: turnId, role: 'assistant', blocks: [] },
    ]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, chatId, message: text }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'No se pudo hablar con el asistente');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline = buffer.indexOf('\n');
        while (newline >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) applyEvent(JSON.parse(line) as AssistantEvent, turnId);
          newline = buffer.indexOf('\n');
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Se perdió la conexión con el asistente');
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
      // Un turno que no alcanzó a decir nada no se queda como burbuja vacía.
      setMessages((prev) => prev.filter((m) => !(m.id === turnId && m.role === 'assistant' && m.blocks.length === 0)));
      fetch(`/api/asistente/chats?${query}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { chats?: ChatSummary[] } | null) => {
          if (data?.chats) setChats(data.chats);
        })
        .catch(() => {});
    }
  }

  async function openChat(id: string) {
    if (streaming || id === chatId) return;
    const request = ++openRequest.current;
    setChatId(id);
    setMessages([]);
    setError(null);
    setOpening(true);
    try {
      const res = await fetch(`/api/asistente/chats/${encodeURIComponent(id)}?${query}`);
      const data = (await res.json()) as { messages?: ViewMessage[]; error?: string };
      if (request !== openRequest.current) return;
      if (!res.ok) throw new Error(data.error ?? 'No se pudo abrir la conversación');
      setMessages(data.messages ?? []);
    } catch (err) {
      if (request === openRequest.current) {
        toast.error(err instanceof Error ? err.message : 'No se pudo abrir la conversación');
      }
    } finally {
      if (request === openRequest.current) setOpening(false);
    }
  }

  function newChat() {
    if (streaming) return;
    openRequest.current += 1;
    setChatId(null);
    setMessages([]);
    setError(null);
    setOpening(false);
    inputRef.current?.focus();
  }

  async function removeChat(id: string) {
    if (!window.confirm('¿Borrar esta conversación? Lo que ya creó el asistente se queda.')) return;
    const res = await fetch(`/api/asistente/chats/${encodeURIComponent(id)}?${query}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('No se pudo borrar la conversación');
      return;
    }
    setChats((prev) => (prev ?? []).filter((c) => c.id !== id));
    if (id === chatId) newChat();
  }

  const empty = messages.length === 0 && !opening;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Asistente"
        description={`Claude trabaja sobre @${username}: automatizaciones, posts y pantallas de App Store.`}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border md:flex">
          <div className="p-3">
            <button
              type="button"
              onClick={newChat}
              disabled={streaming}
              className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2 text-[13.5px] font-medium transition-colors hover:bg-surface-2 disabled:opacity-40"
            >
              <MessageSquarePlus className="h-4 w-4 text-muted" />
              Nueva conversación
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
            <ListaChats chats={chats} chatId={chatId} onOpen={openChat} onRemove={removeChat} />
          </div>
        </aside>

        {listaAbierta && (
          <Dialog
            open
            onOpenChange={(o) => !o && setListaAbierta(false)}
            title="Conversaciones"
            description="Lo que ya le pediste al asistente."
          >
            <button
              type="button"
              onClick={() => {
                setListaAbierta(false);
                newChat();
              }}
              disabled={streaming}
              className="mb-3 flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-[14px] font-medium transition-colors hover:bg-surface-2 disabled:opacity-40"
            >
              <MessageSquarePlus className="h-4 w-4 text-muted" />
              Nueva conversación
            </button>
            <div className="space-y-0.5">
              <ListaChats
                chats={chats}
                chatId={chatId}
                onOpen={(id) => {
                  setListaAbierta(false);
                  void openChat(id);
                }}
                onRemove={removeChat}
              />
            </div>
          </Dialog>
        )}

        <section className="flex min-w-0 flex-1 flex-col">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
            {opening && (
              <div className="flex h-full items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
              </div>
            )}

            {empty && (
              <div className="mx-auto flex w-full max-w-[640px] flex-col items-center px-4 pt-10 pb-8 text-center md:px-6 md:pt-14">
                <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-accent-soft">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <h2 className="mt-4 text-[22px] font-bold tracking-[-0.3px]">¿Qué armamos hoy?</h2>
                <p className="mt-1.5 max-w-md text-[14px] leading-snug text-muted">
                  Pídelo como se lo pedirías a alguien del equipo. Lo que crea queda en Automatizaciones.
                </p>
                <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setDraft(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="rounded-card border border-border bg-surface px-3.5 py-3 text-left text-[13.5px] leading-snug transition-colors hover:border-accent/50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!opening && messages.length > 0 && (
              <div className="mx-auto w-full max-w-[780px] space-y-6 px-4 py-5 md:space-y-7 md:px-6 md:py-6">
                {messages.map((message, i) =>
                  message.role === 'user' ? (
                    <div key={message.id} className="flex justify-end">
                      <p className="max-w-[85%] whitespace-pre-wrap [overflow-wrap:anywhere] rounded-[18px] rounded-br-md bg-surface-2 px-4 py-2.5 text-[14.5px] leading-relaxed">
                        {message.text}
                      </p>
                    </div>
                  ) : (
                    <AssistantTurn
                      key={message.id}
                      blocks={message.blocks}
                      working={streaming && i === messages.length - 1}
                    />
                  ),
                )}
                {error && (
                  <p className="rounded-xl bg-neg/10 px-3 py-2 text-[13px] leading-snug text-neg">{error}</p>
                )}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
            className="border-t border-border px-3 pt-2.5 pb-3 md:px-6 md:pt-3 md:pb-4"
          >
            <div className="mx-auto w-full max-w-[780px]">
              <div className="flex items-end gap-2 rounded-[18px] border border-border bg-surface py-1.5 pr-1.5 pl-1.5 transition-colors focus-within:border-accent md:pl-4">
                <button
                  type="button"
                  onClick={() => setListaAbierta(true)}
                  aria-label="Conversaciones anteriores"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-txt md:hidden"
                >
                  <History className="h-4 w-4" />
                </button>
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      void send(draft);
                    }
                  }}
                  rows={1}
                  placeholder="Pídeme una automatización, un post o tus pantallas de App Store…"
                  className="field-sizing-content max-h-44 min-h-[38px] min-w-0 flex-1 resize-none bg-transparent py-2 text-[16px] leading-snug outline-none placeholder:text-faint md:text-[14.5px]"
                />
                {streaming ? (
                  <button
                    type="button"
                    onClick={() => abortRef.current?.abort()}
                    aria-label="Detener la respuesta"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-txt transition-colors hover:bg-border"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    aria-label="Enviar"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
                  </button>
                )}
              </div>
              <p className="mt-2 hidden text-center text-[11px] text-faint md:block">
                Lo que crea es real: una automatización activa contesta en tu Instagram en cuanto se crea.
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function AssistantTurn({ blocks, working }: { blocks: ViewBlock[]; working: boolean }) {
  const last = blocks[blocks.length - 1];
  const thinking =
    working && last?.type !== 'text' && !blocks.some((b) => b.type === 'tool' && b.status === 'working');

  return (
    <div className="flex gap-2.5 md:gap-3">
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
      </div>
      <div className="min-w-0 flex-1 space-y-3 pt-0.5">
        {blocks.map((block, i) => {
          if (block.type === 'text') return <RichText key={i} text={block.text} />;
          if (block.type === 'tool') return <ToolRow key={i} block={block} />;
          return <AssistantCardView key={i} card={block.card} />;
        })}
        {thinking && (
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Pensando…
          </p>
        )}
      </div>
    </div>
  );
}

/** Las conversaciones guardadas: la columna de escritorio y el diálogo del celular pintan lo mismo. */
function ListaChats({
  chats,
  chatId,
  onOpen,
  onRemove,
}: {
  chats: ChatSummary[] | null;
  chatId: string | null;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <>
      {chats === null &&
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mx-1 h-11 animate-pulse rounded-xl bg-surface-2/60" />
        ))}
      {chats?.length === 0 && (
        <p className="px-3 py-1 text-[12.5px] leading-snug text-faint">Aquí aparecen tus conversaciones.</p>
      )}
      {chats?.map((chat) => (
        <div
          key={chat.id}
          className={cn(
            'group flex items-center rounded-xl transition-colors',
            chat.id === chatId ? 'bg-surface-2' : 'hover:bg-surface-2/60',
          )}
        >
          <button type="button" onClick={() => onOpen(chat.id)} className="min-w-0 flex-1 px-3 py-2 text-left">
            <p className="truncate text-[13.5px] font-medium">{chat.title}</p>
            <p className="text-[11px] text-faint">{relativeTime(chat.updatedAt)}</p>
          </button>
          {/* En celular no hay hover: el botón de borrar se ve siempre. */}
          <button
            type="button"
            onClick={() => onRemove(chat.id)}
            aria-label={`Borrar «${chat.title}»`}
            className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-opacity hover:text-neg md:h-7 md:w-7 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </>
  );
}
