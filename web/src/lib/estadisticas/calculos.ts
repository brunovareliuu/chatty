/**
 * Las cuentas del tablero de Instagram. Puro: lo usan las pantallas (para
 * cambiar de 7 a 90 días sin volver a pedir nada) y el recolector del servidor
 * (para las fechas). Sin DOM ni Firebase.
 */

import type {
  ClaveSumable,
  DiaIg,
  PostIg,
  Rango,
  Reparto,
  TableroIg,
  TipoPost,
} from './tipos';

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

/** Meta corta sus días en la hora del Pacífico. */
export const ZONA_IG = 'America/Los_Angeles';
/**
 * Las horas de publicación se leen en la zona del negocio: NEXT_PUBLIC_TIMEZONE
 * (un nombre IANA, como America/Bogota o Europe/Madrid) o, si no está, la del
 * centro de México. Se lee directo y no desde `@/lib/marca` porque las pruebas
 * corren este archivo con Node, sin los alias de la app.
 */
export const ZONA_LOCAL = process.env.NEXT_PUBLIC_TIMEZONE || 'America/Mexico_City';

/** Cómo se nombra esa zona en las gráficas. */
export const NOMBRE_ZONA_LOCAL = process.env.NEXT_PUBLIC_TIMEZONE
  ? `hora de ${process.env.NEXT_PUBLIC_TIMEZONE.split('/').pop()!.replace(/_/g, ' ')}`
  : 'hora del centro de México';

const formatos = new Map<string, Intl.DateTimeFormat>();

function partes(ms: number, zona: string) {
  let f = formatos.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zona,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      weekday: 'short',
    });
    formatos.set(zona, f);
  }
  const p = f.formatToParts(ms);
  const de = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value ?? '';
  return {
    fecha: `${de('year')}-${de('month')}-${de('day')}`,
    hora: Number(de('hour')) % 24,
    semana: de('weekday'),
  };
}

/** 'YYYY-MM-DD' del día de Instagram (Pacífico) en que cae un instante. */
export function fechaIg(ms: number): string {
  return partes(ms, ZONA_IG).fecha;
}

/** 'YYYY-MM-DD' en la zona del negocio. */
export function fechaLocal(ms: number): string {
  return partes(ms, ZONA_LOCAL).fecha;
}

