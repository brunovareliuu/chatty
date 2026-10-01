'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, LayoutGrid, List, Plus, Search, Trash2, Workflow, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/lib/client/accounts-context';
import { useAutomations, useFlows } from '@/lib/client/firestore-hooks';
import { mediaThumb, useIgMedia, type IgMediaState } from '@/lib/client/ig-media';
import {
  deleteAutomation,
  deleteFlow,
  duplicateAutomation,
  setAutomationEnabled,
} from '@/lib/client/mutations';
import type { Automation, Flow, IgAccount } from '@/lib/types';
import type { IgMedia } from '@/lib/instagram';
import { cn, relativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Punto } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Empty } from '@/components/ui/empty';
import { campoClases } from '@/components/ui/input';
import { Segmentado } from '@/components/ui/segmented';
import { PageHeader } from '@/components/shell/page-header';
import { AutomationDialog } from './automation-dialog';
import { TRIGGER_LABELS, triggerSummary } from './trigger-meta';
import { TarjetaAutomatizacion } from './tarjeta-automatizacion';

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'active' | 'paused' | 'comments' | 'dms';

const FILTROS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'paused', label: 'Pausadas' },
  { value: 'comments', label: 'Comentarios' },
  { value: 'dms', label: 'DMs' },
];

export function AutomationsScreen() {
  const { account } = useAccounts();
  const { data: automations, loading } = useAutomations(account?.id ?? null);
  const { data: flows } = useFlows(account?.id ?? null);
  const media = useIgMedia(account?.id ?? null);

  return (
    <VistaAutomatizaciones
      account={account}
      automations={automations}
      flows={flows}
      loading={loading}
      media={media}
    />
  );
}

/**
 * La pantalla sin las suscripciones: recibe la cuenta, las automatizaciones,
 * los flujos y las publicaciones ya cargados. Las acciones siguen escribiendo
 * en Firestore como siempre.
 */
