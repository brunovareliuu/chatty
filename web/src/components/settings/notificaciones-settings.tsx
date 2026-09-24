'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Send, Share, Smartphone, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
  return new Date(ts).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Ajustes › Notificaciones. Tres cosas: prender los avisos en ESTE
 * dispositivo, decidir de qué te avisamos y ver qué ha salido.
 */
export function NotificacionesSettings() {
  const [estado, setEstado] = useState<EstadoPush>('cargando');
  const [endpointActual, setEndpointActual] = useState<string | null>(null);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [ocupado, setOcupado] = useState<'activar' | 'desactivar' | 'prueba' | null>(null);

  async function cargar() {
    const [e, sub, res] = await Promise.all([estadoPush(), suscripcionActual(), fetch('/api/push')]);
    const d = (await res.json()) as Datos;
    return { e, endpoint: sub?.endpoint ?? null, d };
  }

  useEffect(() => {
    let vivo = true;
    cargar()
      .then(({ e, endpoint, d }) => {
        if (!vivo) return;
        setEstado(e);
        setEndpointActual(endpoint);
        setDatos({ ...d, preferencias: completaPreferencias(d.preferencias) });
      })
      .catch(() => toast.error('No se pudo cargar la configuración de avisos'));
    return () => {
      vivo = false;
    };
  }, []);

  async function refrescar() {
    const { e, endpoint, d } = await cargar();
    setEstado(e);
    setEndpointActual(endpoint);
    setDatos({ ...d, preferencias: completaPreferencias(d.preferencias) });
  }

  async function activar() {
    setOcupado('activar');
    try {
      await activarPush();
      toast.success('Avisos activados. Te mandamos uno de bienvenida.');
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
      toast.success('Este dispositivo ya no recibe avisos');
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
      if (r.omitido === 'sin-dispositivos') toast.error('No hay ningún dispositivo suscrito');
      else if (r.enviados === 0) toast.error('No se pudo enviar a ningún dispositivo');
      else toast.success(`Prueba enviada a ${r.enviados} ${r.enviados === 1 ? 'dispositivo' : 'dispositivos'}`);
      await refrescar();
    } finally {
      setOcupado(null);
    }
  }

  async function quitar(d: Dispositivo) {
    if (!confirm(`¿Quitar «${d.nombre}»? Dejará de recibir avisos.`)) return;
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

  async function cambiar(patch: Partial<Preferencias>) {
    if (!datos) return;
    const nuevas = completaPreferencias({ ...datos.preferencias, ...patch });
    setDatos({ ...datos, preferencias: nuevas });
    const res = await fetch('/api/push/preferencias', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevas),
    });
    if (!res.ok) toast.error('No se guardó el cambio');
  }

  const prefs = datos?.preferencias ?? null;

  return (
    <>
      {/* --- Este dispositivo --- */}
      <section className="space-y-3">
        <h2 className="text-[13px] font-bold tracking-[0.4px] text-muted uppercase">Este dispositivo</h2>
        <EsteDispositivo
          estado={estado}
          ocupado={ocupado}
          onActivar={activar}
          onDesactivar={desactivar}
          onPrueba={prueba}
          haySuscritos={(datos?.dispositivos.length ?? 0) > 0}
        />
      </section>

      {/* --- Qué te avisamos --- */}
      <section className="space-y-3">
        <h2 className="text-[13px] font-bold tracking-[0.4px] text-muted uppercase">De qué te avisamos</h2>
        <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {EVENTOS.map((ev) => {
            const prendido = prefs?.eventos[ev.id] ?? false;
            return (
              <div key={ev.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold">{ev.titulo}</p>
                    <p className="text-[12.5px] leading-snug text-muted">{ev.detalle}</p>
                  </div>
                  <Switch
                    checked={prendido}
                    disabled={!prefs}
                    onCheckedChange={(v) => cambiar({ eventos: { ...prefs!.eventos, [ev.id]: v } })}
                  />
                </div>

                {ev.id === 'comentarios' && prendido && prefs && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-[12px] text-muted">Cada</span>
                    {OPCIONES_CADA_COMENTARIOS.map((n) => (
                      <button
                        key={n}
                        onClick={() => cambiar({ cadaComentarios: n })}
                        className={cn(
                          'h-8 min-w-[40px] rounded-full border px-3 text-[13px] font-semibold tabular transition-colors',
                          prefs.cadaComentarios === n
                            ? 'border-accent bg-accent text-accent-fg'
                            : 'border-border bg-bg text-muted hover:text-txt',
                        )}
                        aria-pressed={prefs.cadaComentarios === n}
                      >
                        {n}
                      </button>
                    ))}
                    <span className="text-[12px] text-muted">comentarios</span>
                  </div>
                )}

                {ev.id === 'checkpoint' && prendido && prefs && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {METRICAS_HITO.map((m) => {
                      const on = prefs.hitos[m.id];
                      return (
                        <button
                          key={m.id}
                          onClick={() => cambiar({ hitos: { ...prefs.hitos, [m.id]: !on } })}
                          className={cn(
                            'h-8 rounded-full border px-3 text-[13px] font-semibold transition-colors',
                            on
                              ? 'border-accent bg-accent-soft text-accent'
                              : 'border-border bg-bg text-muted hover:text-txt',
                          )}
                          aria-pressed={on}
                        >
                          {m.titulo}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[12px] leading-relaxed text-faint">
          Las automatizaciones se marcan una por una: abre la automatización y toca la campana junto a «Activa».
        </p>
      </section>

      {/* --- Dispositivos --- */}
      <section className="space-y-3">
        <h2 className="text-[13px] font-bold tracking-[0.4px] text-muted uppercase">Dispositivos suscritos</h2>
        {datos && datos.dispositivos.length === 0 && (
          <div className="rounded-card border border-dashed border-border px-5 py-6 text-center">
            <Smartphone className="mx-auto h-7 w-7 text-faint" />
            <p className="mt-2 text-[14px] font-semibold">Ningún dispositivo todavía</p>
            <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-muted">
              Abre el panel en tu celular y toca «Activar» arriba. Cada teléfono o navegador aparece aquí.
            </p>
          </div>
        )}
        {datos && datos.dispositivos.length > 0 && (
          <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            {datos.dispositivos.map((d) => {
              const esEste = d.endpoint === endpointActual;
              return (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[14px] font-semibold">{d.nombre}</p>
                      {esEste && <Badge tone="accent">Este</Badge>}
                      {d.ultimoError && <Badge tone="neg">Con error</Badge>}
                    </div>
                    <p className="text-[12px] text-muted">
                      Desde el {fecha(d.creadoEn)}
                      {d.ultimoEnvioEn ? ` · último aviso ${fecha(d.ultimoEnvioEn)}` : ' · sin avisos todavía'}
                    </p>
                    {d.ultimoError && <p className="mt-0.5 text-[12px] text-neg">{d.ultimoError}</p>}
                  </div>
                  <button
                    onClick={() => quitar(d)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-neg/10 hover:text-neg"
                    aria-label={`Quitar ${d.nombre}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* --- Historial --- */}
      <section className="space-y-3 pb-6">
        <h2 className="text-[13px] font-bold tracking-[0.4px] text-muted uppercase">Últimos avisos</h2>
        {datos && datos.historial.length === 0 && (
          <p className="text-[13px] text-muted">Todavía no ha salido ninguno.</p>
        )}
        {datos && datos.historial.length > 0 && (
          <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            {datos.historial.map((a) => (
              <div key={a.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold leading-snug">{a.titulo}</p>
                    <p className="mt-0.5 whitespace-pre-line text-[12.5px] leading-snug text-muted">{a.cuerpo}</p>
                  </div>
                  <Badge tone="neutral">{NOMBRE_EVENTO[a.evento] ?? a.evento}</Badge>
                </div>
                <p className="mt-1.5 text-[11.5px] text-faint">
                  {fecha(a.enviadoEn)} · {a.dispositivos} {a.dispositivos === 1 ? 'dispositivo' : 'dispositivos'}
                  {a.fallidos > 0 ? ` · ${a.fallidos} con error` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function EsteDispositivo({
  estado,
  ocupado,
  onActivar,
  onDesactivar,
  onPrueba,
  haySuscritos,
}: {
  estado: EstadoPush;
  ocupado: 'activar' | 'desactivar' | 'prueba' | null;
  onActivar: () => void;
  onDesactivar: () => void;
  onPrueba: () => void;
  haySuscritos: boolean;
}) {
  const tarjeta = 'rounded-card border border-border bg-surface px-4 py-4';

  if (estado === 'cargando') {
    return <div className={cn(tarjeta, 'h-[76px] animate-pulse')} />;
  }

  if (estado === 'ios-sin-instalar') {
    return (
      <div className={cn(tarjeta, 'flex items-start gap-3')}>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Share className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 text-[14px] leading-snug">
          <p className="font-semibold">Primero agrega el panel a tu pantalla de inicio</p>
          <p className="mt-1 text-[13px] text-muted">
            En Safari toca <span className="font-medium text-txt">Compartir</span> →{' '}
            <span className="font-medium text-txt">Agregar a inicio</span>. Abre la app desde ahí y vuelve
            a esta pantalla: aparecerá el botón para activar los avisos. Así funciona el iPhone; no es
            cosa del panel.
          </p>
        </div>
      </div>
    );
  }

  if (estado === 'sin-soporte') {
    return (
      <div className={cn(tarjeta, 'flex items-start gap-3')}>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
          <BellOff className="h-5 w-5" />
        </div>
        <div className="text-[14px] leading-snug">
          <p className="font-semibold">Este navegador no recibe notificaciones</p>
          <p className="mt-1 text-[13px] text-muted">Ábrelo desde tu celular o desde Chrome.</p>
        </div>
      </div>
    );
  }

  if (estado === 'bloqueado') {
    return (
      <div className={cn(tarjeta, 'flex items-start gap-3')}>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neg/10 text-neg">
          <BellOff className="h-5 w-5" />
        </div>
        <div className="text-[14px] leading-snug">
          <p className="font-semibold">Las notificaciones están bloqueadas aquí</p>
          <p className="mt-1 text-[13px] text-muted">
            {esIos()
              ? 'Ve a Ajustes del iPhone → Notificaciones → Chatty y permítelas.'
              : 'Permítelas desde el candado de la barra de direcciones y recarga.'}
          </p>
        </div>
      </div>
    );
  }

  if (estado === 'activo') {
    return (
      <div className={cn(tarjeta, 'flex flex-wrap items-center gap-3')}>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <BellRing className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold">Recibiendo avisos</p>
            <Badge tone="pos">Activo</Badge>
          </div>
          <p className="text-[13px] text-muted">Este dispositivo está suscrito.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="secondary" size="sm" loading={ocupado === 'prueba'} onClick={onPrueba} className="flex-1 sm:flex-none">
            <Send className="h-3.5 w-3.5" />
            Enviar prueba
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={ocupado === 'desactivar'}
            onClick={onDesactivar}
            className="text-neg hover:bg-neg/10 hover:text-neg"
          >
            Desactivar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(tarjeta, 'flex flex-wrap items-center gap-3')}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
        <Bell className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold">Este dispositivo no recibe avisos</p>
        <p className="text-[13px] text-muted">Un toque y te llega uno de bienvenida para comprobarlo.</p>
      </div>
      <div className="flex w-full gap-2 sm:w-auto">
        <Button variant="primary" size="sm" loading={ocupado === 'activar'} onClick={onActivar} className="flex-1 sm:flex-none">
          <BellRing className="h-3.5 w-3.5" />
          Activar aquí
        </Button>
        {haySuscritos && (
          <Button variant="secondary" size="sm" loading={ocupado === 'prueba'} onClick={onPrueba}>
            <Send className="h-3.5 w-3.5" />
            Prueba
          </Button>
        )}
      </div>
    </div>
  );
}
