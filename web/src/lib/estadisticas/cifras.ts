/**
 * Las cuatro cifras de arriba, el desglose de interacciones y lo de la
 * bandeja, ya listos para pintar. Puro y compartido: el escritorio y el
 * celular enseñan exactamente los mismos números.
 */

import {
  cambio,
  cambioEnUnidades,
  diasSinPublicar,
  entero,
  enPeriodo,
  fechaCorta,
  hayInsights,
  interaccionesDe,
  mediana,
  periodoGrafica,
  porcentaje,
  serieDiaria,
  sumarDias,
  tasaDe,
  textoRango,
  type Cambio,
  type ClaveSerie,
  type Comparado,
  type Orientacion,
  type Periodo,
  type Resumen,
} from './calculos';
import type { BandejaDia, TableroIg } from './tipos';

export type CifraIg = {
  id: string;
  label: string;
  valor: string;
  cambio: Cambio | null;
  detalle: string;
  /** La mini-gráfica, un valor por día (o por post). */
  serie?: (number | null)[];
  /** Sin permiso de estadísticas: la cifra no existe, se enseña con candado. */
  bloqueada?: boolean;
};

function promedio(vs: (number | null)[]): number | null {
  const v = vs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** Promedio por día de una cifra, para cuando Meta no da el total único del periodo. */
export function promedioDiario(t: TableroIg, p: Periodo, clave: 'alcance' | 'cuentasInteraccion'): number | null {
  return promedio(t.dias.filter((d) => enPeriodo(d.fecha, p)).map((d) => d[clave] ?? null));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const citaCorta = (s: string, n = 34) => {
  const limpio = s.replace(/\s+/g, ' ').trim();
  return limpio.length > n ? `${limpio.slice(0, n - 1).trimEnd()}…` : limpio;
};

/**
 * Las cifras de arriba, en dos renglones y con números exactos (sin «17 mil»):
 * lo que se quiere saber al entrar es cuántos likes, comentarios y vistas
 * hubo. Vistas solo existe con permiso de estadísticas: sin él va con candado.
 */
export function cifrasPrincipales(
  t: TableroIg,
  r: Resumen,
  o: Orientacion,
): { principales: CifraIg[]; secundarias: CifraIg[] } {
  // En un solo día la mini-gráfica enseña los 14 días hasta él.
  const pg = periodoGrafica(t.hoy, r.rango);
  const serie = (clave: ClaveSerie) => serieDiaria(t, pg, clave, o).map((p) => p.valor);
  const s = r.seguidores;
  const cuando = cap(textoRango(r.rango));
  const nPosts = t.posts.length;
  const postsTexto = `${nPosts} ${nPosts === 1 ? 'post' : 'posts'}`;

  // Si el historial empieza a medio periodo, el cambio es «desde» ese día.
  const historialCorto = s.desde != null && s.desde !== sumarDias(r.actual.desde, -1);
  const seguidores: CifraIg = {
    id: 'seguidores',
    label: 'Seguidores',
    valor: entero(s.ahora),
    cambio: cambioEnUnidades(s.cambio),
    detalle:
      s.altas != null && s.bajas != null
        ? `${entero(s.altas)} te siguieron · ${entero(s.bajas)} se fueron`
        : s.cambio == null
          ? 'El historial empieza hoy'
          : historialCorto
            ? `Desde el ${fechaCorta(s.desde!)}`
            : cuando,
    serie: serie('seguidores'),
  };

  // Likes y comentarios del periodo: de Meta con permiso o de las fotos
  // horarias sin él. Si todavía no hay ninguna de las dos, el total de por vida.
  const hayDiario = t.dias.some((d) => d.likesPosts != null || d.likes != null);
  const conteo = (
    id: 'likes' | 'comentarios',
    label: string,
    c: Comparado,
    total: number | null,
  ): CifraIg =>
    c.actual != null
      ? {
          id,
          label,
          valor: entero(c.actual),
          cambio: cambio(c.actual, c.anterior),
          detalle: `${cuando} · ${entero(total)} en total`,
          serie: serie(id),
        }
      : {
          id,
          label: `${label} en total`,
          valor: entero(total),
          cambio: null,
          detalle: hayDiario
            ? `En tus ${postsTexto} · sin datos de este periodo`
            : `En tus ${postsTexto} · los del día, desde mañana`,
        };

  const insights = hayInsights(t, r.actual);
  const vps = r.vistasPorSeguidor;
  const totalVistas = vps ? vps.seguidores + vps.noSeguidores : 0;
  const vistas: CifraIg = insights
    ? {
        id: 'vistas',
        label: 'Vistas',
        valor: entero(r.vistas.actual),
        cambio: cambio(r.vistas.actual, r.vistas.anterior),
        detalle:
          vps && totalVistas
            ? `${Math.round((vps.noSeguidores / totalVistas) * 100)}% de cuentas que no te siguen`
            : cuando,
        serie: serie('vistas'),
      }
    : {
        id: 'vistas',
        label: 'Vistas',
        valor: '—',
        cambio: null,
        detalle: 'Instagram solo las da con el permiso de estadísticas',
        bloqueada: true,
      };

  const principales = [
    seguidores,
    conteo('likes', 'Likes', r.likes, r.likesTotal),
    conteo('comentarios', 'Comentarios', r.comentarios, r.comentariosTotal),
    vistas,
  ];

  if (insights) {
    const alcanceUnico = r.alcance.actual != null;
    const alcance = alcanceUnico ? r.alcance.actual : promedioDiario(t, r.actual, 'alcance');
    const numero = (id: string, label: string, c: Comparado, detalle: string, clave: ClaveSerie): CifraIg => ({
      id,
      label,
      valor: entero(c.actual),
      cambio: cambio(c.actual, c.anterior),
      detalle,
      serie: serie(clave),
    });
    return {
      principales,
      secundarias: [
        {
          id: 'alcance',
          label: alcanceUnico ? 'Alcance' : 'Alcance por día',
          valor: entero(alcance == null ? null : Math.round(alcance)),
          cambio: alcanceUnico ? cambio(r.alcance.actual, r.alcance.anterior) : null,
          detalle: alcanceUnico ? 'Cuentas distintas que te vieron' : 'Promedio: Meta no da el total de este periodo',
          serie: serie('alcance'),
        },
        numero(
          'interacciones',
          'Interacciones',
          r.interacciones,
          r.cuentasInteraccion.actual != null
            ? `De ${entero(r.cuentasInteraccion.actual)} cuentas distintas`
            : 'Likes, comentarios, guardados y más',
          'interacciones',
        ),
        numero('guardados', 'Guardados', r.guardados, 'Veces que guardaron algo tuyo', 'guardados'),
        numero('compartidos', 'Compartidos', r.compartidos, 'Veces que lo mandaron o repostearon', 'compartidos'),
      ],
    };
  }

  // Sin permiso de estadísticas: lo que sí da la API básica. «Típico» es la
  // mediana: dos reels virales no inflan lo que saca un post normal.
  const ultimos = t.posts.slice(0, 12);
  const mejor = [...t.posts].sort((a, b) => interaccionesDe(b) - interaccionesDe(a))[0];
  const sinPublicar = diasSinPublicar(t.posts, t.generadoEn);
  return {
    principales,
    secundarias: [
      {
        id: 'posts',
        label: 'Publicaciones',
        valor: entero(r.posts.actual),
        cambio: cambio(r.posts.actual, r.posts.anterior),
        detalle:
          sinPublicar == null
            ? 'Todavía no publicas nada'
            : sinPublicar === 0
              ? `${cuando} · la última hoy`
              : `${cuando} · la última hace ${sinPublicar} ${sinPublicar === 1 ? 'día' : 'días'}`,
      },
      {
        id: 'tipico',
        label: 'Un post típico',
        valor: entero(mediana(ultimos.map(interaccionesDe))),
        cambio: null,
        detalle: `Likes y comentarios, de tus últimos ${ultimos.length}`,
        serie: [...ultimos].reverse().map(interaccionesDe),
      },
      {
        id: 'tasa',
        label: 'Interacción típica',
        valor: porcentaje(mediana(ultimos.map((p) => tasaDe(p, s.ahora))), 0),
        cambio: null,
        detalle: 'Por cada 100 seguidores, en un post típico',
      },
      {
        id: 'mejor',
        label: 'Tu mejor post',
        valor: entero(mejor ? interaccionesDe(mejor) : null),
        cambio: null,
        detalle: mejor ? `«${citaCorta(mejor.caption || 'Sin texto')}»` : 'Todavía no hay',
      },
    ],
  };
}

export type RenglonDesglose = { id: string; label: string; actual: number | null; cambio: Cambio | null };

/** De qué están hechas las interacciones del periodo. */
export function desgloseInteracciones(r: Resumen): RenglonDesglose[] {
  const fila = (id: string, label: string, c: Comparado): RenglonDesglose => ({
    id,
    label,
    actual: c.actual,
    cambio: cambio(c.actual, c.anterior),
  });
  return [
    fila('likes', 'Likes', r.likes),
    fila('comentarios', 'Comentarios', r.comentarios),
    fila('guardados', 'Guardados', r.guardados),
    fila('compartidos', 'Compartidos', r.compartidos),
    fila('respuestas', 'Respuestas a historias', r.respuestas),
    fila('toquesEnlace', 'Toques al enlace', r.toquesEnlace),
    fila('reposts', 'Reposts', r.reposts),
  ].filter((f) => f.actual != null);
}

export type BandejaPeriodo = Required<BandejaDia>;

export function bandejaDelPeriodo(t: TableroIg, p: Periodo): BandejaPeriodo {
  const total: BandejaPeriodo = { personasNuevas: 0, disparos: 0 };
  for (const [fecha, d] of Object.entries(t.bandeja)) {
    if (!enPeriodo(fecha, p)) continue;
    total.personasNuevas += d.personasNuevas ?? 0;
    total.disparos += d.disparos ?? 0;
  }
  return total;
}

/** Las métricas que la gráfica «Día por día» puede enseñar con lo que hay. */
export function metricasDisponibles(t: TableroIg): ClaveSerie[] {
  const conInsights = t.dias.some((d) => d.insightsEn != null);
  const conDiario = t.dias.some((d) => d.likesPosts != null);
  if (conInsights) {
    return ['vistas', 'likes', 'comentarios', 'seguidores', 'alcance', 'guardados', 'compartidos', 'interacciones', 'toquesEnlace'];
  }
  return conDiario ? ['likes', 'comentarios', 'seguidores'] : ['seguidores'];
}
