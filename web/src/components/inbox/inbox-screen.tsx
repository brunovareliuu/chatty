'use client';

import { useState } from 'react';
import { Inbox as InboxIcon, Zap } from 'lucide-react';
import Link from 'next/link';
import type { Conversation } from '@/lib/types';
import { useAccounts } from '@/lib/client/accounts-context';
import { useConversations } from '@/lib/client/firestore-hooks';
import { cn } from '@/lib/utils';
import { botonClases } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { InstagramIcon } from '@/components/ui/instagram-icon';
import { PageHeader } from '@/components/shell/page-header';
import { ConversationList, type FiltroBandeja } from './conversation-list';
import { Thread } from './thread';

export function InboxScreen() {
  const { account, loading: loadingAccounts } = useAccounts();
  const [filter, setFilter] = useState<FiltroBandeja>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations, loading } = useConversations(account?.id ?? null, filter);

  if (!loadingAccounts && !account) {
    return (
      <Empty
        icon={InstagramIcon}
        title="Todavía no hay ninguna cuenta conectada"
        description="Conecta tu cuenta profesional de Instagram para empezar a recibir mensajes aquí."
        action={
          <Link href="/settings" className={botonClases({ variant: 'primary' })}>
            Conectar Instagram
          </Link>
        }
      />
    );
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <VistaBandeja
      usuario={account?.username ?? null}
      conversations={conversations}
      loading={loading || loadingAccounts}
      selectedId={selectedId}
      onSelect={setSelectedId}
      filter={filter}
      onFilterChange={setFilter}
      hilo={
        selected && account ? (
          <Thread
            key={selected.id}
            accountId={account.id}
            conversation={selected}
            onBack={() => setSelectedId(null)}
          />
        ) : null
      }
    />
  );
}

/**
 * La bandeja sin datos propios: título, y la tarjeta con la lista a la
 * izquierda y el hilo a la derecha. La usan `InboxScreen` y cualquier vista
 * con conversaciones de ejemplo.
 */
export function VistaBandeja({
  usuario,
  conversations,
  loading,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  hilo,
}: {
  usuario: string | null;
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: FiltroBandeja;
  onFilterChange: (f: FiltroBandeja) => void;
  /** El hilo abierto, o null si no hay conversación elegida. */
  hilo: React.ReactNode;
}) {
  return (
    // En celular es una sola vista: la lista ocupa la tarjeta y, al abrir una
    // conversación, el hilo se pinta encima a pantalla completa (tapa también
    // el título: se posiciona contra este contenedor, no contra la tarjeta). La
    // lista sigue montada debajo, así conserva su scroll al volver. En
    // escritorio (md+) los dos paneles van lado a lado dentro de la tarjeta.
    <div className="relative flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Bandeja"
        description={`Los mensajes directos de ${usuario ? `@${usuario}` : 'tu cuenta'}, en tiempo real. El bot contesta; tú entras cuando quieras.`}
        action={
          <Link href="/automations" className={botonClases({ variant: 'outline', size: 'sm' })}>
            <Zap className="h-[15px] w-[15px]" strokeWidth={1.9} />
            Automatizaciones
          </Link>
        }
      />

      <div className="px-pagina flex min-h-0 flex-1 pb-3 md:pb-8">
        <div className="tarjeta flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <ConversationList
            conversations={conversations}
            loading={loading}
            selectedId={selectedId}
            onSelect={onSelect}
            filter={filter}
            onFilterChange={onFilterChange}
          />

          <div
            className={cn(
              'absolute inset-0 z-10 flex min-w-0 flex-col bg-card md:static md:z-auto md:flex-1',
              !hilo && 'hidden md:flex',
            )}
          >
            {hilo ?? (
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
      </div>
    </div>
  );
}
