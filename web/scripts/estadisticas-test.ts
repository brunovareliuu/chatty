// Las cuentas del tablero de Instagram (`src/lib/estadisticas/calculos.ts`).
// Corre con: npm run test:estadisticas  (o dentro de npm run test)
import {
  altasYBajas,
  cadencia,
  cambio,
  cambioEnUnidades,
  compacto,
  diasEntre,
  fechaIg,
  filasPorDia,
  inicioDiaIg,
  mediana,
  orientacionAltasBajas,
  periodo,
  periodoGrafica,
  periodoHastaHoy,
  recibidosPorDia,
  porDiaSemana,
  porHorario,
  porTipo,
  postsEnPeriodo,
  resumen,
  serieSeguidores,
  sumarDias,
  textoRango,
  valorDia,
} from '../src/lib/estadisticas/calculos.ts';
import {
  desgloseDe,
  grupoDe,
  pedirMetricas,
  pedirOpcional,
  tipoDe,
  valorDe,
} from '../src/lib/estadisticas/meta.ts';

let pass = 0, fail = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++;
  else fail++;
  if (!ok) console.log(`  ✗ ${name}\n      esperado: ${JSON.stringify(expected)}\n      obtenido: ${JSON.stringify(actual)}`);
};

const HORA = 3_600_000;

console.log('\n— Días de Instagram (Pacífico) —');
check('las 23:30 del Pacífico siguen siendo el día anterior', fechaIg(Date.parse('2026-09-23T06:30:00Z')), '2026-09-22');
check('pasada la medianoche del Pacífico ya es el día nuevo', fechaIg(Date.parse('2026-09-23T07:30:00Z')), '2026-09-23');
check('verano: el día arranca a las 07:00 UTC', inicioDiaIg('2026-09-23'), Date.UTC(2026, 8, 23, 7));
check('invierno: el día arranca a las 08:00 UTC', inicioDiaIg('2026-12-01'), Date.UTC(2026, 11, 1, 8));
check('el día del cambio de marzo arranca en horario de invierno', inicioDiaIg('2026-03-08'), Date.UTC(2026, 2, 8, 8));
check('el día del cambio de marzo dura 23 h', (inicioDiaIg('2026-03-09') - inicioDiaIg('2026-03-08')) / HORA, 23);
check('el día del cambio de noviembre dura 25 h', (inicioDiaIg('2026-11-02') - inicioDiaIg('2026-11-01')) / HORA, 25);
check('sumarDias cruza el fin de mes', sumarDias('2026-03-01', -1), '2026-02-28');
check('diasEntre', diasEntre('2026-09-01', '2026-09-23'), 22);

console.log('\n— Periodos —');
check('7 días terminan ayer', periodo('2026-09-23', 7), { desde: '2026-09-16', hasta: '2026-09-22' });
check('y se comparan con los 7 de antes', periodo('2026-09-23', 7, true), { desde: '2026-09-09', hasta: '2026-09-15' });
check('lo que se cuenta en vivo sí incluye hoy', periodoHastaHoy('2026-09-23', 7), { desde: '2026-09-17', hasta: '2026-09-23' });
check('y su anterior son los 7 de antes', periodoHastaHoy('2026-09-23', 7, true), { desde: '2026-09-10', hasta: '2026-09-16' });
check('hoy es hoy', periodo('2026-09-23', 'hoy'), { desde: '2026-09-23', hasta: '2026-09-23' });
check('hoy se compara con ayer', periodo('2026-09-23', 'hoy', true), { desde: '2026-09-22', hasta: '2026-09-22' });
check('ayer contra antier', [periodo('2026-09-23', 'ayer'), periodo('2026-09-23', 'ayer', true)], [
  { desde: '2026-09-22', hasta: '2026-09-22' },
  { desde: '2026-09-21', hasta: '2026-09-21' },
]);
check('un solo día: la gráfica enseña los 14 hasta él', periodoGrafica('2026-09-23', 'ayer'), { desde: '2026-09-09', hasta: '2026-09-22' });
check('varios días: la gráfica es el periodo', periodoGrafica('2026-09-23', 7), periodo('2026-09-23', 7));
check('texto del periodo', [textoRango('hoy'), textoRango('ayer'), textoRango(28)], ['hoy', 'ayer', 'en 28 días']);

