'use client';

import { useMemo, useState } from 'react';
import { Search, Bot } from 'lucide-react';
import type { Conversation } from '@/lib/types';
import { cn, relativeTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

const FILTERS = [
  { value: 'open', label: 'Abiertas' },
  { value: 'closed', label: 'Cerradas' },
  { value: 'all', label: 'Todas' },
] as const;

export function ConversationList({
  conversations,
  loading,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
}: {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: 'open' | 'closed' | 'all';
  onFilterChange: (f: 'open' | 'closed' | 'all') => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter(
      (c) =>
        c.contactUsername?.toLowerCase().includes(term) ||
        c.contactName?.toLowerCase().includes(term) ||
        c.lastMessagePreview.toLowerCase().includes(term),
    );
  }, [conversations, search]);

  return (
    // En celular la lista es la pantalla entera; en escritorio, la columna fija de la izquierda.
    <div className="flex min-h-0 w-full shrink-0 flex-col border-border md:w-[340px] md:border-r">
      <div className="space-y-3 border-b border-border px-4 pt-4 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint" />
          {/* 16 px en celular: con menos, iOS hace zoom al enfocar el campo. */}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversación"
            className="h-10 pl-9 text-[16px] md:h-9 md:text-[14px]"
          />
        </div>

        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors md:px-2.5 md:py-1',
                filter === f.value
                  ? 'bg-accent text-accent-fg'
                  : 'text-muted hover:bg-surface-2 hover:text-txt',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading && (
          <div className="space-y-1 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[62px] animate-pulse rounded-xl bg-surface-2/60" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-[13px] text-faint">
            {search ? 'Nada coincide con tu búsqueda.' : 'Aún no hay mensajes.'}
          </p>
        )}

        {filtered.map((c) => {
          const active = c.id === selectedId;
          return (
            <button
              key={c.id}
              data-conversacion={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                'flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors active:bg-surface-2',
                active
                  ? 'border-l-accent bg-surface-2'
                  : 'border-l-transparent hover:bg-surface-2/50',
              )}
            >
              <Avatar src={c.contactPic} name={c.contactName ?? c.contactUsername} size={38} />

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[14px] font-semibold leading-tight">
                    {c.contactName ?? (c.contactUsername ? `@${c.contactUsername}` : 'Sin nombre')}
                  </p>
                  <span className="shrink-0 text-[11px] text-faint tabular">
                    {relativeTime(c.lastMessageAt)}
                  </span>
                </div>

                <div className="mt-0.5 flex items-center gap-1.5">
                  {c.lastMessageDirection === 'out' && (
                    <span className="shrink-0 text-[12px] text-faint">Tú:</span>
                  )}
                  <p
                    className={cn(
                      'min-w-0 flex-1 truncate text-[13px]',
                      c.unreadCount > 0 ? 'font-medium text-txt' : 'text-muted',
                    )}
                  >
                    {c.lastMessagePreview}
                  </p>

                  {!c.automationPaused && (
                    <Bot className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />
                  )}
                  {c.unreadCount > 0 && (
                    <span className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-fg tabular">
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
