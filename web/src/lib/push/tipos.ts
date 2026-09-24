/**
 * Avisos al celular — el contrato que comparten el servidor (quién manda) y
 * la pantalla de Ajustes (qué se activa). Puro: sin Firestore ni DOM.
 */

/** De qué te avisamos. Cada uno se prende o apaga por separado. */
export type EventoPush =
  | 'automatizacion' // se disparó una automatización marcada con «avisarme»
  | 'comentarios' // cada N comentarios en tus publicaciones
  | 'checkpoint' // una cifra cruzó una marca redonda
  | 'dm_sin_respuesta' // un DM que ninguna automatización contestó
  | 'prueba'; // el botón «enviar prueba»; nunca se filtra

export const EVENTOS: { id: Exclude<EventoPush, 'prueba'>; titulo: string; detalle: string }[] = [
  {
    id: 'automatizacion',
    titulo: 'Automatización disparada',
    detalle: 'Solo las que marques con «avisarme» en Automatizaciones: quién comentó o escribió y qué dijo.',
  },
  {
    id: 'comentarios',
    titulo: 'Comentarios',
    detalle: 'Un aviso cada tantos comentarios nuevos en tus publicaciones.',
  },
  {
    id: 'checkpoint',
    titulo: 'Checkpoints',
    detalle: 'Cuando seguidores, comentarios o contactos cruzan una marca redonda.',
  },
  {
    id: 'dm_sin_respuesta',
    titulo: 'DMs sin contestar',
    detalle: 'Un mensaje que ninguna automatización atendió o que llegó a una conversación que atiendes tú.',
  },
];

export type MetricaHito = 'seguidores' | 'comentarios' | 'contactos';

export const METRICAS_HITO: { id: MetricaHito; titulo: string }[] = [
  { id: 'seguidores', titulo: 'Seguidores' },
  { id: 'comentarios', titulo: 'Comentarios' },
  { id: 'contactos', titulo: 'Personas que te escribieron' },
];

export type Preferencias = {
  eventos: Record<Exclude<EventoPush, 'prueba'>, boolean>;
  /** Cada cuántos comentarios llega el aviso de «comentarios». */
  cadaComentarios: number;
  /** Qué cifras cuentan como checkpoint. */
  hitos: Record<MetricaHito, boolean>;
};

export const OPCIONES_CADA_COMENTARIOS = [5, 10, 25, 50, 100];

export const PREFERENCIAS_BASE: Preferencias = {
  eventos: {
    automatizacion: true,
    comentarios: true,
    checkpoint: true,
    dm_sin_respuesta: false,
  },
  cadaComentarios: 10,
  hitos: { seguidores: true, comentarios: true, contactos: true },
};

/** Rellena lo que falte con la base: un doc viejo o vacío no rompe nada. */
export function completaPreferencias(p: Partial<Preferencias> | null | undefined): Preferencias {
  return {
    eventos: { ...PREFERENCIAS_BASE.eventos, ...(p?.eventos ?? {}) },
    cadaComentarios: OPCIONES_CADA_COMENTARIOS.includes(p?.cadaComentarios ?? 0)
      ? (p!.cadaComentarios as number)
      : PREFERENCIAS_BASE.cadaComentarios,
    hitos: { ...PREFERENCIAS_BASE.hitos, ...(p?.hitos ?? {}) },
  };
}

// ---------------------------------------------------------------------------
// Checkpoints: marcas redondas por métrica.
// ---------------------------------------------------------------------------

const MARCAS_SEGUIDORES = [
  100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000, 25000,
  30000, 40000, 50000, 75000, 100000, 150000, 200000, 250000, 500000, 1000000,
];
const MARCAS_GENERALES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

export function marcasDe(metrica: MetricaHito): number[] {
  return metrica === 'seguidores' ? MARCAS_SEGUIDORES : MARCAS_GENERALES;
}

/**
 * La marca más alta que `valor` ya cruzó y de la que todavía no se avisó.
 * Si el valor subió de golpe varias marcas, se avisa solo la mayor.
 */
export function hitoCruzado(metrica: MetricaHito, valor: number, ultimoAvisado: number): number | null {
  let mejor: number | null = null;
  for (const marca of marcasDe(metrica)) {
    if (marca <= valor && marca > ultimoAvisado) mejor = marca;
  }
  return mejor;
}

/** Lo que viaja dentro de cada push. El service worker lo lee tal cual. */
export type Aviso = {
  titulo: string;
  cuerpo: string;
  /** Ruta del panel que abre al tocar el aviso. */
  url?: string;
  /** Avisos con la misma etiqueta se reemplazan en vez de apilarse. */
  tag?: string;
};

/** Cómo ve Ajustes cada celular o navegador suscrito. */
export type Dispositivo = {
  id: string;
  nombre: string;
  endpoint: string;
  creadoEn: number;
  ultimoEnvioEn: number | null;
  ultimoError: string | null;
};

/** Un renglón del historial de avisos enviados. */
export type AvisoEnviado = Aviso & {
  id: string;
  evento: EventoPush;
  enviadoEn: number;
  dispositivos: number;
  fallidos: number;
};
