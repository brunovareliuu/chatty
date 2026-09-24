'use client';

import { Check, ImageOff, MessageCircle } from 'lucide-react';
import { mediaThumb, useIgMedia } from '@/lib/client/ig-media';
import { cn } from '@/lib/utils';

const dateFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

/**
 * Elige en qué publicaciones aplica una automatización de comentarios.
 * Sin ninguna seleccionada aplica a todas; ese es el valor por defecto.
 */
export function PostPicker({
  accountId,
  values,
  onChange,
}: {
  accountId: string;
  values: string[];
  onChange: (postIds: string[]) => void;
}) {
  const state = useIgMedia(accountId);

  function toggle(id: string) {
    onChange(values.includes(id) ? values.filter((v) => v !== id) : [...values, id]);
  }

  if (state.status === 'loading') {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <p className="rounded-xl bg-neg/10 px-3 py-2 text-[13px] leading-snug text-neg">
        {state.message}
      </p>
    );
  }

  if (state.media.length === 0) {
    return <p className="text-[13px] text-muted">Esta cuenta todavía no tiene publicaciones.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[12px] text-muted">
        <span>
          {values.length === 0
            ? 'Aplica a todas las publicaciones'
            : `${values.length} ${values.length === 1 ? 'publicación elegida' : 'publicaciones elegidas'}`}
        </span>
        {values.length > 0 && (
          <button type="button" className="font-medium text-accent" onClick={() => onChange([])}>
            Limpiar
          </button>
        )}
      </div>

      <div className="grid max-h-[300px] grid-cols-4 gap-2 overflow-y-auto pr-1">
        {state.media.map((m) => {
          const selected = values.includes(m.id);
          const src = mediaThumb(m);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              title={m.caption ?? ''}
              className={cn(
                'group relative aspect-square overflow-hidden rounded-xl border bg-surface text-left transition',
                selected ? 'border-accent ring-2 ring-accent/40' : 'border-border hover:border-muted',
              )}
            >
              {src ? (
                // Las URLs del CDN de Meta caducan en horas: no tiene caso optimizarlas.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-faint">
                  <ImageOff className="h-5 w-5" />
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-bg/80 px-1.5 py-1 text-[10px] text-txt backdrop-blur-sm">
                <span>{m.timestamp ? dateFmt.format(new Date(m.timestamp)) : ''}</span>
                <span className="flex items-center gap-0.5">
                  <MessageCircle className="h-3 w-3" />
                  {m.comments_count ?? 0}
                </span>
              </div>

              {selected && (
                <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-fg">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
