'use client';

import { useEffect, useRef, useState } from 'react';
import { History, Loader2, MessageSquarePlus, Sparkles, Square, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/lib/client/accounts-context';
import type { AssistantEvent, ChatSummary, ViewBlock, ViewMessage } from '@/lib/asistente/eventos';
import { relativeTime } from '@/lib/utils';
import { ToolRow } from '@/components/asistente/tarjetas';
import { RichText } from '@/components/asistente/texto';
import { PantallaPlana, AccionBarra } from '@/components/movil/ui/pantalla';
import { Seccion, FilaBoton } from '@/components/movil/ui/lista';
import { Cargando, Vacio } from '@/components/movil/ui/controles';
import { Hoja, HojaAcciones } from '@/components/movil/ui/hoja';
import { Compositor } from '@/components/movil/bandeja/compositor';
import { TarjetaAsistente, Chispa } from './tarjetas';

/**
 * El asistente en el celular: es un chat, así que se pinta como el hilo de la
 * bandeja — mensajes arriba, compositor abajo. Lo que en el panel grande es
 * una columna de conversaciones aquí es una hoja, que es como iOS guarda lo
 * que no cabe en pantalla.
 *
 * El streaming es el mismo contrato del panel (NDJSON de `/api/asistente`) y
 * las herramientas se pintan con el mismo `ToolRow` y el mismo `RichText`.
 */

const SUGERENCIAS = [
  'Cuando comenten GUÍA en mi último post, mándales el link de mi guía por DM, pero solo si me siguen',
  'Si alguien escribe PRECIO por DM, mándale mis precios y pregúntale su correo',
  '¿Qué automatizaciones tengo activas?',
];

export function PantallaAsistente() {
  const { account, loading } = useAccounts();

  if (loading) {
    return (
      <PantallaPlana titulo="Asistente" atras={{ href: '/m/bandeja', etiqueta: 'Bandeja' }}>
        <Cargando />
      </PantallaPlana>
    );
  }

  if (!account) {
    return (
      <PantallaPlana titulo="Asistente" atras={{ href: '/m/bandeja', etiqueta: 'Bandeja' }}>
        <Vacio
          icon={Sparkles}
          titulo="No hay cuenta conectada"
          detalle="El asistente trabaja sobre una cuenta de Instagram: sus publicaciones y sus automatizaciones."
        />
      </PantallaPlana>
    );
  }

  // La clave reinicia la conversación al cambiar de cuenta.
  return <Chat key={account.id} accountId={account.id} usuario={account.username} />;
}

function Chat({ accountId, usuario }: { accountId: string; usuario: string }) {
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<ViewMessage[]>([]);
  const [abriendo, setAbriendo] = useState(false);
  const [borrador, setBorrador] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoja, setHoja] = useState(false);
  const [porBorrar, setPorBorrar] = useState<ChatSummary | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const peticion = useRef(0);

  const consulta = `accountId=${encodeURIComponent(accountId)}`;

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/asistente/chats?${consulta}`)
      .then((res) => (res.ok ? res.json() : { chats: [] }))
      // El `setState` va en el `.then`, no en el cuerpo del efecto.
      .then((data: { chats?: ChatSummary[] }) => {
        if (!cancelado) setChats(data.chats ?? []);
      })
      .catch(() => {
        if (!cancelado) setChats([]);
      });
    return () => {
      cancelado = true;
    };
  }, [consulta]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes]);

  function cambiaTurno(turnoId: string, cambio: (bloques: ViewBlock[]) => ViewBlock[]) {
    setMensajes((prev) =>
      prev.map((m) => (m.id === turnoId && m.role === 'assistant' ? { ...m, blocks: cambio(m.blocks) } : m)),
    );
  }

  function aplica(evento: AssistantEvent, turnoId: string) {
    switch (evento.type) {
      case 'chat':
        setChatId(evento.chatId);
        setChats((prev) => [
          { id: evento.chatId, title: evento.title, updatedAt: Date.now() },
          ...(prev ?? []).filter((c) => c.id !== evento.chatId),
        ]);
        return;
      case 'text':
        cambiaTurno(turnoId, (bloques) => {
          const ultimo = bloques[bloques.length - 1];
          return ultimo?.type === 'text'
            ? [...bloques.slice(0, -1), { type: 'text', text: ultimo.text + evento.text }]
            : [...bloques, { type: 'text', text: evento.text }];
        });
        return;
      case 'tool':
        cambiaTurno(turnoId, (bloques) => {
          const bloque: ViewBlock = {
            type: 'tool',
            id: evento.id,
            name: evento.name,
            status: evento.status,
            detail: evento.detail,
          };
          const i = bloques.findIndex((b) => b.type === 'tool' && b.id === evento.id);
          return i >= 0 ? bloques.map((b, j) => (j === i ? bloque : b)) : [...bloques, bloque];
        });
        return;
      case 'card':
        cambiaTurno(turnoId, (bloques) => [...bloques, { type: 'card', card: evento.card, live: true }]);
        return;
      case 'error':
        setError(evento.message);
        return;
      default:
        return;
    }
  }

  async function enviar() {
    const texto = borrador.trim();
    if (!texto || trabajando) return;

    const turnoId = crypto.randomUUID();
    setBorrador('');
    setError(null);
    setMensajes((prev) => [
      ...prev,
      { id: `${turnoId}-user`, role: 'user', text: texto },
      { id: turnoId, role: 'assistant', blocks: [] },
    ]);
    setTrabajando(true);

    const control = new AbortController();
    abortRef.current = control;

    try {
      const res = await fetch('/api/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, chatId, message: texto }),
        signal: control.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'No se pudo hablar con el asistente');
      }

      const lector = res.body.getReader();
      const decodificador = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await lector.read();
        if (done) break;
        buffer += decodificador.decode(value, { stream: true });
        let salto = buffer.indexOf('\n');
        while (salto >= 0) {
          const linea = buffer.slice(0, salto).trim();
          buffer = buffer.slice(salto + 1);
          if (linea) aplica(JSON.parse(linea) as AssistantEvent, turnoId);
          salto = buffer.indexOf('\n');
        }
      }
    } catch (err) {
      if (!control.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Se perdió la conexión con el asistente');
      }
    } finally {
      abortRef.current = null;
      setTrabajando(false);
      // Un turno que no alcanzó a decir nada no se queda como burbuja vacía.
      setMensajes((prev) =>
        prev.filter((m) => !(m.id === turnoId && m.role === 'assistant' && m.blocks.length === 0)),
      );
      fetch(`/api/asistente/chats?${consulta}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { chats?: ChatSummary[] } | null) => {
          if (data?.chats) setChats(data.chats);
        })
        .catch(() => {});
    }
  }

  async function abrirChat(id: string) {
    if (trabajando || id === chatId) return;
    const mia = ++peticion.current;
    setChatId(id);
    setMensajes([]);
    setError(null);
    setAbriendo(true);
    try {
      const res = await fetch(`/api/asistente/chats/${encodeURIComponent(id)}?${consulta}`);
      const data = (await res.json()) as { messages?: ViewMessage[]; error?: string };
      if (mia !== peticion.current) return;
      if (!res.ok) throw new Error(data.error ?? 'No se pudo abrir la conversación');
      setMensajes(data.messages ?? []);
    } catch (err) {
      if (mia === peticion.current) {
        toast.error(err instanceof Error ? err.message : 'No se pudo abrir la conversación');
      }
    } finally {
      if (mia === peticion.current) setAbriendo(false);
    }
  }

  function nuevoChat() {
    if (trabajando) return;
    peticion.current += 1;
    setChatId(null);
    setMensajes([]);
    setError(null);
    setAbriendo(false);
  }

  async function borrarChat(id: string) {
    const res = await fetch(`/api/asistente/chats/${encodeURIComponent(id)}?${consulta}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      toast.error('No se pudo borrar la conversación');
      return;
    }
    setChats((prev) => (prev ?? []).filter((c) => c.id !== id));
    if (id === chatId) nuevoChat();
  }

  const vacio = mensajes.length === 0 && !abriendo;

  return (
    <PantallaPlana
      titulo="Asistente"
      subtitulo={`Claude sobre @${usuario}`}
      atras={{ href: '/m/bandeja', etiqueta: 'Bandeja' }}
      accion={
        <>
          <AccionBarra onClick={() => setHoja(true)} aria-label="Conversaciones anteriores">
            <History className="h-[21px] w-[21px]" />
          </AccionBarra>
          <AccionBarra onClick={nuevoChat} disabled={trabajando} aria-label="Nueva conversación">
            <MessageSquarePlus className="h-[21px] w-[21px]" />
          </AccionBarra>
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <div ref={scrollRef} className="scroll-ios min-h-0 flex-1 overflow-y-auto">
          {abriendo && <Cargando />}

          {vacio && (
            <div className="pt-8">
              <div className="flex flex-col items-center px-8 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-accent-soft">
                  <Sparkles className="h-6 w-6 text-accent" />
                </span>
                <h2 className="mt-4 text-[22px] font-bold tracking-[-0.02em]">¿Qué armamos hoy?</h2>
                <p className="mt-1.5 text-[15px] leading-snug text-muted">
                  Pídelo como se lo pedirías a alguien del equipo. Lo que crea queda en
                  Automatizaciones.
                </p>
              </div>
              <div className="pt-7">
                <Seccion titulo="Prueba con" pie="Lo que crea es real: una automatización activa contesta en tu Instagram en cuanto se crea.">
                  {SUGERENCIAS.map((s, i) => (
                    <FilaBoton
                      key={s}
                      onClick={() => setBorrador(s)}
                      titulo={
                        <span className="block text-[15px] leading-snug text-txt">{s}</span>
                      }
                      ultima={i === SUGERENCIAS.length - 1}
                    />
                  ))}
                </Seccion>
              </div>
            </div>
          )}

          {!abriendo && mensajes.length > 0 && (
            <div className="space-y-5 px-4 py-4">
              {mensajes.map((m, i) =>
                m.role === 'user' ? (
                  <div key={m.id} className="flex justify-end">
                    <p className="max-w-[78%] rounded-[20px] bg-accent px-3.5 py-2 text-[16px] leading-[1.35] whitespace-pre-wrap text-accent-fg [overflow-wrap:anywhere]">
                      {m.text}
                    </p>
                  </div>
                ) : (
                  <TurnoAsistente
                    key={m.id}
                    bloques={m.blocks}
                    trabajando={trabajando && i === mensajes.length - 1}
                  />
                ),
              )}
              {error && (
                <p className="rounded-[12px] bg-neg/10 px-3 py-2 text-[14px] leading-snug text-neg">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        <Compositor
          valor={borrador}
          onChange={setBorrador}
          onEnviar={enviar}
          placeholder="Pídeme una automatización, un post…"
          detener={
            trabajando ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                aria-label="Detener la respuesta"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2 text-txt active:opacity-70"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : undefined
          }
        />
      </div>

      <Hoja
        abierta={hoja}
        onCerrar={() => setHoja(false)}
        titulo="Conversaciones"
        derecha={
          <AccionBarra
            fuerte
            disabled={trabajando}
            onClick={() => {
              setHoja(false);
              nuevoChat();
            }}
          >
            Nueva
          </AccionBarra>
        }
      >
        <div className="-mx-4">
          {chats === null && <Cargando />}
          {chats?.length === 0 && (
            <Vacio
              icon={History}
              titulo="Todavía no hay ninguna"
              detalle="Aquí se guarda lo que ya le pediste al asistente."
            />
          )}
          {chats && chats.length > 0 && (
            <Seccion pie="Borrar una conversación no borra lo que el asistente ya creó.">
              {chats.map((c, i) => (
                <FilaBoton
                  key={c.id}
                  onClick={() => {
                    setHoja(false);
                    void abrirChat(c.id);
                  }}
                  titulo={c.title}
                  subtitulo={relativeTime(c.updatedAt)}
                  derecha={
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPorBorrar(c);
                      }}
                      aria-label={`Borrar «${c.title}»`}
                      className="-my-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted active:opacity-50"
                    >
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                  }
                  ultima={i === chats.length - 1}
                />
              ))}
            </Seccion>
          )}
        </div>
      </Hoja>

      <HojaAcciones
        abierta={porBorrar !== null}
        onCerrar={() => setPorBorrar(null)}
        titulo={porBorrar?.title}
        mensaje="Lo que ya creó el asistente se queda."
        acciones={[
          {
            label: 'Borrar conversación',
            peligro: true,
            onClick: () => {
              if (porBorrar) void borrarChat(porBorrar.id);
            },
          },
        ]}
      />
    </PantallaPlana>
  );
}

function TurnoAsistente({ bloques, trabajando }: { bloques: ViewBlock[]; trabajando: boolean }) {
  const ultimo = bloques[bloques.length - 1];
  const pensando =
    trabajando && ultimo?.type !== 'text' && !bloques.some((b) => b.type === 'tool' && b.status === 'working');

  return (
    <div className="flex gap-2.5">
      <Chispa />
      <div className="min-w-0 flex-1 space-y-3 pt-0.5">
        {bloques.map((b, i) => {
          if (b.type === 'text') return <RichText key={i} text={b.text} />;
          if (b.type === 'tool') return <ToolRow key={i} block={b} />;
          return <TarjetaAsistente key={i} card={b.card} live={Boolean(b.live)} />;
        })}
        {pensando && (
          <p className="flex items-center gap-2 text-[14px] text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Pensando…
          </p>
        )}
      </div>
    </div>
  );
}
