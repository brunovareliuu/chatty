'use client';

import { toast } from 'sonner';
import { Monitor, Zap } from 'lucide-react';
import { useAccounts } from '@/lib/client/accounts-context';
import { useDoc } from '@/lib/client/firestore-hooks';
import { mediaThumb, useIgMedia } from '@/lib/client/ig-media';
import { setAutomationEnabled, updateAutomation } from '@/lib/client/mutations';
import { aFecha, hace } from '@/lib/movil/datos';
import type { Automation, Flow, FlowNode } from '@/lib/types';
import { TRIGGER_LABELS } from '@/components/automations/trigger-meta';
import { NODE_META, nodeSummary, outputHandles } from '@/components/flow/node-config';
import { Pantalla } from '@/components/movil/ui/pantalla';
import { Seccion, Fila, FilaEnlace, IconoFila } from '@/components/movil/ui/lista';
import { Cargando, Vacio } from '@/components/movil/ui/controles';
import { Switch } from '@/components/ui/switch';
import { etiquetaCoincidencia, etiquetaFrecuencia } from './etiquetas';

/** El cuadrito de color del paso, según de qué grupo de la paleta salga. */
const TONO: Record<string, string> = {
  Mensajes: 'bg-accent',
  Lógica: 'bg-muted',
  Contacto: 'bg-pos',
  Avanzado: 'bg-txt text-bg',
};

type Paso = { nodo: FlowNode; rama: string | null };

/**
 * El flujo, estirado en una lista. El lienzo de nodos se camina siguiendo las
 * aristas desde el disparador; cuando un nodo se parte en dos (una condición,
 * unos botones) cada rama se anota al lado del paso al que lleva.
 *
 * Los nodos que quedaron sueltos también salen al final: esconderlos haría
 * que la lista dijera que el flujo hace menos de lo que guarda.
 */
function pasosEnOrden(flujo: Flow): Paso[] {
  const porId = new Map(flujo.nodes.map((n) => [n.id, n]));
  const vistos = new Set<string>();
  const pasos: Paso[] = [];

  function camina(id: string, rama: string | null) {
    const nodo = porId.get(id);
    if (!nodo || vistos.has(id)) return;
    vistos.add(id);
    if (nodo.type !== 'trigger') pasos.push({ nodo, rama });

    const puertos = outputHandles(nodo.type, nodo.data);
    for (const puerto of puertos) {
      for (const arista of flujo.edges.filter((e) => e.source === id && e.sourceHandle === puerto.id)) {
        camina(arista.target, puertos.length > 1 ? puerto.label : null);
      }
    }
  }

  const inicio = flujo.nodes.find((n) => n.type === 'trigger') ?? flujo.nodes[0];
  if (inicio) camina(inicio.id, null);
  for (const n of flujo.nodes) {
    if (!vistos.has(n.id) && n.type !== 'trigger') pasos.push({ nodo: n, rama: null });
  }
  return pasos;
}

/**
 * Una automatización: cuándo se dispara, si está activa y qué contesta.
 *
 * Los pasos van **en lectura**. Moverlos es arrastrar cajas en un lienzo, que
 * es cosa de ratón: para eso está la última fila, que abre la misma
 * automatización en el panel grande.
 */
