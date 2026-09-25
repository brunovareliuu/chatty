'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, ChevronRight, Ellipsis, MessageCircle } from 'lucide-react';
import { useAccounts } from '@/lib/client/accounts-context';
import { useConversations } from '@/lib/client/firestore-hooks';
import type { Conversation } from '@/lib/types';
import { cn, relativeTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { InstagramIcon } from '@/components/ui/instagram-icon';
import { Pantalla, AccionBarra } from '@/components/movil/ui/pantalla';
import { Seccion } from '@/components/movil/ui/lista';
import { Busqueda, Cargando, Segmentado, Vacio } from '@/components/movil/ui/controles';
import { HojaAcciones } from '@/components/movil/ui/hoja';

/**
 * Bandeja — la app de Mensajes de iOS con los DMs de Instagram: avatar grande,
 * nombre, la última línea en gris y la hora a la derecha. El punto del acento
 * a la izquierda es el de Mensajes: marca lo que todavía no abres.
 *
 * Los datos son los mismos del panel grande (`useConversations`); aquí solo
 * cambia la pintura.
 */

type Filtro = 'open' | 'closed' | 'all';

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: 'open', label: 'Abiertas' },
  { valor: 'closed', label: 'Cerradas' },
  { valor: 'all', label: 'Todas' },
];

export function PantallaBandeja() {
  const router = useRouter();
  const { account, loading: cargandoCuentas } = useAccounts();
  const [filtro, setFiltro] = useState<Filtro>('open');
  const [busqueda, setBusqueda] = useState('');
  const [menu, setMenu] = useState(false);

  const { data: conversaciones, loading } = useConversations(account?.id ?? null, filtro);

  const lista = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return conversaciones;
    return conversaciones.filter(
      (c) =>
        c.contactUsername?.toLowerCase().includes(termino) ||
        c.contactName?.toLowerCase().includes(termino) ||
        c.lastMessagePreview.toLowerCase().includes(termino),
    );
  }, [conversaciones, busqueda]);

  const sinLeer = conversaciones.reduce((n, c) => n + (c.unreadCount ?? 0), 0);

  return (
    <Pantalla
      titulo="Bandeja"
      descripcion={
        account
          ? sinLeer > 0
            ? `${sinLeer} sin leer de @${account.username}`
            : `Al día con @${account.username}`
          : undefined
      }
      accion={
        <AccionBarra onClick={() => setMenu(true)} aria-label="Más de Instagram">
          <Ellipsis className="h-[22px] w-[22px]" />
        </AccionBarra>
      }
      bajoBarra={
        <div className="space-y-2">
          <Busqueda valor={busqueda} onChange={setBusqueda} placeholder="Buscar conversación" />
          <Segmentado valor={filtro} onChange={setFiltro} opciones={FILTROS} />
        </div>
      }
      sinMargen
    >
      {!cargandoCuentas && !account && (
        <Vacio
          icon={InstagramIcon}
          titulo="No hay cuenta conectada"
          detalle="Conecta tu cuenta profesional de Instagram desde Ajustes para recibir mensajes aquí."
        />
      )}

      {account && (loading || cargandoCuentas) && <Cargando />}

      {account && !loading && lista.length === 0 && (
        <Vacio
          icon={MessageCircle}
          titulo={busqueda ? 'Nada coincide' : 'Todavía no hay mensajes'}
          detalle={
            busqueda
              ? 'Prueba con otro nombre o con lo que te escribieron.'
              : filtro === 'closed'
                ? 'Aquí caen las conversaciones que cierras.'
                : 'En cuanto alguien te escriba por Instagram aparece aquí.'
          }
        />
      )}

      {account && !loading && lista.length > 0 && (
        <Seccion className="pt-0">
          {lista.map((c, i) => (
            <FilaConversacion key={c.id} conversacion={c} ultima={i === lista.length - 1} />
          ))}
        </Seccion>
      )}

      <HojaAcciones
        abierta={menu}
        onCerrar={() => setMenu(false)}
        titulo="Instagram"
        acciones={[
          { label: 'Contactos', onClick: () => router.push('/m/contactos') },
          { label: 'Automatizaciones', onClick: () => router.push('/m/automatizaciones') },
          { label: 'Asistente', onClick: () => router.push('/m/asistente') },
        ]}
      />
    </Pantalla>
  );
}

/**
 * Una conversación. No es una `Fila` del kit porque Mensajes de iOS usa avatar
 * grande y el punto de sin leer en el margen; el resto (sangría del separador,
 * 44 px de alto, pulsado) sí es el mismo.
 */
function FilaConversacion({
  conversacion: c,
  ultima,
}: {
  conversacion: Conversation;
  ultima: boolean;
}) {
  const sinLeer = (c.unreadCount ?? 0) > 0;
  const nombre = c.contactName ?? (c.contactUsername ? `@${c.contactUsername}` : 'Sin nombre');

  return (
    <Link
      href={`/m/bandeja/${c.id}`}
      className={cn(
        'relative flex min-h-[44px] w-full items-center gap-3 py-2.5 pr-3 pl-3 active:bg-surface-2',
        !ultima && 'sep-ios',
      )}
      // 12 de relleno + 9 del punto + 12 + 44 del avatar + 12 = donde empieza el texto.
      style={{ ['--sangria' as string]: '89px' }}
    >
      <span
        className={cn('h-[9px] w-[9px] shrink-0 rounded-full', sinLeer ? 'bg-accent' : 'bg-transparent')}
        aria-hidden
      />
      <Avatar src={c.contactPic} name={c.contactName ?? c.contactUsername} size={44} />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-[17px] leading-[1.3]',
              sinLeer ? 'font-semibold' : 'font-medium',
            )}
          >
            {nombre}
          </span>
          <span className="shrink-0 text-[13px] text-muted tabular-nums">
            {relativeTime(c.lastMessageAt)}
          </span>
        </span>

        <span className="mt-0.5 flex items-center gap-1.5">
          {c.lastMessageDirection === 'out' && (
            <span className="shrink-0 text-[15px] text-faint">Tú:</span>
          )}
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-[15px] leading-[1.3]',
              sinLeer ? 'text-txt' : 'text-muted',
            )}
          >
            {c.lastMessagePreview}
          </span>
          {/* En gris: el acento de esta lista es del punto de sin leer. */}
          {!c.automationPaused && (
            <Bot className="h-[15px] w-[15px] shrink-0 text-muted" strokeWidth={2} />
          )}
        </span>
      </span>

      {/* El chevron de iOS va centrado en la fila, no en la línea del nombre. */}
      <ChevronRight className="h-[16px] w-[16px] shrink-0 text-faint" strokeWidth={2.6} />
    </Link>
  );
}