const post = (id: string, iso: string, likes: number, comentarios: number, tipo = 'reel') => ({
  id, tipo, caption: id, permalink: null, fecha: Date.parse(iso), miniatura: null,
  likes, comentarios, metricas: null, metricasEn: null,
});
const posts = [
  post('lunes-manana', '2026-06-22T15:12:00+0000', 31, 9, 'carrusel'), // 09:12 en el centro de México
  post('miercoles-tarde', '2026-06-17T22:05:00+0000', 480, 62), // 16:05
  post('lunes-noche', '2026-06-15T23:20:00+0000', 24, 6, 'carrusel'), // 17:20 → tarde
  post('sabado-noche', '2026-06-14T02:10:00+0000', 90, 16), // sábado 13 a las 20:10 (en UTC ya es domingo)
];
check('un post a las 00:30 del Pacífico cuenta en ese día',
  postsEnPeriodo([post('x', '2026-09-22T07:30:00Z', 1, 1)], { desde: '2026-09-22', hasta: '2026-09-22' }).length, 1);

console.log('\n— Qué funciona —');
const dias = porDiaSemana(posts);
check('lunes: dos posts, el típico 35', [dias[0].n, dias[0].tipico], [2, 35]);
check('miércoles: el reel de 542', [dias[2].n, dias[2].tipico], [1, 542]);
check('la mediana no se infla con un viral', mediana([10, 12, 14, 6000]), 13);
check('mediana impar', mediana([3, null, 1, 2]), 2);
check('mediana sin datos', mediana([null]), null);
check('sábado en la hora local aunque en UTC ya sea domingo', [dias[5].n, dias[6].n], [1, 0]);
const franjas = Object.fromEntries(porHorario(posts).map((f) => [f.label, f.n]));
check('franjas en la hora local', franjas, { Mañana: 1, Tarde: 2, Noche: 1, Madrugada: 0 });
check('por tipo, del mejor al peor', porTipo(posts).map((g) => [g.tipo, g.n, g.interacciones]), [
  ['reel', 2, 324],
  ['carrusel', 2, 35],
]);
const semanas = cadencia(posts, Date.parse('2026-06-24T18:00:00Z'), 3);
check('cadencia: semanas que empiezan en lunes', semanas.map((s) => s.inicio), ['2026-06-08', '2026-06-15', '2026-06-22']);
check('cadencia: cuántos por semana', semanas.map((s) => s.n), [1, 2, 1]);

console.log('\n— Seguidores —');
const tablero = (diasIg: object[], seguidores: number | null, hoy = '2026-09-23') => ({
  hoy, generadoEn: inicioDiaIg(hoy) + 12 * HORA,
  perfil: { id: '1', username: 'x', nombre: null, foto: null, bio: null, sitio: null, seguidores, siguiendo: null, publicaciones: null },
  estado: { conPermiso: true, motivoSinPermiso: null, perfilEn: null, insightsEn: null, historialDesde: null, historialCompleto: true, ultimoError: null },
  dias: diasIg, posts: [], historias: [], audiencia: null, unicos: {}, bandeja: {}, automatizaciones: [],
});
const neto = (f: number, nf: number) => ({ FOLLOWER: f, NON_FOLLOWER: nf });
const reconstruida = serieSeguidores(
  tablero(
    [
      { fecha: '2026-09-21', altasBajas: neto(5, 2) },
      { fecha: '2026-09-22', altasBajas: neto(5, 2) },
      { fecha: '2026-09-23', altasBajas: neto(1, 0), seguidores: 1250 },
    ],
    1250,
  ) as never,
  'normal',
);
check('hacia atrás se resta el neto del día siguiente', reconstruida.map((p) => [p.fecha, p.valor, p.estimado]), [
  ['2026-09-21', 1246, true],
  ['2026-09-22', 1249, true],
  ['2026-09-23', 1250, false],
]);
check('altas y bajas leídas al revés', altasYBajas({ fecha: 'x', altasBajas: neto(5, 2) }, 'invertida'), { altas: 2, bajas: 5 });

// Fotos diarias que solo cuadran si FOLLOWER fueran las bajas.
const alReves = Array.from({ length: 8 }, (_, i) => ({
  fecha: sumarDias('2026-09-10', i),
  seguidores: 1150 + i * 4,
  altasBajas: neto(1, 5),
}));
check('las fotos del cron voltean la lectura cuando la contradicen', orientacionAltasBajas(alReves as never), 'invertida');
check('con pocos días no se voltea nada', orientacionAltasBajas(alReves.slice(0, 4) as never), 'normal');
check('si cuadra, se queda normal', orientacionAltasBajas(alReves.map((d) => ({ ...d, altasBajas: neto(5, 1) })) as never), 'normal');

