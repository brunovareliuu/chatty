'use client';

import { useEffect, useState } from 'react';
import type { IgMedia } from '@/lib/instagram';

export type IgMediaState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; media: IgMedia[] };

/**
 * Publicaciones de la cuenta, por `/api/ig/media`. Las usan el selector de
 * posts y la lista de automatizaciones (la miniatura de cada regla).
 */
export function useIgMedia(accountId: string | null): IgMediaState {
  const [state, setState] = useState<IgMediaState>({ status: 'loading' });

  useEffect(() => {
    if (!accountId) return;
    const ctrl = new AbortController();
    fetch(`/api/ig/media?accountId=${encodeURIComponent(accountId)}`, { signal: ctrl.signal })
      .then(async (res) => {
        const body = (await res.json()) as { media?: IgMedia[]; error?: string };
        if (!res.ok || !body.media) throw new Error(body.error ?? 'No se pudieron cargar');
        setState({ status: 'ready', media: body.media });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setState({ status: 'error', message: err instanceof Error ? err.message : 'Error' });
      });
    return () => ctrl.abort();
  }, [accountId]);

  return state;
}

/** La imagen de un post: los videos traen la portada en `thumbnail_url`. */
export function mediaThumb(m: IgMedia): string | undefined {
  return m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url;
}
