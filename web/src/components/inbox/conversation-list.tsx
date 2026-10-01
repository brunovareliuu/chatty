'use client';

import { useMemo, useState } from 'react';
import { Search, Bot } from 'lucide-react';
import type { Conversation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Segmentado, type OpcionSegmentada } from '@/components/ui/segmented';
import { horaDeLista } from './fechas';

export type FiltroBandeja = 'open' | 'closed' | 'all';

const FILTERS: OpcionSegmentada<FiltroBandeja>[] = [
  { value: 'open', label: 'Abiertas' },
  { value: 'closed', label: 'Cerradas' },
  { value: 'all', label: 'Todas' },
];

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
  filter: FiltroBandeja;
  onFilterChange: (f: FiltroBandeja) => void;
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
    // En celular la lista es la tarjeta entera; en escritorio, la columna fija de la izquierda.
    <div className="flex min-h-0 w-full shrink-0 flex-col md:w-[340px] md:border-r md:border-hairline">
      <div className="shrink-0 space-y-2.5 px-3.5 pt-3.5 pb-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-[11px] h-[15px] w-[15px] -translate-y-1/2 text-faint" />
          {/* 16 px en celular: con menos, iOS hace zoom al enfocar el campo. */}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversación"
            aria-label="Buscar conversación"
            className="h-10 border-transparent bg-fill-soft pl-[33px] text-[16px] md:h-[34px] md:text-[13.5px]"
          />
        </div>

        <Segmentado
          ancho
          value={filter}
          onChange={onFilterChange}
          opciones={FILTERS}
          className="[&>button]:h-[26px] [&>button]:px-0 [&>button]:text-[12.5px]"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pt-0.5 pb-2">
        {loading && (
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex h-[66px] items-center gap-[11px] pl-2">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-fill-soft" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/5 animate-pulse rounded-full bg-fill-soft" />
                  <div className="h-3 w-4/5 animate-pulse rounded-full bg-fill-soft" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-[13px] text-faint">
            {search ? 'Nada coincide con tu búsqueda.' : 'Aún no hay mensajes.'}
          </p>
        )}

        {filtered.map((c, i) => {
          const active = c.id === selectedId;
          // El filo entre filas se esconde arriba y abajo de la elegida, como en Mensajes.
          const sinFilo = i === 0 || active || filtered[i - 1]?.id === selectedId;
          const noLeidos = c.unreadCount > 0;
          return (
            <button
              key={c.id}
              type="button"
              data-conversacion={c.id}
              aria-current={active || undefined}
              onClick={() => onSelect(c.id)}
              className={cn(
                'relative flex h-[66px] w-full items-center gap-[11px] rounded-[12px] pr-2.5 pl-2 text-left transition-colors',
                // Filo que arranca después del avatar (8 + 40 + 11 px) y se va bajo el cursor.
                'before:absolute before:top-0 before:right-2.5 before:left-[59px] before:h-px before:bg-hairline hover:before:opacity-0 [&:hover+button]:before:opacity-0',
                sinFilo && 'before:hidden',
                active ? 'bg-fill-soft' : 'hover:bg-fill-soft/70 active:bg-fill-soft',
              )}
            >
              <Avatar src={c.contactPic} name={c.contactName ?? c.contactUsername} size={40} />

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="min-w-0 flex-1 truncate text-[14px] leading-tight font-semibold tracking-[-0.012em]">
                    {c.contactName ?? (c.contactUsername ? `@${c.contactUsername}` : 'Sin nombre')}
                  </p>
                  <span className="tabular shrink-0 text-[12px] text-faint">{horaDeLista(c.lastMessageAt)}</span>
                </div>

                <div className="mt-0.5 flex items-center gap-1.5">
                  <p
                    className={cn(
                      'min-w-0 flex-1 truncate text-[13px] leading-snug',
                      noLeidos ? 'font-medium text-txt' : 'text-muted',
                    )}
                  >
                    {c.lastMessageDirection === 'out' && <span className="font-normal text-faint">Tú: </span>}
                    {c.lastMessagePreview}
                  </p>

                  {!c.automationPaused && <Bot className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.9} />}
                  {noLeidos && (
                    <span className="tabular grid h-[19px] min-w-[19px] shrink-0 place-items-center rounded-full bg-accent px-[5px] text-[11px] font-semibold text-accent-fg">
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
