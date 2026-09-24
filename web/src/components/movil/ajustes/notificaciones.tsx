'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  Send,
  Share,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  activarPush,
  desactivarPush,
  esIos,
  estadoPush,
  suscripcionActual,
  type EstadoPush,
} from '@/lib/push/cliente';
import {
  EVENTOS,
  METRICAS_HITO,
  OPCIONES_CADA_COMENTARIOS,
  completaPreferencias,
  type AvisoEnviado,
  type Dispositivo,
  type EventoPush,
  type Preferencias,
} from '@/lib/push/tipos';
import { Seccion, Fila, FilaBoton, IconoFila } from '@/components/movil/ui/lista';
import { HojaAcciones } from '@/components/movil/ui/hoja';
import { Switch } from '@/components/ui/switch';

type Datos = {
  clavePublica: string;
  dispositivos: Dispositivo[];
  preferencias: Preferencias;
  historial: AvisoEnviado[];
};

const NOMBRE_EVENTO: Record<EventoPush, string> = {
  automatizacion: 'Automatización',
  comentarios: 'Comentarios',
  checkpoint: 'Checkpoint',
  dm_sin_respuesta: 'DM',
  prueba: 'Prueba',
};

function fecha(ts: number): string {
  return new Date(ts).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Todo lo que Ajustes necesita saber, de una. Vive fuera del componente
 *  porque no depende de nada suyo (y así el efecto no lo lleva en la lista). */
async function cargar() {
  const [e, sub, res] = await Promise.all([estadoPush(), suscripcionActual(), fetch('/api/push')]);
  const d = (await res.json()) as Datos;
  return { estado: e, endpoint: sub?.endpoint ?? null, datos: d };
}

/**
 * Ajustes › Notificaciones, en filas de iOS. Es la misma pantalla del
 * escritorio (`notificaciones-settings.tsx`) con las mismas llamadas a
 * `/api/push`: prender los avisos en ESTE aparato, decidir de qué te avisamos,
 * ver qué aparatos están suscritos y qué ha salido.
 */
export function AjustesNotificaciones() {
  const [estado, setEstado] = useState<EstadoPush>('cargando');
  const [endpointActual, setEndpointActual] = useState<string | null>(null);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [ocupado, setOcupado] = useState<'activar' | 'desactivar' | 'prueba' | null>(null);
  const [eligiendoCada, setEligiendoCada] = useState(false);
  const [porQuitar, setPorQuitar] = useState<Dispositivo | null>(null);

  useEffect(() => {
    let vivo = true;
    cargar()
      .then((r) => {
        if (!vivo) return;
        setEstado(r.estado);
        setEndpointActual(r.endpoint);
        setDatos({ ...r.datos, preferencias: completaPreferencias(r.datos.preferencias) });
      })
      .catch(() => {
        if (vivo) toast.error('No se pudo cargar la configuración de avisos');
      });
    return () => {
      vivo = false;
    };
  }, []);

  async function refrescar() {
    const r = await cargar();
    setEstado(r.estado);
    setEndpointActual(r.endpoint);
    setDatos({ ...r.datos, preferencias: completaPreferencias(r.datos.preferencias) });
  }

  /** Siempre desde un toque: si se llama desde un efecto, el navegador la ignora. */
  async function activar() {
    setOcupado('activar');
    try {
      await activarPush();
      toast.success('Listos. Te mandamos uno de bienvenida.');
      await refrescar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron activar');
      setEstado(await estadoPush());
    } finally {
      setOcupado(null);
    }
  }

  async function desactivar() {
    setOcupado('desactivar');
    try {
      await desactivarPush();
      toast.success('Este aparato ya no recibe avisos');
      await refrescar();
    } finally {
      setOcupado(null);
    }
  }

  async function prueba() {
    setOcupado('prueba');
    try {
      const res = await fetch('/api/push/prueba', { method: 'POST' });
      const r = (await res.json()) as { enviados: number; fallidos: number; omitido?: string };
      if (r.omitido === 'sin-dispositivos') toast.error('No hay ningún aparato suscrito');
      else if (r.enviados === 0) toast.error('No se pudo enviar a ningún aparato');
      else
        toast.success(
          `Prueba enviada a ${r.enviados} ${r.enviados === 1 ? 'aparato' : 'aparatos'}`,
        );
      await refrescar();
    } finally {
      setOcupado(null);
    }
  }

  async function quitar(d: Dispositivo) {
    if (d.endpoint === endpointActual) {
      await desactivarPush();
    } else {
      await fetch('/api/push/suscribir', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id }),
      });
    }
    await refrescar();
  }

  async function cambiar(parche: Partial<Preferencias>) {
    if (!datos) return;
    const nuevas = completaPreferencias({ ...datos.preferencias, ...parche });
    setDatos({ ...datos, preferencias: nuevas });
    const res = await fetch('/api/push/preferencias', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevas),
    });
    if (!res.ok) toast.error('No se guardó el cambio');
  }

  const prefs = datos?.preferencias ?? null;
  const haySuscritos = (datos?.dispositivos.length ?? 0) > 0;

  return (
    <>
      <Seccion titulo="Este aparato">
        <EsteAparato
          estado={estado}
          ocupado={ocupado}
          haySuscritos={haySuscritos}
          onActivar={activar}
          onDesactivar={desactivar}
          onPrueba={prueba}
        />
      </Seccion>

      <Seccion
        titulo="De qué te avisamos"
        pie="Las automatizaciones se marcan una por una: abre la automatización y prende «Avisarme al celular»."
      >
        {EVENTOS.map((ev, i) => (
          <Fila
            key={ev.id}
            titulo={ev.titulo}
            subtitulo={
              <span className="mt-0.5 block pr-2 text-[13px] leading-[1.35] text-muted">
                {ev.detalle}
              </span>
            }
            derecha={
              <Switch
                checked={prefs?.eventos[ev.id] ?? false}
                disabled={!prefs}
                onCheckedChange={(v) => cambiar({ eventos: { ...prefs!.eventos, [ev.id]: v } })}
              />
            }
            ultima={i === EVENTOS.length - 1 && !(prefs?.eventos.comentarios ?? false)}
          />
        ))}
        {prefs?.eventos.comentarios && (
          <FilaBoton
            onClick={() => setEligiendoCada(true)}
            titulo="Avísame cada"
            valor={`${prefs.cadaComentarios} comentarios`}
            chevron
            ultima
          />
        )}
      </Seccion>

      {prefs?.eventos.checkpoint && (
        <Seccion
          titulo="Qué checkpoints"
          pie="La primera vez que vemos una cifra solo anotamos dónde va; se avisa a partir de la siguiente marca."
        >
          {METRICAS_HITO.map((m, i) => (
            <Fila
              key={m.id}
              titulo={m.titulo}
              derecha={
                <Switch
                  checked={prefs.hitos[m.id]}
                  onCheckedChange={(v) => cambiar({ hitos: { ...prefs.hitos, [m.id]: v } })}
                />
              }
              ultima={i === METRICAS_HITO.length - 1}
            />
          ))}
        </Seccion>
      )}

      <Seccion titulo="Aparatos suscritos">
        {!datos && <Fila titulo="Cargando…" ultima />}
        {datos && datos.dispositivos.length === 0 && (
          <Fila
            izquierda={<IconoFila icon={Smartphone} tono="bg-muted" />}
            titulo="Ninguno todavía"
            subtitulo="Cada teléfono o navegador que active los avisos aparece aquí."
            ultima
          />
        )}
        {datos?.dispositivos.map((d, i) => (
          <FilaBoton
            key={d.id}
            onClick={() => setPorQuitar(d)}
            izquierda={<IconoFila icon={Smartphone} tono={d.ultimoError ? 'bg-neg' : 'bg-pos'} />}
            titulo={
              <span className="flex items-center gap-2">
                <span className="min-w-0 truncate text-[17px] leading-[1.35]">{d.nombre}</span>
                {d.endpoint === endpointActual && (
                  <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent">
                    Este
                  </span>
                )}
              </span>
            }
            subtitulo={
              d.ultimoError ??
              (d.ultimoEnvioEn ? `Último aviso ${fecha(d.ultimoEnvioEn)}` : 'Sin avisos todavía')
            }
            derecha={<Trash2 className="h-[17px] w-[17px] shrink-0 text-muted" />}
            ultima={i === datos.dispositivos.length - 1}
          />
        ))}
      </Seccion>

      <Seccion titulo="Últimos avisos">
        {datos && datos.historial.length === 0 && (
          <Fila titulo="Todavía no ha salido ninguno" ultima />
        )}
        {datos?.historial.slice(0, 12).map((a, i, arr) => (
          <Fila
            key={a.id}
            titulo={
              <span className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-[17px] leading-[1.35]">
                  {a.titulo}
                </span>
                <span className="shrink-0 text-[12px] text-faint">
                  {NOMBRE_EVENTO[a.evento] ?? a.evento}
                </span>
              </span>
            }
            subtitulo={
              <span className="mt-0.5 block text-[13px] leading-[1.35] text-muted">
                <span className="line-clamp-2 whitespace-pre-line">{a.cuerpo}</span>
                <span className="mt-0.5 block text-faint">
                  {fecha(a.enviadoEn)} · {a.dispositivos}{' '}
                  {a.dispositivos === 1 ? 'aparato' : 'aparatos'}
                  {a.fallidos > 0 ? ` · ${a.fallidos} con error` : ''}
                </span>
              </span>
            }
            ultima={i === Math.min(arr.length, 12) - 1}
          />
        ))}
      </Seccion>

      <HojaAcciones
        abierta={eligiendoCada}
        onCerrar={() => setEligiendoCada(false)}
        titulo="Avísame cada"
        mensaje="Cuenta los comentarios de otras personas en tus publicaciones."
        acciones={OPCIONES_CADA_COMENTARIOS.map((n) => ({
          label: `${n} comentarios`,
          onClick: () => cambiar({ cadaComentarios: n }),
        }))}
      />

      <HojaAcciones
        abierta={Boolean(porQuitar)}
        onCerrar={() => setPorQuitar(null)}
        titulo={porQuitar?.nombre}
        mensaje="Dejará de recibir avisos."
        acciones={[
          {
            label: 'Quitar este aparato',
            peligro: true,
            onClick: () => {
              if (porQuitar) void quitar(porQuitar);
            },
          },
        ]}
      />
    </>
  );
}

