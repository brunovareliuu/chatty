/**
 * Estadísticas de Instagram — el modelo que comparten el recolector (servidor),
 * la ruta del tablero y las pantallas. Puro: sin DOM, sin Firebase.
 *
 * Todo lo de Instagram se guarda por «día de Instagram»: Meta corta sus días a
 * la medianoche del Pacífico, no a la del negocio. Guardarlos igual evita que
 * un día nuestro caiga partido entre dos de Meta y se cuente doble.
 */

/** El permiso que falta para alcance, vistas, guardados, audiencia… */
export const PERMISO_ESTADISTICAS = 'instagram_business_manage_insights';

/** Días hacia atrás que se bajan la primera vez que hay permiso. */
export const DIAS_DE_HISTORIAL = 90;

/** Los periodos largos: los únicos para los que Meta da alcance único. */
export type RangoLargo = 7 | 28 | 90;

/** Qué se está viendo: un día (hoy va a medias; ayer ya cerró) o varios. */
export type Rango = 'hoy' | 'ayer' | RangoLargo;

export const RANGOS: { valor: Rango; label: string; corto: string }[] = [
  { valor: 'hoy', label: 'Hoy', corto: 'Hoy' },
  { valor: 'ayer', label: 'Ayer', corto: 'Ayer' },
  { valor: 7, label: '7 días', corto: '7 d' },
  { valor: 28, label: '28 días', corto: '28 d' },
  { valor: 90, label: '90 días', corto: '90 d' },
];

export const RANGOS_LARGOS: RangoLargo[] = [7, 28, 90];

/** `?rango=hoy|ayer|7|28|90` → el periodo con que abre el tablero. */
export function leerRango(valor: string | null | undefined): Rango | undefined {
  return RANGOS.find((r) => String(r.valor) === valor)?.valor;
}

/** Una cifra repartida por los valores que da Meta (FOLLOWER, NON_FOLLOWER…). */
export type Desglose = Record<string, number>;

/**
 * Un día de la cuenta. La foto del perfil (seguidores, seguidos, posts) la
 * toma el cron cada hora y no necesita permiso; lo demás sale de la API de
 * estadísticas y solo existe con `instagram_business_manage_insights`.
 */
export type DiaIg = {
  /** 'YYYY-MM-DD', día del Pacífico. Es también el id del documento. */
  fecha: string;
  seguidores?: number;
  siguiendo?: number;
  publicaciones?: number;
  vistas?: number;
  alcance?: number;
  cuentasInteraccion?: number;
  interacciones?: number;
  likes?: number;
  comentarios?: number;
  guardados?: number;
  compartidos?: number;
  respuestas?: number;
  toquesEnlace?: number;
  reposts?: number;
  /** `follows_and_unfollows` por `follow_type`, con las llaves de Meta tal cual. */
  altasBajas?: Desglose;
  /** `reach` por `follow_type`: cuánto alcance fue de seguidores y cuánto no. */
  alcancePorSeguidor?: Desglose;
  /** `views` por `follower_type`. */
  vistasPorSeguidor?: Desglose;
  /**
   * Likes y comentarios que recibieron tus posts ese día, sacados de restar
   * las fotos horarias de cada post. No se guardan: los calcula `leerTablero`.
   * Existen sin permiso de estadísticas; con permiso manda lo de Meta.
   */
  likesPosts?: number;
  comentariosPosts?: number;
  /** El día de hoy, a medias: Meta todavía no lo cierra. */
  parcial?: boolean;
  perfilEn?: number;
  insightsEn?: number;
};

/** Las cifras de un día que se pueden sumar entre días. */
export type ClaveSumable =
  | 'vistas'
  | 'interacciones'
  | 'likes'
  | 'comentarios'
  | 'guardados'
  | 'compartidos'
  | 'respuestas'
  | 'toquesEnlace'
  | 'reposts';

export type TipoPost = 'reel' | 'carrusel' | 'foto' | 'video';

export const NOMBRE_TIPO: Record<TipoPost, string> = {
  reel: 'Reel',
  carrusel: 'Carrusel',
  foto: 'Foto',
  video: 'Video',
};

export const NOMBRE_TIPO_PLURAL: Record<TipoPost, string> = {
  reel: 'Reels',
  carrusel: 'Carruseles',
  foto: 'Fotos',
  video: 'Videos',
};

