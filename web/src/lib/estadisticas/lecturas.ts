/**
 * «Lo importante»: el tablero dicho en frases. Cada lectura sale de los mismos
 * números que pintan las gráficas y solo afirma lo que esos números dicen
 * (nada de «publica a las 7 y vas a crecer»). Puro, lo usan escritorio y celular.
 */

import {
  diasSinPublicar,
  entero,
  esUnDia,
  fechaCorta,
  interaccionesDe,
  porDiaSemana,
  porTipo,
  postsEnPeriodo,
  sumarDias,
  textoRango,
  type Resumen,
} from './calculos';
import { NOMBRE_TIPO_PLURAL, type TableroIg } from './tipos';

export type Lectura = {
  id: string;
  texto: string;
  /** bien = va para arriba · ojo = algo que atender · dato = solo informa. */
  tono: 'bien' | 'ojo' | 'dato';
};

const cita = (s: string, n = 48) => {
  const limpio = s.replace(/\s+/g, ' ').trim();
  return limpio.length > n ? `${limpio.slice(0, n - 1).trimEnd()}…` : limpio;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** «1,204 vistas, 45 likes y 6 comentarios»: solo lo que existe. */
function enumerar(partes: string[]): string {
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}` : (partes[0] ?? '');
}

export function lecturas(t: TableroIg, r: Resumen): Lectura[] {
  const salida: Lectura[] = [];
  const ahora = t.generadoEn;
  const periodoTexto = textoRango(r.rango);

  // Lo que se preguntó primero: cuántas vistas, likes y comentarios.
  const conteos = [
    r.vistas.actual != null && `${entero(r.vistas.actual)} vistas`,
    r.likes.actual != null && `${entero(r.likes.actual)} likes`,
    r.comentarios.actual != null && `${entero(r.comentarios.actual)} comentarios`,
  ].filter((x): x is string => Boolean(x));
  if (conteos.length) {
    salida.push({
      id: 'conteos',
      tono: 'dato',
      texto:
        r.rango === 'hoy'
          ? `Hoy llevas ${enumerar(conteos)}.`
          : `${cap(periodoTexto)} tuviste ${enumerar(conteos)}.`,
    });
  }

  // Seguidores en el periodo (o desde que hay historial).
  const { cambio, desde } = r.seguidores;
  if (cambio != null) {
    const cuando =
      desde && desde !== sumarDias(r.actual.desde, -1) ? `desde el ${fechaCorta(desde)}` : periodoTexto;
    salida.push(
      cambio > 0
        ? { id: 'seguidores', tono: 'bien', texto: `Ganaste ${entero(cambio)} seguidores ${cuando}.` }
        : cambio < 0
          ? { id: 'seguidores', tono: 'ojo', texto: `Perdiste ${entero(-cambio)} seguidores ${cuando}.` }
          : { id: 'seguidores', tono: 'dato', texto: `Tus seguidores no se han movido ${cuando}.` },
    );
  } else if (!t.estado.conPermiso) {
    salida.push({
      id: 'seguidores',
      tono: 'dato',
      texto:
        'Desde hoy el panel guarda cada hora tus seguidores y los likes y comentarios de cada post: desde mañana ves cuánto llega cada día.',
    });
  }

  // Constancia.
  const sinPublicar = diasSinPublicar(t.posts, ahora);
  const enPeriodo = postsEnPeriodo(t.posts, r.enVivo).length;
  if (sinPublicar != null && sinPublicar >= 14) {
    salida.push({ id: 'constancia', tono: 'ojo', texto: `Tu última publicación fue hace ${sinPublicar} días.` });
  } else if (enPeriodo > 0 && esUnDia(r.rango)) {
    salida.push({
      id: 'constancia',
      tono: 'dato',
      texto: `${cap(periodoTexto)} publicaste ${enPeriodo} ${enPeriodo === 1 ? 'vez' : 'veces'}.`,
    });
  } else if (enPeriodo > 0 && !esUnDia(r.rango)) {
    const porSemana = enPeriodo / (r.rango / 7);
    salida.push({
      id: 'constancia',
      tono: 'dato',
      texto: `Publicaste ${enPeriodo} ${enPeriodo === 1 ? 'vez' : 'veces'} en ${r.rango} días (${porSemana.toLocaleString('es-MX', { maximumFractionDigits: 1 })} por semana).`,
    });
  }

  // Qué tipo de post jala más (con al menos dos de cada uno para comparar).
  // Se comparan posts típicos (medianas), no promedios que infla un viral.
  const tipos = porTipo(t.posts).filter((g) => g.n >= 2);
  if (tipos.length >= 2 && tipos[1].interacciones > 0) {
    const [mejor, segundo] = tipos;
    const veces = Math.round(mejor.interacciones / segundo.interacciones);
    if (veces >= 2) {
      salida.push({
        id: 'tipo',
        tono: 'bien',
        texto: `Tus ${NOMBRE_TIPO_PLURAL[mejor.tipo].toLowerCase()} sacan ${veces} veces más interacciones que tus ${NOMBRE_TIPO_PLURAL[segundo.tipo].toLowerCase()}: ${entero(mejor.interacciones)} contra ${entero(segundo.interacciones)} en un post típico.`,
      });
    }
  }

  // Quién te ve.
  const vistas = r.vistasPorSeguidor;
  if (vistas && vistas.seguidores + vistas.noSeguidores > 0) {
    const pct = Math.round((vistas.noSeguidores / (vistas.seguidores + vistas.noSeguidores)) * 100);
    salida.push({
      id: 'descubrimiento',
      tono: pct >= 50 ? 'bien' : 'dato',
      texto: `El ${pct}% de tus vistas viene de cuentas que no te siguen.`,
    });
  }

  // La mejor publicación.
  const mejorPost = [...t.posts].sort((a, b) => interaccionesDe(b) - interaccionesDe(a))[0];
  if (mejorPost && interaccionesDe(mejorPost) > 0) {
    const nombre = mejorPost.caption ? `«${cita(mejorPost.caption)}»` : 'una publicación sin texto';
    salida.push({
      id: 'mejor',
      tono: 'dato',
      texto: `Tu publicación con más interacciones es ${nombre}: ${entero(interaccionesDe(mejorPost))}.`,
    });
  }

  // El día que mejor funciona, solo con muestra suficiente: con dos posts,
  // uno viral decide solo.
  if (t.posts.length >= 8) {
    const dias = porDiaSemana(t.posts).filter((d) => d.n >= 3 && d.tipico != null);
    const mejor = dias.sort((a, b) => (b.tipico ?? 0) - (a.tipico ?? 0))[0];
    // «El mejor» solo si le gana a otro día con muestra, no por ser el único.
    if (mejor && dias.length >= 2) {
      salida.push({
        id: 'dia',
        tono: 'dato',
        texto: `Lo que publicas en ${mejor.largo} es lo que mejor te va (${mejor.n} posts, ${entero(mejor.tipico)} interacciones el típico).`,
      });
    }
  }

  return salida.slice(0, 5);
}
