'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, Ellipsis, MessageCircle, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/lib/client/accounts-context';
import { useDoc, useMessages } from '@/lib/client/firestore-hooks';
import type { Conversation } from '@/lib/types';
import { cn, windowRemaining } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { PantallaPlana, AccionBarra } from '@/components/movil/ui/pantalla';
import { Cargando, Vacio } from '@/components/movil/ui/controles';
import { HojaAcciones } from '@/components/movil/ui/hoja';
import { Compositor } from './compositor';
import { Burbuja, SeparadorDia, mismoDia } from './burbuja';

/**
 * El hilo a pantalla completa: la barra con el avatar y el @usuario, las
 * burbujas y el compositor abajo, pegado al teclado (el armazón de `/m` usa
 * `interactiveWidget: resizes-content`, así que el teclado encoge la pantalla
 * en vez de tapar el campo).
 *
 * Los datos y el envío son los mismos del panel grande: `useDoc`, `useMessages`
 * y `POST /api/messages/send`.
 */
export function PantallaHilo({ conversacionId }: { conversacionId: string }) {
  const { account, loading: cargandoCuentas } = useAccounts();
  const { data: conversacion, loading: cargandoConv } = useDoc<Conversation>(
    account ? `accounts/${account.id}/conversations/${conversacionId}` : null,
  );

  if (cargandoCuentas || (account && cargandoConv)) {
    return (
      <PantallaPlana titulo="Conversación" atras={{ href: '/m/bandeja', etiqueta: 'Bandeja' }}>
        <Cargando />
      </PantallaPlana>
    );
  }

  if (!account || !conversacion) {
    return (
      <PantallaPlana titulo="Conversación" atras={{ href: '/m/bandeja', etiqueta: 'Bandeja' }}>
        <Vacio
          icon={MessageCircle}
          titulo="Esta conversación ya no está"
          detalle="Puede que se haya borrado o que sea de otra cuenta."
        />
      </PantallaPlana>
    );
  }

  return <Hilo accountId={account.id} conversacion={conversacion} />;
}

function Hilo({ accountId, conversacion }: { accountId: string; conversacion: Conversation }) {
  const router = useRouter();
  const { data: mensajes, loading } = useMessages(accountId, conversacion.id);
  const [borrador, setBorrador] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [menu, setMenu] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  const sinLeer = conversacion.unreadCount ?? 0;

  // Abrirla es haberla leído.
  useEffect(() => {
    if (sinLeer === 0) return;
    void fetch(`/api/conversations/${conversacion.id}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    });
  }, [accountId, conversacion.id, sinLeer]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' });
  }, [mensajes.length]);

  async function enviar() {
    const texto = borrador.trim();
    if (!texto || enviando) return;

    setEnviando(true);
    // Se vacía ya: el mensaje aparece solo en la lista, por Firestore.
    setBorrador('');
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, conversationId: conversacion.id, text: texto }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(payload.error ?? 'No se pudo enviar el mensaje');
        setBorrador(texto); // se lo devolvemos para que no pierda lo escrito
      }
    } catch {
      toast.error('Sin conexión con el servidor');
      setBorrador(texto);
    } finally {
      setEnviando(false);
    }
  }

  async function cambiarAutomatizacion(activar: boolean) {
    const res = await fetch(`/api/conversations/${conversacion.id}/automation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, paused: !activar }),
    });
    if (!res.ok) toast.error('No se pudo cambiar la automatización');
    else toast.success(activar ? 'Automatización activada' : 'Automatización pausada');
  }

  const usuario = conversacion.contactUsername;
  const nombre = conversacion.contactName ?? (usuario ? `@${usuario}` : 'Sin nombre');
  const queda = windowRemaining(conversacion.windowExpiresAt);
  const ventanaCorta = queda !== null && queda.hours < 2;

  return (
    <PantallaPlana
      atras={{ href: '/m/bandeja', etiqueta: 'Bandeja' }}
      titulo={
        <span className="flex items-center justify-center gap-1.5">
          <Avatar src={conversacion.contactPic} name={nombre} size={22} />
          <span className="truncate text-[17px] leading-tight font-semibold">{nombre}</span>
        </span>
      }
      subtitulo={usuario ? `@${usuario}` : 'Instagram'}
      accion={
        <AccionBarra onClick={() => setMenu(true)} aria-label="Opciones de la conversación">
          <Ellipsis className="h-[22px] w-[22px]" />
        </AccionBarra>
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <AvisoVentana queda={queda} corta={ventanaCorta} />

        {/* Los mensajes se apoyan abajo: un hilo corto arranca junto al compositor,
            como en Mensajes, no colgado del techo. */}
        <div className="scroll-ios min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="flex min-h-full flex-col justify-end space-y-1.5">
          {loading && <Cargando />}

          {!loading && mensajes.length === 0 && (
            <p className="py-10 text-center text-[15px] text-muted">
              Todavía no hay mensajes en esta conversación.
            </p>
          )}

          {mensajes.map((m, i) => (
            <div key={m.id} className="space-y-1.5">
              {(i === 0 || !mismoDia(mensajes[i - 1].timestamp, m.timestamp)) && (
                <SeparadorDia ts={m.timestamp} />
              )}
              <Burbuja mensaje={m} />
            </div>
          ))}

            <div ref={finRef} />
          </div>
        </div>

        <Compositor
          valor={borrador}
          onChange={setBorrador}
          onEnviar={enviar}
          enviando={enviando}
          placeholder="Escribe un mensaje…"
        />
      </div>

      <HojaAcciones
        abierta={menu}
        onCerrar={() => setMenu(false)}
        titulo={nombre}
        mensaje={
          conversacion.automationPaused
            ? 'Las automatizaciones no contestan aquí.'
            : 'Las automatizaciones contestan aquí.'
        }
        acciones={[
          {
            label: conversacion.automationPaused ? 'Activar automatización' : 'Pausar automatización',
            onClick: () => void cambiarAutomatizacion(conversacion.automationPaused),
          },
          ...(usuario
            ? [
                {
                  label: 'Ver perfil en Instagram',
                  onClick: () => window.open(`https://instagram.com/${usuario}`, '_blank'),
                },
              ]
            : []),
          { label: 'Ver contactos', onClick: () => router.push('/m/contactos') },
        ]}
      />
    </PantallaPlana>
  );
}

/**
 * El límite de Meta: fuera de las 24 h siguientes al último mensaje de la
 * persona solo se puede responder con la etiqueta de agente humano. Se avisa
 * cuando ya venció y cuando queda poco; en medio no estorba.
 */
function AvisoVentana({
  queda,
  corta,
}: {
  queda: { hours: number; minutes: number } | null;
  corta: boolean;
}) {
  if (queda && !corta) return null;

  return (
    <div
      className={cn(
        'flex shrink-0 items-start gap-2 px-4 py-2 text-[13px] leading-snug',
        queda ? 'bg-warn/12 text-txt' : 'bg-neg/10 text-txt',
      )}
    >
      {queda ? (
        <>
          <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
          <span>
            Quedan {queda.hours} h {queda.minutes} min de la ventana de 24 h de Instagram.
          </span>
        </>
      ) : (
        <>
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neg" />
          <span>
            Pasaron 24 h: solo se responde con la etiqueta de agente humano, que Meta corta a
            los 7 días.
          </span>
        </>
      )}
    </div>
  );
}