/** Lo que Meta cuenta de una publicación. Solo con permiso de estadísticas. */
export type MetricasPost = {
  vistas?: number;
  alcance?: number;
  likes?: number;
  comentarios?: number;
  guardados?: number;
  compartidos?: number;
  interacciones?: number;
  visitasPerfil?: number;
  seguidos?: number;
  reposts?: number;
  respuestas?: number;
  /** Reels: tiempo promedio que la ven, en milisegundos. */
  promedioVistoMs?: number;
  /** Reels: tiempo total reproducido (con repeticiones), en milisegundos. */
  tiempoVistoMs?: number;
  /** Reels: % que la salta en los primeros 3 segundos. */
  tasaSalto?: number;
};

export type PostIg = {
  id: string;
  tipo: TipoPost;
  caption: string;
  permalink: string | null;
  /** Cuándo se publicó (epoch ms). */
  fecha: number;
  /** Portada. Es del CDN de Meta y caduca: el cron la renueva cada hora. */
  miniatura: string | null;
  /** Los cuenta la API básica: existen aunque no haya permiso de estadísticas. */
  likes: number | null;
  comentarios: number | null;
  metricas: MetricasPost | null;
  metricasEn: number | null;
};

/**
 * Una historia. Meta borra sus números a las 24 horas; el cron los copia
 * mientras vive, así que aquí se quedan.
 */
export type HistoriaIg = {
  id: string;
  fecha: number;
  esVideo: boolean;
  miniatura: string | null;
  permalink: string | null;
  metricas: MetricasPost | null;
  metricasEn: number | null;
};

export type Reparto = { clave: string; valor: number }[];

export type Demografia = {
  edad: Reparto;
  genero: Reparto;
  ciudad: Reparto;
  pais: Reparto;
};

export type AudienciaIg = {
  /** Quiénes te siguen. */
  seguidores: Demografia | null;
  /** Quiénes interactuaron con tu contenido. */
  interaccion: Demografia | null;
  /** El `timeframe` que aceptó Meta (p. ej. LAST_90_DAYS). */
  periodo: string | null;
  actualizadoEn: number;
};

export type PerfilIg = {
  id: string;
  username: string;
  nombre: string | null;
  foto: string | null;
  bio: string | null;
  sitio: string | null;
  seguidores: number | null;
  siguiendo: number | null;
  publicaciones: number | null;
};

/**
 * Alcance y cuentas con interacción son personas ÚNICAS: una cuenta que te vio
 * tres días cuenta una vez en la semana, así que no se suman día por día. Se
 * piden a Meta por periodo completo.
 */
export type UnicosPeriodo = {
  desde: string;
  hasta: string;
  alcance: number | null;
  cuentasInteraccion: number | null;
};

export type Unicos = Partial<
  Record<RangoLargo, { actual: UnicosPeriodo | null; anterior: UnicosPeriodo | null }>
>;

export type EstadoIg = {
  /** El token trae el permiso de estadísticas y Meta lo aceptó. */
  conPermiso: boolean;
  /** Por qué no hay estadísticas, en palabras de persona. */
  motivoSinPermiso: string | null;
  /** Última foto del perfil (cada hora). */
  perfilEn: number | null;
  /** Última pasada de estadísticas por día. */
  insightsEn: number | null;
  /** Día más viejo que ya se bajó del historial. */
  historialDesde: string | null;
  historialCompleto: boolean;
  ultimoError: string | null;
};

/** Lo que pasó en la bandeja un día (mismo día del Pacífico que el resto). */
export type BandejaDia = {
  /** Gente que te escribió por primera vez. */
  personasNuevas?: number;
  /** Automatizaciones que arrancaron un flujo. */
  disparos?: number;
};

/** Todo lo que pinta la pantalla, en una sola respuesta. */
export type TableroIg = {
  /** El día de Instagram de hoy al armar el tablero: el ancla de los periodos. */
  hoy: string;
  generadoEn: number;
  perfil: PerfilIg | null;
  estado: EstadoIg;
  /** De más viejo a más nuevo. */
  dias: DiaIg[];
  /** De más nuevo a más viejo. */
  posts: PostIg[];
  historias: HistoriaIg[];
  audiencia: AudienciaIg | null;
  unicos: Unicos;
  bandeja: Record<string, BandejaDia>;
  /** Las automatizaciones que más han contestado (de por vida). */
  automatizaciones: { id: string; nombre: string; disparos: number }[];
};