export function VistaAutomatizaciones({
  account,
  automations,
  flows,
  loading,
  media,
}: {
  account: IgAccount | null;
  automations: Automation[];
  flows: Flow[];
  loading: boolean;
  media: IgMediaState;
}) {
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [cloningId, setCloningId] = useState<string | null>(null);

  // Mapa rápido de posts por ID para cuando media esté listo
  const mediaMap = useMemo(() => {
    const map = new Map<string, IgMedia>();
    if (media.status === 'ready') {
      for (const m of media.media) {
        map.set(m.id, m);
      }
    }
    return map;
  }, [media]);

  // Los flujos que ninguna otra regla usa se van con la automatización.
  const flowsUsedBy = (flowId: string) => automations.filter((a) => a.flowId === flowId);
  const huerfanos = flows.filter((f) => flowsUsedBy(f.id).length === 0);

  // Cálculo de métricas para la barra de KPIs
  const kpis = useMemo(() => {
    const total = automations.length;
    const activas = automations.filter((a) => a.enabled).length;
    const pausadas = total - activas;
    const totalDisparos = automations.reduce((sum, a) => sum + (a.stats?.triggered ?? 0), 0);

    const masActiva = automations.reduce<Automation | null>((max, a) => {
      const actualTrig = a.stats?.triggered ?? 0;
      const maxTrig = max?.stats?.triggered ?? 0;
      return actualTrig > maxTrig && actualTrig > 0 ? a : max;
    }, null);

    const postIdsSet = new Set<string>();
    let allPostsRules = 0;
    for (const a of automations) {
      if (a.trigger.type === 'comment_keyword') {
        if (a.trigger.postIds.length > 0) {
          a.trigger.postIds.forEach((pid) => postIdsSet.add(pid));
        } else {
          allPostsRules++;
        }
      }
    }

    return {
      total,
      activas,
      pausadas,
      totalDisparos,
      masActiva,
      postsAtacados: postIdsSet.size,
      allPostsRules,
    };
  }, [automations]);

  // Filtrado y búsqueda
  const filteredAutomations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return automations.filter((a) => {
      // Filtro de estado / tipo
      if (filter === 'active' && !a.enabled) return false;
      if (filter === 'paused' && a.enabled) return false;
      if (filter === 'comments' && a.trigger.type !== 'comment_keyword') return false;
      if (filter === 'dms' && a.trigger.type === 'comment_keyword') return false;

      // Búsqueda de texto
      if (!q) return true;
      const matchName = a.name.toLowerCase().includes(q);
      const matchKeywords = a.trigger.keywords.some((k) => k.toLowerCase().includes(q));
      const matchTrigger = TRIGGER_LABELS[a.trigger.type]?.label.toLowerCase().includes(q);
      return matchName || matchKeywords || matchTrigger;
    });
  }, [automations, search, filter]);

  if (!account) {
    return (
      <Empty
        icon={Zap}
        title="Conecta una cuenta primero"
        description="Las automatizaciones responden los mensajes de una cuenta de Instagram conectada."
      />
    );
  }

  async function toggle(a: Automation, enabled: boolean) {
    await setAutomationEnabled(account!.id, a.id, a.flowId, enabled);
    toast.success(enabled ? `«${a.name}» activada` : `«${a.name}» pausada`);
  }

  async function handleDuplicate(a: Automation) {
    if (!account) return;
    setCloningId(a.id);
    try {
      const flow = flows.find((f) => f.id === a.flowId);
      const newId = await duplicateAutomation(account.id, a, flow);
      toast.success(`«${a.name}» clonada con éxito (creada pausada)`, {
        action: {
          label: 'Editar copia',
          onClick: () => router.push(`/automations/${newId}`),
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo duplicar la automatización');
    } finally {
      setCloningId(null);
    }
  }

  async function handleDelete(a: Automation) {
    if (!window.confirm(`¿Eliminar «${a.name}»? Dejará de contestar de inmediato.`)) return;
    const compartido = flowsUsedBy(a.flowId).length > 1;
    await deleteAutomation(account!.id, a.id, compartido ? null : a.flowId);
    toast.success(`«${a.name}» eliminada`);
  }

  return (
    <>
      {/* Todo se desplaza junto: el título grande se va hacia arriba como en las apps de Apple. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PageHeader
          title="Automatizaciones"
          description="Configura respuestas instantáneas a comentarios, mensajes directos e historias."
          action={
            <>
              <Segmentado
                value={viewMode}
                onChange={setViewMode}
                opciones={[
                  { value: 'grid', label: 'Cuadrícula', icon: LayoutGrid },
                  { value: 'list', label: 'Lista', icon: List },
                ]}
              />
              {/* En celular solo cabe el «+» junto al segmentado. */}
              <Button
                variant="primary"
                onClick={() => setCreating(true)}
                aria-label="Nueva automatización"
                className="max-sm:w-9 max-sm:px-0"
              >
                <Plus className="h-4 w-4" strokeWidth={2.2} />
                <span className="max-sm:hidden">Nueva automatización</span>
              </Button>
            </>
          }
          toolbar={
            <>
              {/* En celular el riel se desliza de lado en vez de partirse. */}
              <div className="-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 md:mx-0 md:max-w-full md:px-0">
                <Segmentado value={filter} onChange={setFilter} opciones={FILTROS} />
              </div>

              <div className="relative w-full sm:w-[300px]">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, palabra clave…"
                  className={cn(campoClases, 'h-9 pr-9 pl-9')}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute top-1/2 right-2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-fill-strong text-muted transition-colors hover:text-txt"
                    aria-label="Borrar la búsqueda"
                  >
                    <X className="h-3 w-3" strokeWidth={2.6} />
                  </button>
                )}
              </div>
            </>
          }
        />

        <div className="px-pagina pb-12">
          {/* ===================================================================== */}
          {/* CIFRAS: una tarjeta partida en celdas                                  */}
          {/* ===================================================================== */}
          <section className="tarjeta mb-8 grid grid-cols-2 overflow-hidden lg:grid-cols-4">
            <Kpi etiqueta="Automatizaciones">
              <Valor>{kpis.total}</Valor>
              <span className="flex items-center gap-1.5 text-[13px] text-muted">
                <Punto tone={kpis.activas > 0 ? 'pos' : 'neutral'} />
                {kpis.activas} {kpis.activas === 1 ? 'activa' : 'activas'}
              </span>
              <Nota>
                {kpis.pausadas} {kpis.pausadas === 1 ? 'pausada' : 'pausadas'} en reserva
              </Nota>
            </Kpi>

            <Kpi etiqueta="Disparos Totales" className="border-l">
              <Valor>{kpis.totalDisparos.toLocaleString('es-MX')}</Valor>
              <Nota>Mensajes y respuestas automáticas</Nota>
            </Kpi>

            <Kpi etiqueta="Regla Más Activa" className="border-t lg:border-t-0 lg:border-l">
              <p className="truncate pt-2 pb-[3px] text-[17px] font-semibold tracking-[-0.015em] text-txt">
                {kpis.masActiva ? kpis.masActiva.name : 'Sin actividad aún'}
              </p>
              <Nota>
                {kpis.masActiva
                  ? `${kpis.masActiva.stats.triggered.toLocaleString('es-MX')} respuestas enviadas`
                  : 'Se activará al recibir mensajes'}
              </Nota>
            </Kpi>

            <Kpi etiqueta="Posts Monitoreados" className="border-t border-l lg:border-t-0">
              <Valor>
                {kpis.postsAtacados > 0 ? kpis.postsAtacados : kpis.allPostsRules > 0 ? 'Todos' : 0}
              </Valor>
              {kpis.postsAtacados > 0 && <span className="text-[13px] text-muted">publicaciones</span>}
              <Nota>
                {kpis.allPostsRules > 0
                  ? `${kpis.allPostsRules} regla${kpis.allPostsRules > 1 ? 's' : ''} en todas las publicaciones`
                  : 'Con reglas de comentarios'}
              </Nota>
            </Kpi>
          </section>

          {/* ===================================================================== */}
          {/* ESTADOS DE CARGA Y VACÍO                                               */}
          {/* ===================================================================== */}
          {loading && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="tarjeta h-[560px] animate-pulse rounded-[26px] shadow-none" />
              ))}
            </div>
          )}

          {!loading && automations.length === 0 && (
            <div className="tarjeta">
              <Empty
                icon={Zap}
                title="Todavía no hay automatizaciones"
                description="Crea una regla como “si alguien escribe PRECIO, mándale la lista”. Es lo que hace que Chatty conteste solo."
                action={
                  <Button variant="primary" className="mt-1" onClick={() => setCreating(true)}>
                    <Plus className="h-4 w-4" strokeWidth={2.2} />
                    Crear la primera
                  </Button>
                }
              />
            </div>
          )}

          {!loading && automations.length > 0 && filteredAutomations.length === 0 && (
            <div className="tarjeta flex flex-col items-center px-6 py-14 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-fill-soft">
                <Search className="h-5 w-5 text-muted" strokeWidth={1.8} />
              </span>
              <p className="mt-3.5 text-[16px] font-semibold tracking-[-0.012em] text-txt">
                No hay automatizaciones que coincidan con la búsqueda
              </p>
              <p className="mt-1 text-[13.5px] text-muted">
                Prueba cambiando los filtros o borrando el texto de búsqueda.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                }}
              >
                Restablecer filtros
              </Button>
            </div>
          )}

          {/* ===================================================================== */}
          {/* VISTA EN CUADRÍCULA                                                    */}
          {/* ===================================================================== */}
          {!loading && viewMode === 'grid' && filteredAutomations.length > 0 && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredAutomations.map((a) => {
                const flow = flows.find((f) => f.id === a.flowId);
                const postIds = a.trigger.type === 'comment_keyword' ? a.trigger.postIds : [];
                const targetPosts = postIds
                  .map((id) => mediaMap.get(id))
                  .filter((p): p is IgMedia => Boolean(p));

                return (
                  <TarjetaAutomatizacion
                    key={a.id}
                    automation={a}
                    flow={flow}
                    posts={targetPosts}
                    postIdsCount={postIds.length}
                    isCloning={cloningId === a.id}
                    onToggle={(enabled) => toggle(a, enabled)}
                    onDuplicate={() => handleDuplicate(a)}
                    onDelete={() => handleDelete(a)}
                  />
                );
              })}
            </div>
          )}

          {/* ===================================================================== */}
          {/* VISTA EN LISTA: un grupo, como las listas de Ajustes                   */}
          {/* ===================================================================== */}
          {!loading && viewMode === 'list' && filteredAutomations.length > 0 && (
            <div className="tarjeta divide-y divide-hairline overflow-hidden">
              {filteredAutomations.map((a) => {
                const flow = flows.find((f) => f.id === a.flowId);
                const postIds = a.trigger.type === 'comment_keyword' ? a.trigger.postIds : [];
                const firstPost = postIds.length > 0 ? mediaMap.get(postIds[0]) : undefined;

                return (
                  <AutomationRow
                    key={a.id}
                    automation={a}
                    flow={flow}
                    firstPost={firstPost}
                    postCount={postIds.length}
                    isCloning={cloningId === a.id}
                    onToggle={(enabled) => toggle(a, enabled)}
                    onDuplicate={() => handleDuplicate(a)}
                    onDelete={() => handleDelete(a)}
                  />
                );
              })}
            </div>
          )}

          {/* Flujos huérfanos */}
          {huerfanos.length > 0 && <Huerfanos accountId={account.id} flows={huerfanos} />}
        </div>
      </div>

      {creating && (
        <AutomationDialog
          accountId={account.id}
          automation={null}
          nextPriority={automations.length}
          onCreated={(id) => router.push(`/automations/${id}`)}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}

// =============================================================================
// CIFRAS
// =============================================================================

/** Una celda de la tarjeta de cifras. `className` pone los filos que la separan de las vecinas. */
function Kpi({ etiqueta, className, children }: { etiqueta: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('min-w-0 border-hairline px-5 py-4', className)}>
      <p className="truncate text-[13px] font-medium text-muted">{etiqueta}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2">{children}</div>
    </div>
  );
}