export function sumarDias(fecha: string, n: number): string {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T00:00:00Z`);
  const b = Date.parse(`${hasta}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * La medianoche del Pacífico de un día, en epoch ms. Cae a las 07:00 UTC en
 * verano y a las 08:00 en invierno; se prueban las dos.
 */
export function inicioDiaIg(fecha: string): number {
  const [y, m, d] = fecha.split('-').map(Number);
  for (const h of [7, 8]) {
    const t = Date.UTC(y, m - 1, d, h);
    const p = partes(t, ZONA_IG);
    if (p.fecha === fecha && p.hora === 0) return t;
  }
  return Date.UTC(y, m - 1, d, 8);
}

export type Periodo = { desde: string; hasta: string };

/** «Hoy» y «ayer» son un solo día; los demás, `n` días. */
export function esUnDia(rango: Rango): rango is 'hoy' | 'ayer' {
  return rango === 'hoy' || rango === 'ayer';
}

export function diasDelRango(rango: Rango): number {
  return esUnDia(rango) ? 1 : rango;
}

/** Para las frases: «hoy», «ayer», «en 28 días». */
export function textoRango(rango: Rango): string {
  return esUnDia(rango) ? rango : `en ${rango} días`;
}

/**
 * Los días que se ven. `n` días: los últimos `n` completos, sin contar hoy
 * (va a medias y Meta tarda hasta 48 h en cerrar), o los `n` de antes para
 * comparar. «Ayer»: ayer contra antier. «Hoy»: hoy, a medias, contra ayer
 * (pero sin porcentajes: un día a medias contra uno completo engaña).
 */
export function periodo(hoy: string, rango: Rango, anterior = false): Periodo {
  if (rango === 'hoy') {
    const dia = anterior ? sumarDias(hoy, -1) : hoy;
    return { desde: dia, hasta: dia };
  }
  const n = diasDelRango(rango);
  return anterior
    ? { desde: sumarDias(hoy, -2 * n), hasta: sumarDias(hoy, -n - 1) }
    : { desde: sumarDias(hoy, -n), hasta: sumarDias(hoy, -1) };
}

/**
 * Para lo que se cuenta en vivo (publicaciones, DMs, leads): los mismos días
 * pero incluyendo hoy. Un post de hoy es de «estos 28 días» aunque Meta
 * todavía no cierre sus números.
 */
export function periodoHastaHoy(hoy: string, rango: Rango, anterior = false): Periodo {
  if (esUnDia(rango)) return periodo(hoy, rango, anterior);
  return anterior
    ? { desde: sumarDias(hoy, -2 * rango + 1), hasta: sumarDias(hoy, -rango) }
    : { desde: sumarDias(hoy, -rango + 1), hasta: hoy };
}

/**
 * Lo que enseñan la gráfica y la tabla de días: el periodo, o los últimos 14
 * días hasta el día elegido cuando se ve un solo día (una gráfica de un punto
 * no dice nada).
 */
export function periodoGrafica(hoy: string, rango: Rango): Periodo {
  if (!esUnDia(rango)) return periodo(hoy, rango);
  const hasta = periodo(hoy, rango).hasta;
  return { desde: sumarDias(hasta, -13), hasta };
}

export function enPeriodo(fecha: string, p: Periodo): boolean {
  return fecha >= p.desde && fecha <= p.hasta;
}

/** Cada fecha del periodo, en orden. */
export function fechasDe(p: Periodo): string[] {
  const n = diasEntre(p.desde, p.hasta);
  return Array.from({ length: n + 1 }, (_, i) => sumarDias(p.desde, i));
}

// ---------------------------------------------------------------------------
// Seguidores
// ---------------------------------------------------------------------------

/**
 * `follows_and_unfollows` llega partido por `follow_type` y Meta no documenta
 * qué llave es cuál. Se lee como «qué es la cuenta ahora»: FOLLOWER = te
 * siguió, NON_FOLLOWER = dejó de seguirte. Si la foto diaria de seguidores
 * termina diciendo lo contrario, `orientacionAltasBajas` lo voltea.
 */
export type Orientacion = 'normal' | 'invertida';

export function altasYBajas(
  d: DiaIg | undefined,
  o: Orientacion = 'normal',
): { altas: number; bajas: number } | null {
  const ab = d?.altasBajas;
  if (!ab) return null;
  const f = ab.FOLLOWER ?? 0;
  const nf = ab.NON_FOLLOWER ?? 0;
  return o === 'normal' ? { altas: f, bajas: nf } : { altas: nf, bajas: f };
}

/**
 * Compara las altas y bajas de Meta con lo que de verdad cambió la foto de
 * seguidores entre dos días seguidos. Solo voltea con evidencia clara: cinco
 * días o más y la otra lectura explicando los cambios el doble de bien.
 */
export function orientacionAltasBajas(dias: DiaIg[]): Orientacion {
  let errNormal = 0;
  let errInvertida = 0;
  let muestras = 0;
  for (let i = 1; i < dias.length; i++) {
    const a = dias[i - 1];
    const b = dias[i];
    const ab = altasYBajas(b);
    if (a.seguidores == null || b.seguidores == null || !ab) continue;
    if (sumarDias(a.fecha, 1) !== b.fecha) continue;
    const real = b.seguidores - a.seguidores;
    errNormal += Math.abs(real - (ab.altas - ab.bajas));
    errInvertida += Math.abs(real - (ab.bajas - ab.altas));
    muestras++;
  }
  return muestras >= 5 && errInvertida * 2 < errNormal ? 'invertida' : 'normal';
}

export type PuntoSeguidores = { fecha: string; valor: number | null; estimado: boolean };

/**
 * Seguidores al cierre de cada día. Donde hay foto del cron se usa tal cual;
 * hacia atrás, antes de la primera foto, se reconstruye restando las altas y
 * bajas de cada día (Meta sí guarda eso 90 días; los seguidores de un día
 * pasado, no). Lo reconstruido va marcado como `estimado`.
 */
export function serieSeguidores(t: TableroIg, o: Orientacion): PuntoSeguidores[] {
  const porFecha = new Map(t.dias.map((d) => [d.fecha, d]));
  const primera = t.dias[0]?.fecha ?? t.hoy;
  const total = diasEntre(primera, t.hoy);
  const serie: PuntoSeguidores[] = [];

  let siguiente: number | null = null; // seguidores al cierre del día siguiente
  for (let i = 0; i <= total; i++) {
    const fecha = sumarDias(t.hoy, -i);
    const dia = porFecha.get(fecha);
    let valor: number | null = null;
    let estimado = false;

    if (dia?.seguidores != null) {
      valor = dia.seguidores;
    } else if (i === 0 && t.perfil?.seguidores != null) {
      valor = t.perfil.seguidores;
    } else if (siguiente != null) {
      const manana = sumarDias(fecha, 1);
      const neto = altasYBajas(porFecha.get(manana), o);
      if (neto) {
        valor = siguiente - (neto.altas - neto.bajas);
        estimado = true;
      } else if (manana === t.hoy) {
        // Hoy va a medias y Meta puede no tener todavía sus altas y bajas:
        // se toma como cero para no cortar la reconstrucción desde el primer día.
        valor = siguiente;
        estimado = true;
      }
    }

    serie.push({ fecha, valor, estimado });
    siguiente = valor;
  }

  serie.reverse();
  const inicio = serie.findIndex((p) => p.valor != null);
  return inicio === -1 ? [] : serie.slice(inicio);
}

// ---------------------------------------------------------------------------
// Resumen de un periodo
// ---------------------------------------------------------------------------

export type Comparado = { actual: number | null; anterior: number | null };

/**
 * Una cifra de un día. Likes y comentarios salen de Meta si hay permiso y, si
 * no, de restar las fotos horarias de cada post (`likesPosts`).
 */
export function valorDia(d: DiaIg | undefined, clave: ClaveSumable | 'alcance'): number | null {
  if (!d) return null;
  const v =
    clave === 'likes'
      ? (d.likes ?? d.likesPosts)
      : clave === 'comentarios'
        ? (d.comentarios ?? d.comentariosPosts)
        : d[clave];
  return typeof v === 'number' ? v : null;
}

function sumar(dias: DiaIg[], p: Periodo, clave: ClaveSumable): number | null {
  let total = 0;
  let hay = false;
  for (const d of dias) {
    if (!enPeriodo(d.fecha, p)) continue;
    const v = valorDia(d, clave);
    if (v != null) {
      total += v;
      hay = true;
    }
  }
  return hay ? total : null;
}

function sumarDesglose(
  dias: DiaIg[],
  p: Periodo,
  clave: 'vistasPorSeguidor' | 'alcancePorSeguidor',
): { seguidores: number; noSeguidores: number } | null {
  let seguidores = 0;
  let noSeguidores = 0;
  let hay = false;
  for (const d of dias) {
    const r = d[clave];
    if (!r || !enPeriodo(d.fecha, p)) continue;
    seguidores += r.FOLLOWER ?? 0;
    noSeguidores += r.NON_FOLLOWER ?? 0;
    hay = true;
  }
  return hay ? { seguidores, noSeguidores } : null;
}

export type Resumen = {
  rango: Rango;
  /** Días completos (terminan ayer): lo que cuenta Meta. */
  actual: Periodo;
  anterior: Periodo;
  /** Los mismos días hasta hoy: publicaciones, DMs y leads. */
  enVivo: Periodo;
  enVivoAnterior: Periodo;
  seguidores: {
    ahora: number | null;
    alInicio: number | null;
    /** De qué día es `alInicio`: si es posterior al inicio del periodo, el historial es más corto. */
    desde: string | null;
    cambio: number | null;
    altas: number | null;
    bajas: number | null;
  };
  vistas: Comparado;
  alcance: Comparado;
  cuentasInteraccion: Comparado;
  interacciones: Comparado;
  likes: Comparado;
  comentarios: Comparado;
  guardados: Comparado;
  compartidos: Comparado;
  respuestas: Comparado;
  toquesEnlace: Comparado;
  reposts: Comparado;
  /** Publicaciones hechas en el periodo. */
  posts: Comparado;
  /** Mediana por post de (interacciones ÷ seguidores). */
  tasa: Comparado;
  /** Likes y comentarios de todos tus posts, de por vida: lo que da la API básica. */
  likesTotal: number | null;
  comentariosTotal: number | null;
  vistasPorSeguidor: { seguidores: number; noSeguidores: number } | null;
  alcancePorSeguidor: { seguidores: number; noSeguidores: number } | null;
};

export function resumen(t: TableroIg, rango: Rango, o: Orientacion): Resumen {
  const actual = periodo(t.hoy, rango);
  const anterior = periodo(t.hoy, rango, true);
  const enVivo = periodoHastaHoy(t.hoy, rango);
  const enVivoAnterior = periodoHastaHoy(t.hoy, rango, true);
  // Hoy va a medias: compararlo en % contra un día completo engaña.
  const comparar = rango !== 'hoy';
  const ambos = (clave: ClaveSumable): Comparado => ({
    actual: sumar(t.dias, actual, clave),
    anterior: comparar ? sumar(t.dias, anterior, clave) : null,
  });

  // Seguidores: el número de arriba es el de ahora, así que el cambio llega
  // hasta ahora (si no, «698 +10» no cuadraría). Solo «ayer» se mide al cierre
  // de ayer. El inicio es el cierre del día anterior al periodo; si el
  // historial empieza después, el primer día que se conoce; si el único dato
  // es el de hoy, no hay cambio que decir (no «igual»: no se sabe).
  const serie = serieSeguidores(t, o);
  const alCierre = new Map(serie.map((p) => [p.fecha, p.valor]));
  const ahora = t.perfil?.seguidores ?? serie.at(-1)?.valor ?? null;
  const alFinal = rango === 'ayer' ? (alCierre.get(actual.hasta) ?? null) : ahora;
  const antesDelPeriodo = sumarDias(actual.desde, -1);
  const inicio =
    serie.find((p) => p.fecha === antesDelPeriodo && p.valor != null) ??
    serie.find((p) => p.valor != null && p.fecha >= antesDelPeriodo && p.fecha < t.hoy) ??
    null;
  const alInicio = inicio?.valor ?? null;

  let altas: number | null = null;
  let bajas: number | null = null;
  for (const d of t.dias) {
    if (!enPeriodo(d.fecha, actual)) continue;
    const ab = altasYBajas(d, o);
    if (!ab) continue;
    altas = (altas ?? 0) + ab.altas;
    bajas = (bajas ?? 0) + ab.bajas;
  }

  // Alcance y cuentas con interacción son únicos: de un solo día, el del día;
  // de varios, lo que Meta dio para el periodo completo.
  const porFecha = new Map(t.dias.map((d) => [d.fecha, d]));
  const unico = esUnDia(rango) ? null : t.unicos[rango];
  const delDia = (p: Periodo, k: 'alcance' | 'cuentasInteraccion') => porFecha.get(p.desde)?.[k] ?? null;
  const postsActual = postsEnPeriodo(t.posts, enVivo);
  const postsAnterior = postsEnPeriodo(t.posts, enVivoAnterior);
  const seguidoresAhora = ahora ?? 0;
  const sumaDe = (k: 'likes' | 'comentarios') =>
    t.posts.length ? t.posts.reduce((s, p) => s + (p[k] ?? 0), 0) : null;

  return {
    rango,
    actual,
    anterior,
    enVivo,
    enVivoAnterior,
    seguidores: {
      ahora,
      alInicio,
      desde: inicio?.fecha ?? null,
      cambio: alFinal != null && alInicio != null ? alFinal - alInicio : null,
      altas,
      bajas,
    },
    vistas: ambos('vistas'),
    alcance: esUnDia(rango)
      ? { actual: delDia(actual, 'alcance'), anterior: comparar ? delDia(anterior, 'alcance') : null }
      : { actual: unico?.actual?.alcance ?? null, anterior: unico?.anterior?.alcance ?? null },
    cuentasInteraccion: esUnDia(rango)
      ? {
          actual: delDia(actual, 'cuentasInteraccion'),
          anterior: comparar ? delDia(anterior, 'cuentasInteraccion') : null,
        }
      : {
          actual: unico?.actual?.cuentasInteraccion ?? null,
          anterior: unico?.anterior?.cuentasInteraccion ?? null,
        },
    interacciones: ambos('interacciones'),
    likes: ambos('likes'),
    comentarios: ambos('comentarios'),
    guardados: ambos('guardados'),
    compartidos: ambos('compartidos'),
    respuestas: ambos('respuestas'),
    toquesEnlace: ambos('toquesEnlace'),
    reposts: ambos('reposts'),
    posts: { actual: postsActual.length, anterior: comparar ? postsAnterior.length : null },
    tasa: {
      actual: mediana(postsActual.map((p) => tasaDe(p, seguidoresAhora))),
      anterior: comparar ? mediana(postsAnterior.map((p) => tasaDe(p, seguidoresAhora))) : null,
    },
    likesTotal: sumaDe('likes'),
    comentariosTotal: sumaDe('comentarios'),
    vistasPorSeguidor: sumarDesglose(t.dias, actual, 'vistasPorSeguidor'),
    alcancePorSeguidor: sumarDesglose(t.dias, actual, 'alcancePorSeguidor'),
  };
}

/** ¿Hay estadísticas de Meta en este periodo, o solo la API básica? */
export function hayInsights(t: TableroIg, p: Periodo): boolean {
  return t.dias.some((d) => enPeriodo(d.fecha, p) && d.insightsEn != null);
}

// ---------------------------------------------------------------------------
// Series por día (la gráfica grande)
// ---------------------------------------------------------------------------

export type ClaveSerie =
  | 'seguidores'
  | 'vistas'
  | 'alcance'
  | 'likes'
  | 'comentarios'
  | 'guardados'
  | 'compartidos'
  | 'interacciones'
  | 'toquesEnlace';

export const METRICAS_DIA: Record<ClaveSerie, { label: string; ayuda: string }> = {
  seguidores: { label: 'Seguidores', ayuda: 'Cuántos te seguían al cierre de cada día.' },
  vistas: {
    label: 'Vistas',
    ayuda: 'Veces que se vio tu contenido: posts, reels e historias.',
  },
  alcance: { label: 'Alcance', ayuda: 'Cuentas distintas que vieron algo tuyo ese día.' },
  likes: { label: 'Likes', ayuda: 'Likes que recibieron tus publicaciones ese día.' },
  comentarios: { label: 'Comentarios', ayuda: 'Comentarios que recibieron tus publicaciones ese día.' },
  guardados: { label: 'Guardados', ayuda: 'Veces que guardaron algo tuyo ese día.' },
  compartidos: { label: 'Compartidos', ayuda: 'Veces que compartieron algo tuyo ese día.' },
  interacciones: {
    label: 'Interacciones',
    ayuda: 'Likes, comentarios, guardados, compartidos y respuestas del día.',
  },
  toquesEnlace: {
    label: 'Toques al enlace',
    ayuda: 'Toques al enlace y a los botones de tu perfil.',
  },
};

export type PuntoSerie = { fecha: string; valor: number | null; estimado?: boolean };

export function serieDiaria(
  t: TableroIg,
  p: Periodo,
  clave: ClaveSerie,
  o: Orientacion,
): PuntoSerie[] {
  if (clave === 'seguidores') {
    const porFecha = new Map(serieSeguidores(t, o).map((x) => [x.fecha, x]));
    return fechasDe(p).map((fecha) => {
      const x = porFecha.get(fecha);
      return { fecha, valor: x?.valor ?? null, estimado: x?.estimado };
    });
  }
  const porFecha = new Map(t.dias.map((d) => [d.fecha, d]));
  return fechasDe(p).map((fecha) => ({ fecha, valor: valorDia(porFecha.get(fecha), clave) }));
}

/** Foto de un post en un día: likes y comentarios a la última hora vista. */
export type FotoPost = { l: number; c: number };

/**
 * Likes y comentarios que recibieron los posts cada día, restando la foto de
 * cada post contra la del día anterior. Un post publicado ese día cuenta
 * completo. Un día solo sale si TODOS sus posts tienen con qué compararse: el
 * primer día que el panel ve un post viejo no se sabe cuánto ganó ese día.
 */
export function recibidosPorDia(
  posts: { fecha: number; diario?: Record<string, FotoPost> }[],
): Record<string, { likes: number; comentarios: number }> {
  const suma: Record<string, { likes: number; comentarios: number }> = {};
  const incompletos = new Set<string>();
  for (const p of posts) {
    const publicado = fechaIg(p.fecha);
    let previa: FotoPost | null = null;
    for (const f of Object.keys(p.diario ?? {}).sort()) {
      const foto = p.diario![f];
      const base: FotoPost | null = previa ?? (f === publicado ? { l: 0, c: 0 } : null);
      if (base) {
        const d = (suma[f] ??= { likes: 0, comentarios: 0 });
        d.likes += foto.l - base.l;
        d.comentarios += foto.c - base.c;
      } else {
        incompletos.add(f);
      }
      previa = foto;
    }
  }
  for (const f of incompletos) delete suma[f];
  return suma;
}

/** Un renglón de la tabla «día por día»: todo lo que se sabe de ese día. */
export type FilaDia = {
  fecha: string;
  /** Seguidores al cierre (o ahora, si es hoy). */
  seguidores: number | null;
  /** Cuánto cambiaron ese día: altas − bajas de Meta, o la resta de dos fotos. */
  neto: number | null;
  vistas: number | null;
  alcance: number | null;
  likes: number | null;
  comentarios: number | null;
  guardados: number | null;
  compartidos: number | null;
  /** Publicaciones hechas ese día. */
  posts: number;
  /** Hoy: va a medias. */
  parcial: boolean;
  /** Los seguidores de ese día salen de reconstruir, no de una foto. */
  estimado: boolean;
};

/** Cada día del periodo con todas sus cifras, del más nuevo al más viejo. */
export function filasPorDia(t: TableroIg, p: Periodo, o: Orientacion): FilaDia[] {
  const porFecha = new Map(t.dias.map((d) => [d.fecha, d]));
  const seguidores = new Map(serieSeguidores(t, o).map((x) => [x.fecha, x]));
  const postsPorDia = new Map<string, number>();
  for (const post of t.posts) {
    const f = fechaIg(post.fecha);
    postsPorDia.set(f, (postsPorDia.get(f) ?? 0) + 1);
  }
  return fechasDe(p)
    .reverse()
    .map((fecha) => {
      const d = porFecha.get(fecha);
      const s = seguidores.get(fecha);
      const antes = seguidores.get(sumarDias(fecha, -1));
      const ab = altasYBajas(d, o);
      const neto = ab
        ? ab.altas - ab.bajas
        : s?.valor != null && antes?.valor != null && !s.estimado && !antes.estimado
          ? s.valor - antes.valor
          : null;
      const num = (v: number | undefined) => (typeof v === 'number' ? v : null);
      return {
        fecha,
        seguidores: s?.valor ?? null,
        neto,
        vistas: num(d?.vistas),
        alcance: num(d?.alcance),
        likes: valorDia(d, 'likes'),
        comentarios: valorDia(d, 'comentarios'),
        guardados: num(d?.guardados),
        compartidos: num(d?.compartidos),
        posts: postsPorDia.get(fecha) ?? 0,
        parcial: fecha === t.hoy,
        estimado: Boolean(s?.estimado),
      };
    });
}

/** Altas (arriba) y bajas (abajo, en negativo) de cada día. */
export function serieAltasBajas(
  t: TableroIg,
  p: Periodo,
  o: Orientacion,
): { fecha: string; altas: number | null; bajas: number | null }[] {
  const porFecha = new Map(t.dias.map((d) => [d.fecha, d]));
  return fechasDe(p).map((fecha) => {
    const ab = altasYBajas(porFecha.get(fecha), o);
    return { fecha, altas: ab ? ab.altas : null, bajas: ab ? -ab.bajas : null };
  });
}

// ---------------------------------------------------------------------------
// Publicaciones
// ---------------------------------------------------------------------------

export function postsEnPeriodo(posts: PostIg[], p: Periodo): PostIg[] {
  const desde = inicioDiaIg(p.desde);
  const hasta = inicioDiaIg(sumarDias(p.hasta, 1));
  return posts.filter((x) => x.fecha >= desde && x.fecha < hasta);
}

/**
 * Interacciones de un post: las de Meta si hay permiso (incluyen guardados y
 * compartidos), si no likes + comentarios.
 */
export function interaccionesDe(p: PostIg): number {
  return p.metricas?.interacciones ?? (p.likes ?? 0) + (p.comentarios ?? 0);
}

/** Interacciones por cada 100 seguidores. */
export function tasaDe(p: PostIg, seguidores: number | null): number | null {
  if (!seguidores) return null;
  return (interaccionesDe(p) / seguidores) * 100;
}

/**
 * La mediana: el valor de un post típico. Con pocos posts y uno viral, el
 * promedio lo infla todo; la mediana no se mueve.
 */
export function mediana(valores: (number | null)[]): number | null {
  const v = valores.filter((x): x is number => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export type ClavePost =
  | 'fecha'
  | 'interacciones'
  | 'likes'
  | 'comentarios'
  | 'vistas'
  | 'alcance'
  | 'guardados'
  | 'compartidos'
  | 'tasa';

export function valorPost(p: PostIg, clave: ClavePost, seguidores: number | null): number | null {
  switch (clave) {
    case 'fecha':
      return p.fecha;
    case 'interacciones':
      return interaccionesDe(p);
    case 'likes':
      return p.likes ?? p.metricas?.likes ?? null;
    case 'comentarios':
      return p.comentarios ?? p.metricas?.comentarios ?? null;
    case 'tasa':
      return tasaDe(p, seguidores);
    default:
      return p.metricas?.[clave] ?? null;
  }
}

export function ordenarPosts(
  posts: PostIg[],
  clave: ClavePost,
  seguidores: number | null,
): PostIg[] {
  return [...posts].sort(
    (a, b) => (valorPost(b, clave, seguidores) ?? -1) - (valorPost(a, clave, seguidores) ?? -1),
  );
}

/** Un post típico de cada tipo (medianas). Solo los tipos que existen, del mejor al peor. */
export type GrupoTipo = {
  tipo: TipoPost;
  n: number;
  interacciones: number;
  vistas: number | null;
  alcance: number | null;
};

export function porTipo(posts: PostIg[]): GrupoTipo[] {
  const grupos = new Map<TipoPost, PostIg[]>();
  for (const p of posts) grupos.set(p.tipo, [...(grupos.get(p.tipo) ?? []), p]);
  return [...grupos.entries()]
    .map(([tipo, ps]) => ({
      tipo,
      n: ps.length,
      interacciones: mediana(ps.map(interaccionesDe)) ?? 0,
      vistas: mediana(ps.map((p) => p.metricas?.vistas ?? null)),
      alcance: mediana(ps.map((p) => p.metricas?.alcance ?? null)),
    }))
    .sort((a, b) => b.interacciones - a.interacciones);
}

const DIAS_SEMANA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const DIAS_SEMANA_LARGO = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const INDICE_SEMANA: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** `tipico`: la mediana de interacciones de los posts que caen en la casilla. */
export type Casilla = { clave: string; label: string; largo: string; n: number; tipico: number | null };

/** Interacciones de un post típico según el día (en la zona del negocio) en que se publicó. */
export function porDiaSemana(posts: PostIg[]): Casilla[] {
  const casillas: number[][] = DIAS_SEMANA.map(() => []);
  for (const p of posts) {
    const i = INDICE_SEMANA[partes(p.fecha, ZONA_LOCAL).semana];
    if (i !== undefined) casillas[i].push(interaccionesDe(p));
  }
  return casillas.map((vs, i) => ({
    clave: String(i),
    label: DIAS_SEMANA[i],
    largo: DIAS_SEMANA_LARGO[i],
    n: vs.length,
    tipico: mediana(vs),
  }));
}

const FRANJAS = [
  { desde: 6, hasta: 12, label: 'Mañana', largo: 'en la mañana (6 a 12)' },
  { desde: 12, hasta: 18, label: 'Tarde', largo: 'en la tarde (12 a 18)' },
  { desde: 18, hasta: 24, label: 'Noche', largo: 'en la noche (18 a 24)' },
  { desde: 0, hasta: 6, label: 'Madrugada', largo: 'de madrugada (0 a 6)' },
];

/** Lo mismo por franja del día. Con pocos posts, cuatro franjas dicen más que 24 horas. */
export function porHorario(posts: PostIg[]): Casilla[] {
  return FRANJAS.map((f) => {
    const vs = posts
      .filter((p) => {
        const h = partes(p.fecha, ZONA_LOCAL).hora;
        return h >= f.desde && h < f.hasta;
      })
      .map(interaccionesDe);
    return { clave: f.label, label: f.label, largo: f.largo, n: vs.length, tipico: mediana(vs) };
  });
}

/** Posts por semana (lunes a domingo, en la zona del negocio), las últimas `semanas`. */
export function cadencia(posts: PostIg[], ahora: number, semanas = 12): { inicio: string; n: number }[] {
  const hoy = partes(ahora, ZONA_LOCAL);
  const lunes = sumarDias(hoy.fecha, -(INDICE_SEMANA[hoy.semana] ?? 0));
  const cubetas = Array.from({ length: semanas }, (_, i) => ({
    inicio: sumarDias(lunes, -7 * (semanas - 1 - i)),
    n: 0,
  }));
  for (const p of posts) {
    const f = fechaLocal(p.fecha);
    const i = Math.floor(diasEntre(cubetas[0].inicio, f) / 7);
    if (i >= 0 && i < semanas) cubetas[i].n++;
  }
  return cubetas;
}

export function diasSinPublicar(posts: PostIg[], ahora: number): number | null {
  const ultimo = posts.reduce<number | null>((m, p) => (m == null || p.fecha > m ? p.fecha : m), null);
  return ultimo == null ? null : Math.floor((ahora - ultimo) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Audiencia
// ---------------------------------------------------------------------------

const ORDEN_EDAD = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

export function ordenarEdades(r: Reparto): Reparto {
  return [...r].sort((a, b) => ORDEN_EDAD.indexOf(a.clave) - ORDEN_EDAD.indexOf(b.clave));
}

const GENEROS: Record<string, string> = { F: 'Mujeres', M: 'Hombres', U: 'Sin dato' };

export function nombreGenero(clave: string): string {
  return GENEROS[clave] ?? clave;
}

let paises: Intl.DisplayNames | null = null;

export function nombrePais(codigo: string): string {
  try {
    paises ??= new Intl.DisplayNames(['es-MX'], { type: 'region' });
    return paises.of(codigo) ?? codigo;
  } catch {
    return codigo;
  }
}

export function totalDe(r: Reparto): number {
  return r.reduce((s, x) => s + x.valor, 0);
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

const fmtEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const fmtDecimal = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

export function entero(n: number | null | undefined): string {
  return n == null ? '—' : fmtEntero.format(n);
}

/**
 * 12,480 → «12.5 mil», 1,250,000 → «1.3 M»; debajo de 10 mil se escribe
 * completo. A mano: el formato compacto de es-MX escribe «12.5 k».
 */
export function compacto(n: number | null | undefined): string {
  if (n == null) return '—';
  const a = Math.abs(n);
  if (a < 10_000) return fmtEntero.format(n);
  if (a < 1_000_000) return `${fmtDecimal.format(n / 1000)} mil`;
  return `${fmtDecimal.format(n / 1_000_000)} M`;
}

export function porcentaje(n: number | null | undefined, decimales = 1): string {
  if (n == null) return '—';
  return `${n.toLocaleString('es-MX', { maximumFractionDigits: decimales })}%`;
}

export function decimal(n: number | null | undefined): string {
  return n == null ? '—' : fmtDecimal.format(n);
}

/** Milisegundos → «8.4 s» o «1 min 5 s». */
export function duracion(ms: number | null | undefined): string {
  if (ms == null) return '—';
  const s = ms / 1000;
  if (s < 60) return `${fmtDecimal.format(s)} s`;
  const min = Math.floor(s / 60);
  const resto = Math.round(s % 60);
  return resto ? `${min} min ${resto} s` : `${min} min`;
}

/** '2026-09-23' → «23 sep». */
export function fechaCorta(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** Cuándo se publicó un post, en la zona del negocio: «22 jun · 10:40». */
export function cuandoSePublico(ms: number): string {
  const f = new Date(ms);
  const dia = f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: ZONA_LOCAL });
  const hora = f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: ZONA_LOCAL });
  return `${dia} · ${hora}`;
}

/** «hace 5 min», «hace 3 h», «hace 2 días». */
export function hace(ms: number | null | undefined, ahora: number): string {
  if (!ms) return 'nunca';
  const min = Math.round((ahora - ms) / 60_000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

/** Cambio contra el periodo anterior, listo para pintar. */
export type Cambio = { texto: string; sube: boolean | null };

export function cambio(actual: number | null, anterior: number | null): Cambio | null {
  if (actual == null || anterior == null) return null;
  if (anterior === 0) return actual === 0 ? { texto: 'igual', sube: null } : { texto: 'nuevo', sube: true };
  const d = ((actual - anterior) / anterior) * 100;
  if (Math.abs(d) < 0.5) return { texto: 'igual', sube: null };
  return { texto: `${d > 0 ? '+' : ''}${fmtEntero.format(d)}%`, sube: d > 0 };
}

/** «+12» / «−3» para cifras que se leen en unidades (seguidores). */
export function cambioEnUnidades(n: number | null): Cambio | null {
  if (n == null) return null;
  if (n === 0) return { texto: 'igual', sube: null };
  return { texto: `${n > 0 ? '+' : '−'}${fmtEntero.format(Math.abs(n))}`, sube: n > 0 };
}