export function PantallaAutomatizacion({ id }: { id: string }) {
  const { account, loading: cargandoCuenta } = useAccounts();
  const { data: automatizacion, loading } = useDoc<Automation>(
    account ? `accounts/${account.id}/automations/${id}` : null,
  );
  const { data: flujo } = useDoc<Flow>(
    account && automatizacion ? `accounts/${account.id}/flows/${automatizacion.flowId}` : null,
  );
  const media = useIgMedia(account?.id ?? null);

  if (cargandoCuenta || (account && loading)) {
    return (
      <Pantalla titulo="Automatización" atras={{ href: '/m/automatizaciones', etiqueta: 'Atrás' }}>
        <Cargando />
      </Pantalla>
    );
  }

  if (!account || !automatizacion) {
    return (
      <Pantalla titulo="Automatización" atras={{ href: '/m/automatizaciones', etiqueta: 'Atrás' }}>
        <Vacio
          icon={Zap}
          titulo={account ? 'Esta automatización ya no existe' : 'Conecta una cuenta'}
          detalle={account ? 'Quizá la borraste desde el panel grande.' : undefined}
        />
      </Pantalla>
    );
  }

  const a = automatizacion;
  const disparador = a.trigger;
  const pidePalabras = disparador.type !== 'first_message' && disparador.type !== 'default_reply';
  const ids = disparador.type === 'comment_keyword' ? disparador.postIds : [];
  const portadas =
    media.status === 'ready' ? ids.map((p) => media.media.find((m) => m.id === p)) : [];
  const pasos = flujo ? pasosEnOrden(flujo) : [];
  const ultimaVez = a.stats?.lastTriggeredAt ? hace(aFecha(a.stats.lastTriggeredAt)) : null;

  async function alternarActiva(activa: boolean) {
    await setAutomationEnabled(account!.id, a.id, a.flowId, activa);
    toast.success(activa ? 'Activada' : 'Pausada');
  }

  async function alternarAviso(avisa: boolean) {
    await updateAutomation(account!.id, a.id, { notificar: avisa });
    toast.success(avisa ? 'Te avisamos al celular cuando se dispare' : 'Ya no te avisamos de esta');
  }

  return (
    <Pantalla
      titulo={a.name}
      descripcion={TRIGGER_LABELS[disparador.type].label}
      atras={{ href: '/m/automatizaciones', etiqueta: 'Atrás' }}
    >
      <Seccion pie="«Activa» prende también su flujo: las dos cosas son la misma para quien te escribe.">
        <Fila
          titulo="Activa"
          derecha={<Switch checked={a.enabled} onCheckedChange={alternarActiva} />}
        />
        <Fila
          titulo="Avisarme al celular"
          subtitulo={
            <span className="mt-0.5 block pr-2 text-[13px] leading-[1.35] text-muted">
              Cada vez que se dispare, con quién fue y qué dijo.
            </span>
          }
          derecha={
            <Switch checked={Boolean(a.notificar)} onCheckedChange={alternarAviso} />
          }
          ultima
        />
      </Seccion>

      <Seccion titulo="Cuándo se dispara">
        <Fila titulo="Se dispara con" valor={TRIGGER_LABELS[disparador.type].label} />
        {pidePalabras && (
          <Fila titulo="Coincidencia" valor={etiquetaCoincidencia(disparador.matchType)} />
        )}
        {pidePalabras && disparador.matchType !== 'any' && (
          <Fila
            titulo="Palabras clave"
            subtitulo={
              disparador.keywords.length === 0 ? (
                <span className="mt-0.5 block text-[13px] text-muted">Ninguna todavía</span>
              ) : (
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  {disparador.keywords.map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[15px] font-medium text-accent"
                    >
                      {k}
                    </span>
                  ))}
                </span>
              )
            }
          />
        )}
        {disparador.type === 'comment_keyword' && (
          <Fila
            titulo="Publicaciones"
            valor={
              ids.length === 0
                ? 'Todas'
                : `${ids.length} ${ids.length === 1 ? 'elegida' : 'elegidas'}`
            }
          />
        )}
        <Fila titulo="Frecuencia por contacto" valor={etiquetaFrecuencia(a.cooldownMs)} />
        <Fila
          titulo="Se ha disparado"
          subtitulo={ultimaVez ? `La última vez ${ultimaVez}` : 'Todavía ninguna vez'}
          valor={String(a.stats?.triggered ?? 0)}
          ultima
        />
      </Seccion>

      {ids.length > 0 && portadas.some(Boolean) && (
        <section className="mb-8">
          <h2 className="px-8 pb-1.5 text-[13px] font-normal tracking-[0.03em] text-muted uppercase">
            Las publicaciones que vigila
          </h2>
          <div className="scroll-ios flex gap-2 overflow-x-auto px-4 pb-1">
            {portadas.map((m, i) =>
              m && mediaThumb(m) ? (
                // Las URLs del CDN de Meta caducan en horas: no gana nada optimizarlas.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={m.id}
                  src={mediaThumb(m)}
                  alt=""
                  loading="lazy"
                  className="h-[84px] w-[84px] shrink-0 rounded-card object-cover"
                />
              ) : (
                <div
                  key={ids[i]}
                  className="h-[84px] w-[84px] shrink-0 rounded-card bg-surface-2"
                />
              ),
            )}
          </div>
        </section>
      )}

      <Seccion
        titulo={`El flujo · ${pasos.length} ${pasos.length === 1 ? 'paso' : 'pasos'}`}
        pie="Los pasos se leen aquí y se mueven allá: arrastrar cajas en un lienzo pide ratón."
      >
        {!flujo && <Fila titulo="Cargando el flujo…" ultima />}
        {flujo && pasos.length === 0 && (
          <Fila titulo="El flujo está vacío" subtitulo="No contesta nada todavía" />
        )}
        {pasos.map(({ nodo, rama }, i) => {
          const meta = NODE_META[nodo.type];
          return (
            <Fila
              key={nodo.id}
              izquierda={<IconoFila icon={meta.icon} tono={TONO[meta.group] ?? 'bg-muted'} />}
              titulo={
                <span className="flex items-baseline gap-2">
                  <span className="shrink-0 text-[13px] font-semibold text-faint tabular-nums">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[17px] leading-[1.35]">
                    {meta.label}
                  </span>
                </span>
              }
              subtitulo={
                <span className="mt-0.5 line-clamp-2 block text-[13px] leading-[1.35] text-muted">
                  {nodeSummary(nodo.type, nodo.data)}
                </span>
              }
              valor={rama ?? undefined}
            />
          );
        })}
        <FilaEnlace
          href={`/automations/${a.id}`}
          izquierda={<IconoFila icon={Monitor} tono="bg-muted" />}
          titulo="Editar el flujo en el panel grande"
          ultima
        />
      </Seccion>
    </Pantalla>
  );
}
