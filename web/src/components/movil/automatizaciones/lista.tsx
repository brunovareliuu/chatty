'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BellRing, Plus, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/lib/client/accounts-context';
import { useAutomations } from '@/lib/client/firestore-hooks';
import { mediaThumb, useIgMedia } from '@/lib/client/ig-media';
import { setAutomationEnabled } from '@/lib/client/mutations';
import type { Automation } from '@/lib/types';
import { TRIGGER_LABELS, triggerSummary } from '@/components/automations/trigger-meta';
import { Pantalla, AccionBarra } from '@/components/movil/ui/pantalla';
import { Seccion, Fila, IconoFila } from '@/components/movil/ui/lista';
import { Cargando, Vacio } from '@/components/movil/ui/controles';
import { Switch } from '@/components/ui/switch';
import { HojaNuevaAutomatizacion } from './hoja-nueva';

/**
 * Automatizaciones — la lista de reglas que contestan solas.
 *
 * Cada fila es la regla entera: su marca (la publicación que vigila, o el
 * icono de su disparador), cuándo se dispara y el interruptor que la prende.
 * Tocar la fila abre la automatización; el interruptor se queda donde está,
 * como en Ajustes de iOS.
 */
export function PantallaAutomatizaciones() {
  const router = useRouter();
  const { account, loading: cargandoCuenta } = useAccounts();
  const { data: automatizaciones, loading } = useAutomations(account?.id ?? null);
  const media = useIgMedia(account?.id ?? null);
  const [creando, setCreando] = useState(false);

  async function alternar(a: Automation, activa: boolean) {
    if (!account) return;
    await setAutomationEnabled(account.id, a.id, a.flowId, activa);
    toast.success(activa ? `«${a.name}» activada` : `«${a.name}» pausada`);
  }

  const activas = automatizaciones.filter((a) => a.enabled).length;

  return (
    <Pantalla
      titulo="Automatizaciones"
      descripcion="Cuándo contesta el bot y qué contesta."
      atras={{ etiqueta: 'Atrás' }}
      accion={
        account && (
          <AccionBarra onClick={() => setCreando(true)} aria-label="Nueva automatización">
            <Plus className="h-[22px] w-[22px]" strokeWidth={2.4} />
          </AccionBarra>
        )
      }
    >
      {(cargandoCuenta || (account && loading)) && <Cargando />}

      {!cargandoCuenta && !account && (
        <Vacio
          icon={Zap}
          titulo="Conecta una cuenta primero"
          detalle="Las automatizaciones contestan los mensajes de una cuenta de Instagram conectada."
        />
      )}

      {account && !loading && automatizaciones.length === 0 && (
        <Vacio
          icon={Zap}
          titulo="Todavía no hay ninguna"
          detalle="Una regla es «si alguien comenta PRECIO, mándale la lista». Es lo que hace que conteste solo."
          accion={
            <button
              type="button"
              onClick={() => setCreando(true)}
              className="rounded-full bg-accent px-5 py-2.5 text-[17px] font-semibold text-accent-fg active:opacity-70"
            >
              Crear la primera
            </button>
          }
        />
      )}

      {account && automatizaciones.length > 0 && (
        <Seccion
          titulo={`${automatizaciones.length} ${automatizaciones.length === 1 ? 'regla' : 'reglas'} · ${activas} ${activas === 1 ? 'activa' : 'activas'}`}
          pie="Se evalúan en orden, de arriba abajo: la primera que coincide contesta. El orden se cambia en el panel grande."
        >
          {automatizaciones.map((a, i) => {
            const Icono = TRIGGER_LABELS[a.trigger.type].icon;
            const ids = a.trigger.type === 'comment_keyword' ? a.trigger.postIds : [];
            const post =
              media.status === 'ready' && ids.length > 0
                ? media.media.find((m) => m.id === ids[0])
                : undefined;
            const miniatura = post ? mediaThumb(post) : undefined;

            return (
              <Fila
                key={a.id}
                izquierda={
                  miniatura ? (
                    // Las URLs del CDN de Meta caducan en horas: no gana nada optimizarlas.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={miniatura}
                      alt=""
                      loading="lazy"
                      className="h-[29px] w-[29px] rounded-[7px] object-cover"
                    />
                  ) : (
                    <IconoFila icon={Icono} tono={a.enabled ? 'bg-accent' : 'bg-muted'} />
                  )
                }
                titulo={
                  <>
                    {/* La fila entera abre la automatización; el interruptor se queda fuera. */}
                    <Link
                      href={`/m/automatizaciones/${a.id}`}
                      aria-label={`Abrir ${a.name}`}
                      className="absolute inset-0 active:bg-surface-2"
                    />
                    <span className="block truncate text-[17px] leading-[1.35]">{a.name}</span>
                  </>
                }
                subtitulo={
                  // En dos líneas: el resumen trae el disparador Y las palabras,
                  // y en una sola se corta justo donde empieza lo interesante.
                  <span className="mt-0.5 line-clamp-2 block text-[13px] leading-[1.35] text-muted">
                    {triggerSummary(a.trigger, 3)}
                  </span>
                }
                derecha={
                  <span className="relative z-10 flex shrink-0 items-center gap-2.5">
                    {a.notificar && (
                      <BellRing
                        className="h-[17px] w-[17px] text-accent"
                        strokeWidth={2.2}
                        aria-label="Te avisa al celular"
                      />
                    )}
                    <Switch checked={a.enabled} onCheckedChange={(v) => alternar(a, v)} />
                  </span>
                }
                ultima={i === automatizaciones.length - 1}
              />
            );
          })}
        </Seccion>
      )}

      {account && (
        <HojaNuevaAutomatizacion
          accountId={account.id}
          prioridad={automatizaciones.length}
          abierta={creando}
          onCerrar={() => setCreando(false)}
          onCreada={(id) => {
            setCreando(false);
            router.push(`/m/automatizaciones/${id}`);
          }}
        />
      )}
    </Pantalla>
  );
}
