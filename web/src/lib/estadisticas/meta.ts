/**
 * Qué se le pide a Meta y cómo se lee lo que contesta. Sin Firebase ni
 * `server-only`: lo usa el recolector (`servidor.ts`) y lo cubren las pruebas
 * (`scripts/estadisticas-test.ts`) con las respuestas de la documentación.
 */

import type { IgInsight, IgMedia } from '../instagram';
import type { Desglose, DiaIg, MetricasPost, TipoPost } from './tipos';

/**
 * El error de Meta visto por su bandera, no por su clase: `InstagramApiError`
 * vive junto al token (`server-only`) y las pruebas no pueden importarlo.
 */
export function esParametroInvalido(err: unknown): boolean {
  return Boolean((err as { isInvalidParameter?: boolean } | null)?.isInvalidParameter);
}

// ---------------------------------------------------------------------------
// Qué se le pide a Meta
// ---------------------------------------------------------------------------

/** Por día. Todas aceptan `period=day` con `metric_type=total_value`. */
export const METRICAS_DIA = [
  'views',
  'reach',
  'accounts_engaged',
  'total_interactions',
  'likes',
  'comments',
  'saves',
  'shares',
  'replies',
  'profile_links_taps',
  'reposts',
];

export const A_DIA: Record<string, keyof DiaIg> = {
  views: 'vistas',
  reach: 'alcance',
  accounts_engaged: 'cuentasInteraccion',
  total_interactions: 'interacciones',
  likes: 'likes',
  comments: 'comentarios',
  saves: 'guardados',
  shares: 'compartidos',
  replies: 'respuestas',
  profile_links_taps: 'toquesEnlace',
  reposts: 'reposts',
};

export type GrupoPost = 'REELS' | 'FEED' | 'STORY';

/** Meta rechaza la llamada entera si una métrica no aplica al tipo de post. */
export const METRICAS_POST: Record<GrupoPost, string[]> = {
  REELS: [
    'views',
    'reach',
    'likes',
    'comments',
    'saved',
    'shares',
    'total_interactions',
    'ig_reels_avg_watch_time',
    'ig_reels_video_view_total_time',
    'reels_skip_rate',
    'reposts',
  ],
  FEED: [
    'views',
    'reach',
    'likes',
    'comments',
    'saved',
    'shares',
    'total_interactions',
    'profile_visits',
    'follows',
    'reposts',
  ],
  STORY: ['views', 'reach', 'replies', 'shares', 'total_interactions', 'follows', 'profile_visits', 'reposts'],
};

export const A_POST: Record<string, keyof MetricasPost> = {
  views: 'vistas',
  reach: 'alcance',
  likes: 'likes',
  comments: 'comentarios',
  saved: 'guardados',
  shares: 'compartidos',
  total_interactions: 'interacciones',
  profile_visits: 'visitasPerfil',
  follows: 'seguidos',
  reposts: 'reposts',
  replies: 'respuestas',
  ig_reels_avg_watch_time: 'promedioVistoMs',
  ig_reels_video_view_total_time: 'tiempoVistoMs',
  reels_skip_rate: 'tasaSalto',
};

export const DEMOGRAFIAS = [
  ['follower_demographics', 'seguidores'],
  ['engaged_audience_demographics', 'interaccion'],
] as const;

export const CORTES = [
  ['age', 'edad'],
  ['gender', 'genero'],
  ['city', 'ciudad'],
  ['country', 'pais'],
] as const;

export const TIMEFRAMES = ['last_90_days', 'last_30_days', 'this_month'];

export function grupoDe(m: IgMedia): GrupoPost {
  if (m.media_product_type === 'STORY') return 'STORY';
  if (m.media_product_type === 'REELS') return 'REELS';
  return 'FEED';
}

export function tipoDe(m: IgMedia): TipoPost {
  if (m.media_product_type === 'REELS') return 'reel';
  if (m.media_type === 'CAROUSEL_ALBUM') return 'carrusel';
  if (m.media_type === 'VIDEO') return 'video';
  return 'foto';
}

export function valorDe(i: IgInsight): number | null {
  if (typeof i.total_value?.value === 'number') return i.total_value.value;
  const v = i.values?.[0]?.value;
  return typeof v === 'number' ? v : null;
}

export function desgloseDe(i: IgInsight, dimension: string): Desglose | null {
  for (const b of i.total_value?.breakdowns ?? []) {
    const k = b.dimension_keys.indexOf(dimension);
    if (k === -1) continue;
    const r: Desglose = {};
    for (const x of b.results) {
      const clave = x.dimension_values[k];
      if (clave) r[clave] = (r[clave] ?? 0) + x.value;
    }
    return r;
  }
  return null;
}


// ---------------------------------------------------------------------------
// Pedir métricas sin que una mala tumbe las demás
// ---------------------------------------------------------------------------

export type Pedido = (metricas: string[]) => Promise<IgInsight[]>;

/**
 * Pide varias métricas en una llamada. Si Meta rechaza una (código 100), la
 * llamada entera falla: entonces se piden de una en una y las que no existen
 * se vetan. Si fallan TODAS, el problema no son las métricas (un periodo que
 * Meta ya no da, por ejemplo) y el error sube tal cual.
 */
export async function pedirMetricas(pedir: Pedido, metricas: string[], vetadas: Set<string>): Promise<IgInsight[]> {
  const lista = metricas.filter((m) => !vetadas.has(m));
  if (!lista.length) return [];
  try {
    return await pedir(lista);
  } catch (err) {
    if (!esParametroInvalido(err) || lista.length === 1) throw err;
    const datos: IgInsight[] = [];
    const rechazadas: string[] = [];
    for (const m of lista) {
      try {
        datos.push(...(await pedir([m])));
      } catch (e) {
        if (esParametroInvalido(e)) rechazadas.push(m);
        else throw e;
      }
    }
    if (!datos.length) throw err;
    for (const m of rechazadas) vetadas.add(m);
    return datos;
  }
}

/**
 * Una llamada con desglose que puede no existir. Solo se hace después de que
 * la llamada principal del mismo día salió bien, así que un código 100 aquí
 * quiere decir «esa combinación no existe» y se veta para siempre.
 */
export async function pedirOpcional(pedir: Pedido, metricas: string[], vetadas: Set<string>): Promise<IgInsight[]> {
  try {
    return await pedirMetricas(pedir, metricas, vetadas);
  } catch (err) {
    if (esParametroInvalido(err)) {
      for (const m of metricas) vetadas.add(m);
      return [];
    }
    throw err;
  }
}
