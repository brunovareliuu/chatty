'use client';

import Link from 'next/link';
import {
  Bell,
  Copy,
  ExternalLink,
  Heart,
  ImageOff,
  MessageCircle,
  Pencil,
  Trash2,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { mediaThumb } from '@/lib/client/ig-media';
import type { Automation, Flow } from '@/lib/types';
import type { IgMedia } from '@/lib/instagram';
import { cn, relativeTime } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { InstagramIcon } from '@/components/ui/instagram-icon';
import { TRIGGER_LABELS } from './trigger-meta';

const fechaCorta = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

const COINCIDENCIA: Record<string, string> = {
  contains: 'Contiene',
  exact: 'Exacta',
  starts_with: 'Empieza con',
  regex: 'RegEx',
  any: 'Cualquiera',
};

/** Qué hace cada disparador que no vive en un post, en una línea. */
const DESCRIPCION: Partial<Record<Automation['trigger']['type'], string>> = {
  dm_keyword: 'Contesta cuando alguien te escribe la palabra clave por DM.',
  story_reply: 'Contesta a quien responde tus historias.',
  first_message: 'Saluda a quien te escribe por primera vez.',
  default_reply: 'Contesta cuando ninguna otra regla aplica.',
};

/**
 * La tarjeta de la cuadrícula de automatizaciones. Vertical, como las del App
 * Store: la portada arriba (el post que vigila o el disparador) y abajo un
 * grupo estilo Ajustes de iOS, tres cifras y una barra de acciones.
 *
 * Pausada se nota sin leer: la portada pierde el color y la píldora se apaga.
 */
export function TarjetaAutomatizacion({
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
  const t = automation.trigger;
  const activa = automation.enabled;
  const meta = TRIGGER_LABELS[t.type] ?? { label: 'Automatización', icon: Zap };
  const pasos = flow ? flow.nodes.filter((n) => n.type !== 'trigger').length : null;
  const coincidencia = t.matchType ?? 'contains';
  const respuestas = t.publicReplies?.length ? t.publicReplies : t.publicReply ? [t.publicReply] : [];
  const unPost = posts.length === 1 ? posts[0] : undefined;
  const href = `/automations/${automation.id}`;
  const sobreFoto = conFoto(automation, posts, postIdsCount);

  return (
    <article className="group flex flex-col rounded-[26px] border border-border bg-bg p-2 shadow-card transition-shadow duration-300 hover:shadow-xl hover:shadow-black/[0.07]">
      {/* Portada ------------------------------------------------------------ */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-[19px] bg-surface">
        <div
          className={cn(
            'absolute inset-0 transition-[filter,opacity] duration-500',
            !activa && 'opacity-55 grayscale',
          )}
        >
          <Portada automation={automation} posts={posts} postIdsCount={postIdsCount} />
        </div>

        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <PildoraEstado activa={activa} sobreFoto={sobreFoto} />
          {unPost?.permalink && (
            <a
              href={unPost.permalink}
              target="_blank"
              rel="noreferrer"
              className="grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-xl transition hover:bg-black/60"
              title="Abrir la publicación en Instagram"
              aria-label="Abrir la publicación en Instagram"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {unPost && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2.5 rounded-full bg-black/40 px-3 py-1.5 text-[12px] font-medium text-white tabular backdrop-blur-xl">
            {unPost.timestamp && <span>{fechaCorta.format(new Date(unPost.timestamp))}</span>}
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {(unPost.comments_count ?? 0).toLocaleString('es-MX')}
            </span>
            {unPost.like_count !== undefined && (
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {unPost.like_count.toLocaleString('es-MX')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cuerpo ------------------------------------------------------------- */}
      <div className="flex flex-1 flex-col px-2.5 pt-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href={href}
              className="line-clamp-2 text-[17px] font-semibold leading-[1.25] tracking-[-0.015em] text-txt transition-colors hover:text-accent"
              title={automation.name}
            >
              {automation.name}
            </Link>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
              <meta.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <span className="truncate">{meta.label}</span>
              {automation.notificar && (
                <Bell
                  className="h-3.5 w-3.5 shrink-0 text-accent"
                  strokeWidth={2}
                  aria-label="Te avisa al celular"
                >
                  <title>Te avisa al celular cada vez que se dispara</title>
                </Bell>
              )}
            </p>
          </div>
          <Switch
            checked={activa}
            onCheckedChange={onToggle}
            className="mt-0.5"
          />
        </div>

        {/* Grupo estilo Ajustes */}
        <dl className="mt-4 divide-y divide-border overflow-hidden rounded-2xl bg-surface">
          <div className="px-3.5 py-3">
            <dt className="flex items-center justify-between gap-2 text-[12px] text-muted">
              <span>Palabras clave</span>
              <span>
                {COINCIDENCIA[coincidencia] ?? coincidencia}
                {t.caseSensitive && ' · Aa'}
              </span>
            </dt>
            <dd className="mt-2">
              {t.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {t.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-bg px-2.5 py-1 text-[13px] font-medium text-txt shadow-xs shadow-black/5"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-muted">
                  {coincidencia === 'any' ? 'Cualquier mensaje la dispara' : 'Sin palabras clave'}
                </p>
              )}
            </dd>
          </div>

          {respuestas.length > 0 && (
            <div className="px-3.5 py-3">
              <dt className="flex items-center justify-between gap-2 text-[12px] text-muted">
                <span>Respuesta en el comentario</span>
                {respuestas.length > 1 && <span>{respuestas.length} variantes</span>}
              </dt>
              <dd className="mt-1 line-clamp-2 text-[13px] leading-snug text-txt">
                {respuestas[0]}
              </dd>
            </div>
          )}
        </dl>

        {/* Cifras */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-border">
          <Cifra valor={(automation.stats.triggered ?? 0).toLocaleString('es-MX')} etiqueta="Disparos" />
          <Cifra
            valor={automation.stats.lastTriggeredAt ? relativeTime(automation.stats.lastTriggeredAt) : '—'}
            etiqueta="Último"
          />
          <Cifra valor={pasos === null ? '—' : String(pasos)} etiqueta="Pasos" />
        </div>

        {/* Acciones */}
        <div className="mt-auto pt-4">
          <div className="grid grid-cols-3 gap-1 border-t border-border pt-1.5 pb-0.5">
            <Accion icono={Copy} etiqueta="Clonar" onClick={onDuplicate} cargando={isCloning} />
            <Accion icono={Pencil} etiqueta="Editar" href={href} />
            <Accion icono={Trash2} etiqueta="Eliminar" onClick={onDelete} peligro />
          </div>
        </div>
      </div>
    </article>
  );
}

// -----------------------------------------------------------------------------

/** Sobre una foto va de vidrio oscuro; sobre las portadas lisas, blanca. */
function PildoraEstado({ activa, sobreFoto }: { activa: boolean; sobreFoto: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5 text-[12px] font-semibold backdrop-blur-xl',
        sobreFoto ? 'bg-black/40 text-white' : 'bg-bg/85 text-txt shadow-xs shadow-black/5',
      )}
    >
      <span className="relative flex h-2 w-2">
        {activa && <span className="absolute inset-0 animate-ping rounded-full bg-pos opacity-70" />}
        <span className={cn('relative h-2 w-2 rounded-full', activa ? 'bg-pos' : sobreFoto ? 'bg-white/50' : 'bg-faint')} />
      </span>
      {activa ? 'Activa' : 'Pausada'}
    </span>
  );
}

function Cifra({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="min-w-0 px-2 text-center first:pl-0 last:pr-0">
      <p className="truncate text-[20px] font-semibold leading-none tracking-[-0.02em] text-txt tabular">
        {valor}
      </p>
      <p className="mt-1.5 text-[11px] text-muted">{etiqueta}</p>
    </div>
  );
}

function Accion({
  icono: Icono,
  etiqueta,
  onClick,
  href,
  cargando,
  peligro,
}: {
  icono: LucideIcon;
  etiqueta: string;
  onClick?: () => void;
  href?: string;
  cargando?: boolean;
  peligro?: boolean;
}) {
  const clase = cn(
    'flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium text-muted transition-colors disabled:opacity-40',
    peligro ? 'hover:bg-neg/10 hover:text-neg' : 'hover:bg-surface hover:text-txt',
  );
  const icono = (
<Icono className={cn('h-[18px] w-[18px]', cargando && 'animate-pulse')} strokeWidth={1.9} />
  );

  if (href) {
    return (
      <Link href={href} className={clase}>
        {icono}
        {etiqueta}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={cargando} className={clase}>
      {icono}
      {cargando ? 'Clonando…' : etiqueta}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Portadas
// -----------------------------------------------------------------------------

/** Si la portada es una foto de Instagram (y no una de las lisas). */
function conFoto(automation: Automation, posts: IgMedia[], postIdsCount: number): boolean {
  const t = automation.trigger;
  if (t.type !== 'comment_keyword' || postIdsCount === 0) return false;
  return posts.some((p) => mediaThumb(p));
}

function Portada({
  automation,
  posts,
  postIdsCount,
}: {
  automation: Automation;
  posts: IgMedia[];
  postIdsCount: number;
}) {
  const t = automation.trigger;

  if (t.type !== 'comment_keyword') {
    const meta = TRIGGER_LABELS[t.type] ?? { label: 'Automatización', icon: Zap };
    return (
      <PortadaCentrada
        icono={meta.icon}
        titulo={meta.label}
        texto={DESCRIPCION[t.type] ?? 'Contesta sola en Instagram.'}
      />
    );
  }

  if (postIdsCount === 0) {
    return (
      <PortadaCentrada
        icono={InstagramIcon}
        titulo="Todas las publicaciones"
        texto="Cualquier post o reel, nuevo o viejo, la dispara."
        acento
      />
    );
  }

  const conImagen = posts.filter((p) => mediaThumb(p));
  if (conImagen.length === 0) {
    return (
      <PortadaCentrada
        icono={ImageOff}
        titulo={postIdsCount === 1 ? '1 publicación' : `${postIdsCount} publicaciones`}
        texto="La portada no cargó: Instagram cambia sus enlaces cada tanto."
      />
    );
  }

  if (conImagen.length === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mediaThumb(conImagen[0])}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
    );
  }

  // Mosaico: la primera grande a la izquierda, dos apiladas a la derecha.
  const [a, b, c] = conImagen;
  const resto = postIdsCount - (c ? 3 : 2);
  return (
    <div className="grid h-full grid-cols-[3fr_2fr] grid-rows-2 gap-0.5">
      <Mosaico post={a} className="row-span-2" />
      <Mosaico post={b} className={c ? undefined : 'row-span-2'} resto={c ? 0 : resto} />
      {c && <Mosaico post={c} resto={resto} />}
    </div>
  );
}

function Mosaico({ post, className, resto = 0 }: { post: IgMedia; className?: string; resto?: number }) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaThumb(post)} alt="" loading="lazy" className="h-full w-full object-cover" />
      {resto > 0 && (
        <div className="absolute inset-0 grid place-items-center bg-black/50 text-[17px] font-semibold text-white backdrop-blur-sm">
          +{resto}
        </div>
      )}
    </div>
  );
}

function PortadaCentrada({
  icono: Icono,
  titulo,
  texto,
  acento,
}: {
  icono: LucideIcon | typeof InstagramIcon;
  titulo: string;
  texto: string;
  acento?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex h-full flex-col items-center justify-center gap-3 px-8 pt-6 text-center',
        acento ? 'bg-accent-soft' : 'bg-surface',
      )}
    >
      <span className="grid h-14 w-14 place-items-center rounded-[16px] bg-bg text-accent shadow-sm shadow-black/5">
        <Icono className="h-6 w-6" />
      </span>
      <div>
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-txt">{titulo}</p>
        <p className="mx-auto mt-1 max-w-[240px] text-[13px] leading-snug text-muted">{texto}</p>
      </div>
    </div>
  );
}
