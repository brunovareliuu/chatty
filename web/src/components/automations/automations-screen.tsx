'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  Copy,
  ExternalLink,
  Flame,
  Heart,
  ImageOff,
  LayoutGrid,
  List,
  MessageCircle,
  MessageSquare,
  MousePointerClick,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Workflow,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/lib/client/accounts-context';
import { useAutomations, useFlows } from '@/lib/client/firestore-hooks';
import { mediaThumb, useIgMedia } from '@/lib/client/ig-media';
import {
  deleteAutomation,
  deleteFlow,
  duplicateAutomation,
  setAutomationEnabled,
} from '@/lib/client/mutations';
import type { Automation, Flow } from '@/lib/types';
import type { IgMedia } from '@/lib/instagram';
import { cn, relativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Empty } from '@/components/ui/empty';
import { InstagramIcon } from '@/components/ui/instagram-icon';
import { PageHeader } from '@/components/shell/page-header';
import { AutomationDialog } from './automation-dialog';
import { TRIGGER_LABELS, triggerSummary } from './trigger-meta';

const dateFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

const MATCH_LABELS: Record<string, string> = {
  contains: 'Contiene',
  exact: 'Exacto',
  starts_with: 'Empieza con',
  regex: 'RegEx',
  any: 'Cualquier mensaje',
};

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'active' | 'paused' | 'comments' | 'dms';

