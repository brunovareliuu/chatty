'use client';

import { useState } from 'react';
import { Inbox as InboxIcon } from 'lucide-react';
import Link from 'next/link';
import { useAccounts } from '@/lib/client/accounts-context';
import { useConversations } from '@/lib/client/firestore-hooks';
import { cn } from '@/lib/utils';
import { Empty } from '@/components/ui/empty';
import { InstagramIcon } from '@/components/ui/instagram-icon';
import { ConversationList } from './conversation-list';
import { Thread } from './thread';

export function InboxScreen() {
  const { account, loading: loadingAccounts } = useAccounts();
  const [filter, setFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations, loading } = useConversations(account?.id ?? null, filter);

  if (!loadingAccounts && !account) {
    return (
      <Empty
        icon={InstagramIcon}
        title="Todavía no hay ninguna cuenta conectada"
        description="Conecta tu cuenta profesional de Instagram para empezar a recibir mensajes aquí."
        action={
          <Link
            href="/settings"
            className="mt-1 inline-flex h-10 items-center rounded-xl bg-accent px-4 text-[14px] font-semibold text-accent-fg transition-opacity hover:opacity-90"
          >
            Conectar Instagram
          </Link>
        }
      />
    );
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    // En celular es una sola vista: la lista ocupa todo el ancho y, al abrir una
    // conversación, el hilo se pinta encima a pantalla completa (la lista sigue
    // montada debajo, así conserva su scroll al volver). En escritorio (md+) los
    // dos paneles van lado a lado, como siempre.
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <ConversationList
        conversations={conversations}
        loading={loading || loadingAccounts}
        selectedId={selectedId}
        onSelect={setSelectedId}
        filter={filter}
        onFilterChange={setFilter}
      />

      <div
        className={cn(
          'absolute inset-0 z-10 flex min-w-0 flex-col bg-bg md:static md:z-auto md:flex-1',
          !selected && 'hidden md:flex',
        )}
      >
        {selected && account ? (
          <Thread
            key={selected.id}
            accountId={account.id}
            conversation={selected}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <Empty
              icon={InboxIcon}
              title="Selecciona una conversación"
              description="Los mensajes que lleguen a tu Instagram aparecerán en la lista de la izquierda en tiempo real."
            />
          </div>
        )}
      </div>
    </div>
  );
}