/** El estado de los avisos en el aparato que tienes en la mano. */
function EsteAparato({
  estado,
  ocupado,
  haySuscritos,
  onActivar,
  onDesactivar,
  onPrueba,
}: {
  estado: EstadoPush;
  ocupado: 'activar' | 'desactivar' | 'prueba' | null;
  haySuscritos: boolean;
  onActivar: () => void;
  onDesactivar: () => void;
  onPrueba: () => void;
}) {
  if (estado === 'cargando') return <Fila titulo="Comprobando…" ultima />;

  if (estado === 'ios-sin-instalar') {
    return (
      <Fila
        izquierda={<IconoFila icon={Share} tono="bg-accent" />}
        titulo="Agrega la app a tu pantalla de inicio"
        subtitulo={
          <span className="mt-0.5 block text-[13px] leading-[1.35] text-muted">
            En Safari: Compartir › Agregar a inicio. Ábrela desde ahí y vuelve aquí. Así funciona el
            iPhone, no es cosa del panel.
          </span>
        }
        ultima
      />
    );
  }

  if (estado === 'sin-soporte') {
    return (
      <Fila
        izquierda={<IconoFila icon={BellOff} tono="bg-muted" />}
        titulo="Este navegador no recibe avisos"
        subtitulo="Ábrelo desde tu celular o desde Chrome."
        ultima
      />
    );
  }

  if (estado === 'bloqueado') {
    return (
      <Fila
        izquierda={<IconoFila icon={BellOff} tono="bg-neg" />}
        titulo="Los avisos están bloqueados aquí"
        subtitulo={
          <span className="mt-0.5 block text-[13px] leading-[1.35] text-muted">
            {esIos()
              ? 'Ajustes del iPhone › Notificaciones › Chatty, y permítelos.'
              : 'Permítelos desde el candado de la barra de direcciones y recarga.'}
          </span>
        }
        ultima
      />
    );
  }

  if (estado === 'activo') {
    return (
      <>
        <Fila
          izquierda={<IconoFila icon={BellRing} tono="bg-pos" />}
          titulo="Recibiendo avisos"
          subtitulo="Este aparato está suscrito"
        />
        <FilaBoton
          onClick={onPrueba}
          disabled={ocupado === 'prueba'}
          izquierda={<IconoFila icon={Send} tono="bg-accent" />}
          titulo={ocupado === 'prueba' ? 'Enviando…' : 'Enviarme una prueba'}
        />
        <FilaBoton
          onClick={onDesactivar}
          disabled={ocupado === 'desactivar'}
          titulo="Dejar de recibirlos aquí"
          peligro
          ultima
          className="justify-center"
        />
      </>
    );
  }

  return (
    <>
      <FilaBoton
        onClick={onActivar}
        disabled={ocupado === 'activar'}
        izquierda={<IconoFila icon={Bell} tono="bg-accent" />}
        titulo={ocupado === 'activar' ? 'Activando…' : 'Activar en este aparato'}
        subtitulo="Un toque y te llega uno de bienvenida"
        ultima={!haySuscritos}
      />
      {haySuscritos && (
        <FilaBoton
          onClick={onPrueba}
          disabled={ocupado === 'prueba'}
          izquierda={<IconoFila icon={Send} tono="bg-muted" />}
          titulo={ocupado === 'prueba' ? 'Enviando…' : 'Enviar una prueba a los demás'}
          ultima
        />
      )}
    </>
  );
}