console.log('\n— Resumen de un periodo —');
const catorce = Array.from({ length: 14 }, (_, i) => {
  const fecha = sumarDias('2026-09-09', i);
  return { fecha, vistas: fecha >= '2026-09-16' ? 10 : 5, insightsEn: 1, altasBajas: neto(2, 1) };
});
const r = resumen(tablero(catorce, 1260) as never, 7, 'normal');
check('vistas del periodo y del anterior', [r.vistas.actual, r.vistas.anterior], [70, 35]);
check('altas y bajas del periodo', [r.seguidores.altas, r.seguidores.bajas], [14, 7]);
check('seguidores: hoy contra el cierre del día antes del periodo (hoy sin altas cuenta como cero)', [r.seguidores.ahora, r.seguidores.alInicio, r.seguidores.cambio], [1260, 1253, 7]);
check('cambio porcentual', cambio(70, 35), { texto: '+100%', sube: true });
check('de cero a algo es «nuevo»', cambio(5, 0), { texto: 'nuevo', sube: true });
check('sin anterior no hay cambio', cambio(5, null), null);
check('seguidores en unidades', cambioEnUnidades(-3), { texto: '−3', sube: false });
const soloHoy = resumen(tablero([{ fecha: '2026-09-23', seguidores: 1249 }], 1249) as never, 28, 'normal');
check('con solo la foto de hoy no hay cambio que decir (ni «igual»)', [soloHoy.seguidores.cambio, soloHoy.seguidores.desde], [null, null]);
const desdeAyer = resumen(
  tablero([{ fecha: '2026-09-21', seguidores: 1240 }, { fecha: '2026-09-23', seguidores: 1249 }], 1249) as never,
  28,
  'normal',
);
check('con historial corto, el cambio es desde el primer día conocido', [desdeAyer.seguidores.cambio, desdeAyer.seguidores.desde], [9, '2026-09-21']);

const soloHoyR = resumen(tablero([{ fecha: '2026-09-23', likesPosts: 5, seguidores: 1249 }], 1249) as never, 'hoy', 'normal');
check('«hoy» no se compara en % (va a medias)', [soloHoyR.likes.actual, soloHoyR.likes.anterior], [5, null]);

console.log('\n— Likes y comentarios por día (fotos horarias) —');
check('sin permiso, los likes del día salen de las fotos', valorDia({ fecha: 'x', likesPosts: 12 }, 'likes'), 12);
check('con permiso manda lo de Meta', valorDia({ fecha: 'x', likes: 40, likesPosts: 12 }, 'likes'), 40);
const hoyMs = Date.parse('2026-09-23T20:00:00Z');
const recibidos = recibidosPorDia([
  // Post viejo: el primer día que el panel lo ve no se sabe cuánto ganó.
  { fecha: Date.parse('2026-06-17T22:05:00Z'), diario: { '2026-09-23': { l: 480, c: 62 }, '2026-09-24': { l: 484, c: 63 }, '2026-09-25': { l: 483, c: 63 } } },
  // Publicado el 23: ese día cuenta completo.
  { fecha: hoyMs, diario: { '2026-09-23': { l: 8, c: 5 }, '2026-09-24': { l: 30, c: 9 }, '2026-09-25': { l: 41, c: 9 } } },
]);
check('el primer día con un post viejo sin foto previa no sale', recibidos['2026-09-23'], undefined);
check('al día siguiente: la resta de cada post', recibidos['2026-09-24'], { likes: 26, comentarios: 5 });
check('un unlike resta', recibidos['2026-09-25'], { likes: 10, comentarios: 0 });
const soloNuevo = recibidosPorDia([{ fecha: hoyMs, diario: { '2026-09-23': { l: 8, c: 5 } } }]);
check('un post publicado ese día cuenta completo', soloNuevo['2026-09-23'], { likes: 8, comentarios: 5 });

console.log('\n— Día por día —');
const filas = filasPorDia(
  tablero(
    [
      { fecha: '2026-09-22', seguidores: 1240, likesPosts: 30, comentariosPosts: 4 },
      { fecha: '2026-09-23', seguidores: 1249, likesPosts: 12, comentariosPosts: 2, altasBajas: neto(10, 1) },
    ],
    1249,
  ) as never,
  { desde: '2026-09-22', hasta: '2026-09-23' },
  'normal',
);
check('del más nuevo al más viejo', filas.map((f) => f.fecha), ['2026-09-23', '2026-09-22']);
check('hoy: neto de Meta, likes de las fotos y marcado a medias', [filas[0].neto, filas[0].likes, filas[0].parcial], [9, 12, true]);
check('sin altas y bajas, el neto es la resta de fotos (si la hay)', filas[1].neto, null);

console.log('\n— Formato —');
check('debajo de 10 mil se escribe completo', compacto(9876), '9,876');
check('miles en español', compacto(17_342), '17.3 mil');
check('millones', compacto(1_250_000), '1.3 M');