export function AutomationsScreen() {
  const router = useRouter();
  const { account } = useAccounts();
  const { data: automations, loading } = useAutomations(account?.id ?? null);
  const { data: flows } = useFlows(account?.id ?? null);
  const media = useIgMedia(account?.id ?? null);

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
      <PageHeader
        title="Automatizaciones"
        description="Configura respuestas instantáneas a comentarios, mensajes directos e historias."
        action={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Nueva automatización
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
        {/* ========================================================================= */}
        {/* BARRA DE KPIS SUPERIOR                                                    */}
        {/* ========================================================================= */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {/* KPI 1: Total & Estado */}
          <div className="relative overflow-hidden rounded-[18px] border border-border bg-surface p-4 transition-all hover:border-accent/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Automatizaciones
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent">
                <Zap className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-black tracking-tight text-txt tabular">{kpis.total}</p>
              <span className="text-[12px] font-medium text-pos">
                {kpis.activas} {kpis.activas === 1 ? 'activa' : 'activas'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-faint">
              {kpis.pausadas} {kpis.pausadas === 1 ? 'pausada' : 'pausadas'} en reserva
            </p>
          </div>

          {/* KPI 2: Total Disparos */}
          <div className="relative overflow-hidden rounded-[18px] border border-border bg-surface p-4 transition-all hover:border-accent/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Disparos Totales
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-pos/15 text-pos">
                <Flame className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-black tracking-tight text-txt tabular">
                {kpis.totalDisparos.toLocaleString('es-MX')}
              </p>
            </div>
            <p className="mt-1 truncate text-[11px] text-faint">
              Mensajes y respuestas automáticas
            </p>
          </div>

          {/* KPI 3: Regla Más Activa */}
          <div className="relative overflow-hidden rounded-[18px] border border-border bg-surface p-4 transition-all hover:border-accent/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Regla Más Activa
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-warn/15 text-warn">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="truncate text-[15px] font-bold text-txt">
                {kpis.masActiva ? kpis.masActiva.name : 'Sin actividad aún'}
              </p>
            </div>
            <p className="mt-1 truncate text-[11px] text-faint">
              {kpis.masActiva
                ? `${kpis.masActiva.stats.triggered} respuestas enviadas`
                : 'Se activará al recibir mensajes'}
            </p>
          </div>

          {/* KPI 4: Publicaciones Monitoreadas */}
          <div className="relative overflow-hidden rounded-[18px] border border-border bg-surface p-4 transition-all hover:border-accent/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Posts Monitoreados
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-surface-2 text-txt">
                <InstagramIcon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-black tracking-tight text-txt tabular">
                {kpis.postsAtacados > 0 ? kpis.postsAtacados : kpis.allPostsRules > 0 ? 'Todos' : 0}
              </p>
              {kpis.postsAtacados > 0 && (
                <span className="text-[12px] font-medium text-muted">publicaciones</span>
              )}
            </div>
            <p className="mt-1 truncate text-[11px] text-faint">
              {kpis.allPostsRules > 0
                ? `${kpis.allPostsRules} regla${kpis.allPostsRules > 1 ? 's' : ''} en todas las publicaciones`
                : 'Con reglas de comentarios'}
            </p>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* BARRA DE HERRAMIENTAS: Búsqueda, Filtros y Modo de Vista                  */}
        {/* ========================================================================= */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {/* Buscador */}
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, palabra clave…"
                className="h-9 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-[13px] text-txt placeholder:text-muted transition focus:border-accent focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted hover:text-txt"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filtros rápidos */}
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {(
                [
                  { id: 'all', label: 'Todas' },
                  { id: 'active', label: 'Activas' },
                  { id: 'paused', label: 'Pausadas' },
                  { id: 'comments', label: 'Comentarios' },
                  { id: 'dms', label: 'DMs' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-colors',
                    filter === tab.id
                      ? 'bg-txt text-bg'
                      : 'bg-surface text-muted hover:bg-surface-2 hover:text-txt',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selector de modo: Cuadrícula (cuadrados) vs Lista */}
          <div className="flex items-center gap-1 self-end sm:self-auto">
            <div className="flex items-center rounded-xl border border-border bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition',
                  viewMode === 'grid'
                    ? 'bg-accent text-accent-fg shadow-sm'
                    : 'text-muted hover:text-txt',
                )}
                title="Vista en tarjetas grandes (cuadrados)"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Cuadrícula</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition',
                  viewMode === 'list'
                    ? 'bg-accent text-accent-fg shadow-sm'
                    : 'text-muted hover:text-txt',
                )}
                title="Vista de lista"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Lista</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ESTADOS DE CARGA Y VACÍO                                                  */}
        {/* ========================================================================= */}
        {loading && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[340px] animate-pulse rounded-[20px] border border-border bg-surface-2/60"
              />
            ))}
          </div>
        )}

        {!loading && automations.length === 0 && (
          <Empty
            icon={Zap}
            title="Todavía no hay automatizaciones"
            description="Crea una regla como “si alguien escribe PRECIO, mándale la lista”. Es lo que hace que Chatty conteste solo."
            action={
              <Button variant="primary" className="mt-1" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                Crear la primera
              </Button>
            }
          />
        )}

        {!loading && automations.length > 0 && filteredAutomations.length === 0 && (
          <div className="rounded-[20px] border border-border bg-surface px-6 py-12 text-center">
            <p className="text-[15px] font-medium text-txt">
              No hay automatizaciones que coincidan con la búsqueda
            </p>
            <p className="mt-1 text-[13px] text-muted">
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

        {/* ========================================================================= */}
        {/* VISTA EN CUADRÍCULA ("CUADRADOS" GRANDES HORIZONTALES)                    */}
        {/* ========================================================================= */}
        {!loading && viewMode === 'grid' && filteredAutomations.length > 0 && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {filteredAutomations.map((a) => {
              const flow = flows.find((f) => f.id === a.flowId);
              const postIds = a.trigger.type === 'comment_keyword' ? a.trigger.postIds : [];
              const targetPosts = postIds
                .map((id) => mediaMap.get(id))
                .filter((p): p is IgMedia => Boolean(p));

              return (
                <AutomationCard
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

        {/* ========================================================================= */}
        {/* VISTA EN LISTA ALTERNATIVA                                                */}
        {/* ========================================================================= */}
        {!loading && viewMode === 'list' && filteredAutomations.length > 0 && (
          <div className="space-y-2.5">
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
// COMPONENTE TARJETA ("CUADRADO") DE AUTOMATIZACIÓN
// =============================================================================
function AutomationCard({
  automation,
  flow,
  posts,
  postIdsCount,
  isCloning,
  onToggle,
  onDuplicate,
  onDelete,
}: {
  automation: Automation;
  flow?: Flow;
  posts: IgMedia[];
  postIdsCount: number;
  isCloning: boolean;
  onToggle: (enabled: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const pasos = flow ? flow.nodes.filter((n) => n.type !== 'trigger').length : 0;
  const isCommentTrigger = automation.trigger.type === 'comment_keyword';
  const hasKeywords = automation.trigger.keywords.length > 0;
  const matchType = automation.trigger.matchType ?? 'contains';

  return (
    <div className="group relative flex flex-col sm:flex-row overflow-hidden rounded-[20px] border border-border bg-surface transition-all duration-200 hover:border-accent/40 hover:shadow-xl hover:shadow-black/5">
      {/* --------------------------------------------------------------------- */}
      {/* CABECERA VISUAL: EL POST / POSTS ATACADOS EN LA IZQUIERDA             */}
      {/* --------------------------------------------------------------------- */}
      <div className="w-full sm:w-[200px] shrink-0 border-b border-border sm:border-b-0 sm:border-r">
        {isCommentTrigger ? (
          <CommentPostHeader posts={posts} totalSelectedIds={postIdsCount} />
        ) : (
          <DirectTriggerHeader triggerType={automation.trigger.type} />
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* CUERPO DE LA TARJETA                                                  */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col justify-between p-4 sm:p-5">
        <div className="space-y-3.5">
          {/* Fila del Título y Estado Switch */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link
                href={`/automations/${automation.id}`}
                className="group/link flex items-center gap-1.5"
              >
                <h3 className="truncate text-[16px] font-bold text-txt group-hover/link:text-accent">
                  {automation.name}
                </h3>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition group-hover/link:opacity-100" />
              </Link>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge tone={automation.enabled ? 'pos' : 'neutral'}>
                  {automation.enabled ? 'Activa' : 'Pausada'}
                </Badge>
                <span className="text-[12px] text-muted">
                  {flow && `${pasos} ${pasos === 1 ? 'paso' : 'pasos'}`}
                </span>
                {automation.notificar && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent"
                    title="Aviso push al celular configurado"
                  >
                    Aviso móvil
                  </span>
                )}
              </div>
            </div>

            {/* Switch rápido de activación */}
            <div className="shrink-0 pt-0.5">
              <Switch checked={automation.enabled} onCheckedChange={onToggle} />
            </div>
          </div>

          {/* Palabras Clave y Coincidencia */}
          <div className="rounded-xl border border-border/80 bg-surface-2/50 p-2.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-muted">
              <span>Palabras clave ({MATCH_LABELS[matchType] ?? matchType})</span>
              {automation.trigger.caseSensitive && (
                <span className="text-accent">Mayúsculas activadas</span>
              )}
            </div>

            {hasKeywords ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {automation.trigger.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-lg border border-border bg-surface px-2 py-0.5 text-[12px] font-bold text-txt shadow-2xs"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[12px] italic text-muted">
                {matchType === 'any'
                  ? 'Cualquier comentario activa la regla'
                  : 'Sin palabras clave configuradas'}
              </p>
            )}

            {/* Respuesta pública si existe */}
            {automation.trigger.publicReplies && automation.trigger.publicReplies.length > 0 && (
              <div className="mt-2 border-t border-border/60 pt-2">
                <p className="line-clamp-1 text-[11px] text-faint">
                  💬 Comentario público:{' '}
                  <span className="italic text-muted">
                    «{automation.trigger.publicReplies[0]}»
                  </span>
                  {automation.trigger.publicReplies.length > 1 &&
                    ` (+${automation.trigger.publicReplies.length - 1} variantes)`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* PIE DE LA TARJETA: Estadísticas y Botones de Acción                 */}
        {/* ------------------------------------------------------------------- */}
        <div className="mt-4 border-t border-border pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Métricas de disparo */}
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[16px] font-black tabular text-txt">
                  {(automation.stats.triggered ?? 0).toLocaleString('es-MX')}
                </span>
                <span className="text-[11px] text-muted">disparos</span>
              </div>
              <span className="block truncate text-[11px] text-faint">
                {automation.stats.lastTriggeredAt
                  ? `Último ${relativeTime(automation.stats.lastTriggeredAt)}`
                  : 'Sin ejecuciones'}
              </span>
            </div>

            {/* Acciones: Clonar, Editar y Borrar */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-2.5 text-[12px]"
                onClick={onDuplicate}
                loading={isCloning}
                title="Duplicar esta automatización y su flujo"
              >
                {!isCloning && <Copy className="h-3.5 w-3.5" />}
                <span>Clonar</span>
              </Button>

              <Link href={`/automations/${automation.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-[12px]"
                  title="Editar en el constructor de flujos"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Editar</span>
                </Button>
              </Link>

              <button
                type="button"
                onClick={onDelete}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-neg/10 hover:text-neg"
                title={`Eliminar ${automation.name}`}
                aria-label={`Eliminar ${automation.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CABECERA VISUAL: POSTS ATACADOS EN TAMAÑO GRANDE
// =============================================================================
function CommentPostHeader({
  posts,
  totalSelectedIds,
}: {
  posts: IgMedia[];
  totalSelectedIds: number;
}) {
  // Caso 1: Aplica a TODAS las publicaciones (no hay IDs seleccionados)
  if (totalSelectedIds === 0) {
    return (
      <div className="relative flex h-full min-h-[160px] flex-col justify-between overflow-hidden bg-gradient-to-br from-accent/20 via-surface-2 to-surface p-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-surface/80 px-2.5 py-1 text-[11px] font-bold text-accent shadow-xs backdrop-blur-md">
            <InstagramIcon className="h-3.5 w-3.5" />
            Todas las publicaciones
          </span>
          <MousePointerClick className="h-4 w-4 text-accent/60" />
        </div>

        <div className="space-y-1 mt-6">
          <p className="text-[13px] font-bold text-txt">
            Vigila todo el contenido de Instagram
          </p>
          <p className="text-[12px] leading-snug text-muted">
            Cualquier post o reel nuevo o pasado activa esta respuesta al recibir la palabra clave.
          </p>
        </div>
      </div>
    );
  }

  // Caso 2: Se seleccionó exactamente 1 publicación -> Vista de portada grande
  if (posts.length === 1 || (posts.length === 0 && totalSelectedIds === 1)) {
    const p = posts[0];
    const src = p ? mediaThumb(p) : undefined;

    return (
      <div className="relative h-full min-h-[180px] w-full overflow-hidden bg-surface-2">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-faint">
            <ImageOff className="h-7 w-7" />
            <span className="text-[11px]">Post ID: {totalSelectedIds} vinculado</span>
          </div>
        )}

        {/* Gradiente oscuro para máxima legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

        {/* Badge superior */}
        <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md">
            <InstagramIcon className="h-3 w-3" />
            {p?.media_type === 'VIDEO' ? 'Reel / Video' : 'Post de Instagram'}
          </span>

          {p?.permalink && (
            <a
              href={p.permalink}
              target="_blank"
              rel="noreferrer"
              className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white/80 transition hover:bg-black hover:text-white"
              title="Abrir publicación en Instagram"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Metadatos inferiores del post */}
        <div className="absolute inset-x-3 bottom-2.5 space-y-1 text-white">
          {p?.caption && (
            <p className="line-clamp-1 text-[12px] font-medium leading-tight text-white/90">
              {p.caption}
            </p>
          )}
          <div className="flex items-center gap-3 text-[11px] text-white/75">
            {p?.timestamp && <span>{dateFmt.format(new Date(p.timestamp))}</span>}
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {p?.comments_count ?? 0} comentarios
            </span>
            {p?.like_count !== undefined && (
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {p.like_count}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Caso 3: Dos o más publicaciones -> Collage / Mosaico visual amplio
  const first = posts[0];
  const second = posts[1];
  const remaining = totalSelectedIds - 2;

  return (
    <div className="relative h-full min-h-[180px] bg-surface-2">
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1 p-1 sm:grid-cols-1 sm:grid-rows-2">
        {/* Post 1 */}
        <div className="relative h-full overflow-hidden rounded-xl bg-surface">
          {first && mediaThumb(first) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaThumb(first)!}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full place-items-center text-faint">
              <InstagramIcon className="h-5 w-5" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-[10px] text-white">
            <span className="flex items-center gap-1 font-medium">
              <MessageCircle className="h-3 w-3" />
              {first?.comments_count ?? 0}
            </span>
          </div>
        </div>

        {/* Post 2 (o más) */}
        <div className="relative h-full overflow-hidden rounded-xl bg-surface">
          {second && mediaThumb(second) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaThumb(second)!}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full place-items-center text-faint">
              <InstagramIcon className="h-5 w-5" />
            </div>
          )}

          {remaining > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 font-bold text-white backdrop-blur-xs">
              <span className="text-[14px]">+{remaining} más</span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-[10px] text-white">
            <span className="flex items-center gap-1 font-medium">
              <MessageCircle className="h-3 w-3" />
              {second?.comments_count ?? 0}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute left-3 top-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
          <InstagramIcon className="h-3 w-3" />
          {totalSelectedIds} publicaciones atacadas
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// CABECERA VISUAL PARA DISPARADORES DE MENSAJERÍA DIRECTA (DM, HISTORIA, ETC.)
// =============================================================================
function DirectTriggerHeader({ triggerType }: { triggerType: Automation['trigger']['type'] }) {
  const meta = TRIGGER_LABELS[triggerType] ?? {
    label: 'Automatización',
    icon: Zap,
  };
  const Icon = meta.icon;

  const config: Record<string, { gradient: string; iconColor: string; badge: string; desc: string }> = {
    dm_keyword: {
      gradient: 'from-accent/15 via-surface-2 to-surface',
      iconColor: 'text-accent',
      badge: 'Mensajes Directos (DM)',
      desc: 'Responde cuando un usuario envía un mensaje privado con la palabra clave.',
    },
    story_reply: {
      gradient: 'from-accent/10 via-surface-2 to-surface',
      iconColor: 'text-accent',
      badge: 'Respuesta a Historia',
      desc: 'Responde automáticamente a interacciones en tus historias activas.',
    },
    first_message: {
      gradient: 'from-accent/15 via-surface-2 to-surface',
      iconColor: 'text-accent',
      badge: 'Primer Mensaje',
      desc: 'Saluda y guía al usuario la primera vez que abre conversación contigo.',
    },
    default_reply: {
      gradient: 'from-surface-2 via-surface-2 to-surface',
      iconColor: 'text-muted',
      badge: 'Respuesta por Defecto',
      desc: 'Contesta cuando ningún otro disparador o palabra clave coincide.',
    },
  };

  const item = config[triggerType] ?? {
    gradient: 'from-accent/15 via-surface-2 to-surface',
    iconColor: 'text-accent',
    badge: meta.label,
    desc: 'Regla de automatización programada para responder en Instagram.',
  };

  return (
    <div
      className={cn(
        'relative flex h-full min-h-[160px] flex-col justify-between overflow-hidden bg-gradient-to-br p-4',
        item.gradient,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-2.5 py-0.5 text-[11px] font-bold text-txt shadow-2xs backdrop-blur-md">
          <Icon className={cn('h-3.5 w-3.5', item.iconColor)} strokeWidth={2.2} />
          {item.badge}
        </span>
        <div className="grid h-7 w-7 place-items-center rounded-full bg-surface/50 text-muted">
          <MessageSquare className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="space-y-0.5">
        <p className="text-[12px] font-medium leading-snug text-muted">{item.desc}</p>
      </div>
    </div>
  );
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
    <div className="group flex items-center gap-3 rounded-card border border-border bg-surface p-3 transition-colors hover:border-accent/40 md:gap-4 md:px-4 md:py-3.5">
      {/* Vista previa miniatura */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-accent-soft">
            <Icon className="h-5 w-5 text-accent" strokeWidth={2} />
          </div>
        )}
        {postCount > 1 && (
          <span className="absolute inset-x-0 bottom-0 bg-bg/85 text-center text-[9px] font-bold text-txt backdrop-blur-xs">
            +{postCount - 1} posts
          </span>
        )}
      </div>

      {/* Nombre y detalles */}
      <Link href={`/automations/${automation.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-txt group-hover:text-accent">
            {automation.name}
          </p>
          <Badge tone={automation.enabled ? 'pos' : 'neutral'} className="shrink-0">
            {automation.enabled ? 'Activa' : 'Pausada'}
          </Badge>
        </div>

        <p className="mt-0.5 truncate text-[13px] text-muted">
          {triggerSummary(automation.trigger)}
          {flow && ` · ${pasos} ${pasos === 1 ? 'paso' : 'pasos'}`}
        </p>
      </Link>

      {/* Disparos */}
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-[15px] font-semibold tabular text-txt">
          {automation.stats.triggered ?? 0}
        </p>
        <p className="text-[11px] text-faint">
          {automation.stats.lastTriggeredAt
            ? relativeTime(automation.stats.lastTriggeredAt)
            : 'sin usos'}
        </p>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-[12px] text-muted hover:text-txt"
          onClick={onDuplicate}
          loading={isCloning}
          title="Duplicar"
        >
          {!isCloning && <Copy className="h-3.5 w-3.5" />}
          <span className="hidden lg:inline">Clonar</span>
        </Button>

        <button
          onClick={onDelete}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-neg/10 hover:text-neg"
          title={`Eliminar ${automation.name}`}
          aria-label={`Eliminar ${automation.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        <Switch checked={automation.enabled} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}

// =============================================================================
// FLUJOS HUÉRFANOS
// =============================================================================
function Huerfanos({ accountId, flows }: { accountId: string; flows: Flow[] }) {
  return (
    <section className="mt-8 border-t border-border pt-6">
      <h2 className="text-[13px] font-semibold text-muted">Flujos sin automatización vinculada</h2>
      <p className="mt-0.5 text-[12px] text-faint">
        Nadie los dispara actualmente. Puedes borrarlos o reutilizarlos en una nueva regla.
      </p>

      <div className="mt-3 space-y-2">
        {flows.map((flow) => (
          <div
            key={flow.id}
            className="group flex items-center gap-3 rounded-card border border-dashed border-border bg-surface/60 px-3 py-3 md:px-4"
          >
            <Workflow className="h-4 w-4 shrink-0 text-faint" />
            <Link href={`/flows/${flow.id}`} className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-txt hover:text-accent">
                {flow.name}
              </p>
              <p className="text-[12px] text-faint">
                {flow.nodes.filter((n) => n.type !== 'trigger').length} pasos · editado{' '}
                {relativeTime(flow.updatedAt)}
              </p>
            </Link>
            <button
              onClick={async () => {
                if (!window.confirm(`¿Eliminar el flujo «${flow.name}»?`)) return;
                await deleteFlow(accountId, flow.id);
                toast.success('Flujo eliminado');
              }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-neg/10 hover:text-neg"
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