function Valor({ children }: { children: React.ReactNode }) {
  return (
    <span className="tabular text-[30px] leading-[1.15] font-semibold tracking-[-0.02em] text-txt">{children}</span>
  );
}

function Nota({ children }: { children: React.ReactNode }) {
  return <p className="mt-0.5 w-full truncate text-[12px] text-faint">{children}</p>;
}

// =============================================================================
// COMPONENTE FILA PARA VISTA DE LISTA
// =============================================================================
function AutomationRow({
  automation,
  flow,
  firstPost,
  postCount,
  isCloning,
  onToggle,
  onDuplicate,
  onDelete,
}: {
  automation: Automation;
  flow?: Flow;
  firstPost?: IgMedia;
  postCount: number;
  isCloning: boolean;
  onToggle: (enabled: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const Icon = TRIGGER_LABELS[automation.trigger.type]?.icon ?? Zap;
  const thumb = firstPost ? mediaThumb(firstPost) : undefined;
  const pasos = flow ? flow.nodes.filter((n) => n.type !== 'trigger').length : 0;

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-fill-soft md:gap-4 md:px-4 md:py-3">
      {/* Vista previa miniatura */}
      <div
        className={cn(
          'relative h-12 w-12 shrink-0 overflow-hidden rounded-[12px] bg-surface',
          !automation.enabled && 'opacity-60 grayscale',
        )}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <Icon className="h-5 w-5 text-accent" strokeWidth={1.9} />
          </div>
        )}
        {postCount > 1 && (
          <span className="absolute inset-x-0 bottom-0 bg-black/50 text-center text-[9px] leading-[14px] font-semibold text-white backdrop-blur-sm">
            +{postCount - 1} posts
          </span>
        )}
      </div>

      {/* Nombre y detalles */}
      <Link href={`/automations/${automation.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-txt transition-colors group-hover:text-accent-ink">
            {automation.name}
          </p>
          <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted">
            <Punto tone={automation.enabled ? 'pos' : 'neutral'} />
            {automation.enabled ? 'Activa' : 'Pausada'}
          </span>
        </div>

        <p className="mt-0.5 truncate text-[13px] text-muted">
          {triggerSummary(automation.trigger)}
          {flow && ` · ${pasos} ${pasos === 1 ? 'paso' : 'pasos'}`}
        </p>
      </Link>

      {/* Disparos */}
      <div className="hidden w-20 shrink-0 text-right sm:block">
        <p className="tabular text-[15px] font-semibold text-txt">
          {(automation.stats.triggered ?? 0).toLocaleString('es-MX')}
        </p>
        <p className="truncate text-[11.5px] text-faint">
          {automation.stats.lastTriggeredAt ? relativeTime(automation.stats.lastTriggeredAt) : 'sin usos'}
        </p>
      </div>

      {/* Acciones */}
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-[12.5px] lg:px-3"
          onClick={onDuplicate}
          loading={isCloning}
          title="Duplicar"
        >
          {!isCloning && <Copy className="h-3.5 w-3.5" />}
          <span className="hidden lg:inline">Clonar</span>
        </Button>

        <button
          type="button"
          onClick={onDelete}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-neg/10 hover:text-neg"
          title={`Eliminar ${automation.name}`}
          aria-label={`Eliminar ${automation.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        <Switch checked={automation.enabled} onCheckedChange={onToggle} className="ml-2" />
      </div>
    </div>
  );
}

// =============================================================================
// FLUJOS HUÉRFANOS
// =============================================================================
function Huerfanos({ accountId, flows }: { accountId: string; flows: Flow[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-txt">Flujos sin automatización vinculada</h2>
      <p className="mt-0.5 text-[13px] text-muted">
        Nadie los dispara actualmente. Puedes borrarlos o reutilizarlos en una nueva regla.
      </p>

      <div className="tarjeta mt-3 divide-y divide-hairline overflow-hidden">
        {flows.map((flow) => (
          <div
            key={flow.id}
            className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-fill-soft md:px-4"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-fill-soft text-muted">
              <Workflow className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <Link href={`/flows/${flow.id}`} className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-txt transition-colors group-hover:text-accent-ink">
                {flow.name}
              </p>
              <p className="text-[12px] text-faint">
                {flow.nodes.filter((n) => n.type !== 'trigger').length} pasos · editado{' '}
                {relativeTime(flow.updatedAt)}
              </p>
            </Link>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(`¿Eliminar el flujo «${flow.name}»?`)) return;
                await deleteFlow(accountId, flow.id);
                toast.success('Flujo eliminado');
              }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-neg/10 hover:text-neg"
              aria-label={`Eliminar ${flow.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