console.log('\n— Respuestas de Meta (ejemplos de su documentación) —');
const alcance = {
  name: 'reach',
  period: 'day',
  total_value: {
    value: 224,
    breakdowns: [
      {
        dimension_keys: ['media_product_type'],
        results: [
          { dimension_values: ['CAROUSEL_CONTAINER'], value: 100 },
          { dimension_values: ['POST'], value: 124 },
        ],
      },
    ],
  },
};
check('total de la cuenta', valorDe(alcance), 224);
check('desglose por una dimensión', desgloseDe(alcance, 'media_product_type'), { CAROUSEL_CONTAINER: 100, POST: 124 });
check('dimensión que no viene', desgloseDe(alcance, 'follow_type'), null);
const demografia = {
  name: 'engaged_audience_demographics',
  period: 'lifetime',
  total_value: {
    breakdowns: [
      { dimension_keys: ['timeframe', 'country'], results: [{ dimension_values: ['LAST_90_DAYS', 'US'], value: 7 }] },
    ],
  },
};
check('demografía: la llave es la del corte, no el timeframe', desgloseDe(demografia, 'country'), { US: 7 });
check('demografía sin total', valorDe(demografia), null);
check('métrica de un post (values)', valorDe({ name: 'views', period: 'lifetime', values: [{ value: 5943 }] }), 5943);

console.log('\n— Tipos de publicación —');
const media = (media_type: string, media_product_type?: string) => ({ id: 'x', media_type, media_product_type }) as never;
check('reel', [tipoDe(media('VIDEO', 'REELS')), grupoDe(media('VIDEO', 'REELS'))], ['reel', 'REELS']);
check('carrusel', [tipoDe(media('CAROUSEL_ALBUM', 'FEED')), grupoDe(media('CAROUSEL_ALBUM', 'FEED'))], ['carrusel', 'FEED']);
check('video del feed', [tipoDe(media('VIDEO', 'FEED')), grupoDe(media('VIDEO', 'FEED'))], ['video', 'FEED']);
check('foto', tipoDe(media('IMAGE', 'FEED')), 'foto');
check('historia', grupoDe(media('IMAGE', 'STORY')), 'STORY');

console.log('\n— Métricas que Meta rechaza —');
const invalido = { isInvalidParameter: true, message: '(#100) metric[10] must be one of…' };
const sinPermiso = { isPermissionError: true, message: 'Application does not have permission' };
const insight = (name: string) => ({ name, total_value: { value: 1 } });
/** Un Meta de mentira: rechaza las métricas de `malas` y lleva la cuenta de las llamadas. */
const metaFalso = (malas: string[], error: object = invalido) => {
  const llamadas: string[] = [];
  const pedir = async (ms: string[]) => {
    llamadas.push(ms.join(','));
    if (ms.some((m) => malas.includes(m))) throw error;
    return ms.map(insight);
  };
  return { pedir, llamadas };
};
{
  const { pedir, llamadas } = metaFalso([]);
  const vetadas = new Set<string>();
  const datos = await pedirMetricas(pedir, ['views', 'reach'], vetadas);
  check('todas bien: una sola llamada', [datos.map((d) => d.name), llamadas.length], [['views', 'reach'], 1]);
}
{
  const { pedir, llamadas } = metaFalso(['reposts']);
  const vetadas = new Set<string>();
  const datos = await pedirMetricas(pedir, ['views', 'reach', 'reposts'], vetadas);
  check('una mala: se piden de una en una y las buenas llegan', datos.map((d) => d.name), ['views', 'reach']);
  check('la mala queda vetada', [...vetadas], ['reposts']);
  check('llamadas: la conjunta y una por métrica', llamadas.length, 4);
  const otra = metaFalso(['reposts']);
  await pedirMetricas(otra.pedir, ['views', 'reach', 'reposts'], vetadas);
  check('ya vetada, ni se pide', otra.llamadas, ['views,reach']);
}
{
  const { pedir } = metaFalso(['views', 'reach']);
  const vetadas = new Set<string>();
  let lanzo = false;
  try {
    await pedirMetricas(pedir, ['views', 'reach'], vetadas);
  } catch {
    lanzo = true;
  }
  check('si fallan todas, el problema no son las métricas: sube el error y no veta', [lanzo, vetadas.size], [true, 0]);
}
{
  const { pedir, llamadas } = metaFalso(['views'], sinPermiso);
  let error: unknown = null;
  try {
    await pedirMetricas(pedir, ['views', 'reach'], new Set());
  } catch (e) {
    error = e;
  }
  check('sin permiso sube de inmediato, sin reintentar métrica por métrica', [error === sinPermiso, llamadas.length], [true, 1]);
}
{
  const { pedir } = metaFalso(['views']);
  const vetadas = new Set<string>();
  const datos = await pedirOpcional(pedir, ['views'], vetadas);
  check('un desglose que no existe se veta y no rompe el día', [datos.length, [...vetadas]], [0, ['views']]);
}

console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass} pruebas pasaron, ${fail} fallaron\n`);
process.exit(fail === 0 ? 0 : 1);
