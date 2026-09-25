import { matchesKeyword, matchOptionByText, pickPublicReply, selectAutomation } from '../src/lib/engine/matcher.ts';
import { interpolate } from '../src/lib/engine/interpolate.ts';
import { buildStarterFlow } from '../src/lib/engine/starter-flow.ts';
import { outputHandles } from '../src/lib/engine/puertos.ts';
import {
  buildLanzamientoRepo,
  LANZAMIENTO_ESPERA_SEGUIMIENTO,
  LANZAMIENTO_TIEMPO_RESPUESTA,
} from '../src/lib/engine/plantilla-lanzamiento.ts';

let pass = 0, fail = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  if (!ok) console.log(`  ✗ ${name}\n      esperado: ${JSON.stringify(expected)}\n      obtenido: ${JSON.stringify(actual)}`);
};

console.log('\n— Coincidencia de palabras clave —');
check('acentos: "informacion" ≈ "información"', matchesKeyword('quiero INFORMACION', 'información', 'contains', false), true);
check('palabra completa, no subcadena', matchesKeyword('me interesa el precioso cuadro', 'precio', 'contains', false), false);
check('contains sí encuentra la palabra suelta', matchesKeyword('cual es el precio?', 'precio', 'contains', false), true);
check('exact exige mensaje idéntico', matchesKeyword('precio', 'precio', 'exact', false), true);
check('exact rechaza texto extra', matchesKeyword('el precio', 'precio', 'exact', false), false);
check('starts_with', matchesKeyword('HOLA que tal', 'hola', 'starts_with', false), true);
check('emoji dentro del texto', matchesKeyword('quiero comprar 🔥', 'comprar', 'contains', false), true);
check('regex inválida no truena', matchesKeyword('lo que sea', '([', 'regex', false), false);
check('regex válida', matchesKeyword('mi tel es 8112345678', '\\d{10}', 'regex', false), true);
check('caseSensitive respeta mayúsculas', matchesKeyword('precio', 'PRECIO', 'exact', true), false);

console.log('\n— Selección de automatización —');
const base = { enabled: true, cooldownMs: 0, stats: { triggered: 0, lastTriggeredAt: null }, createdAt: 0, updatedAt: 0 };
const mk = (id, type, keywords, priority) => ({
  ...base, id, name: id, flowId: `f_${id}`, priority,
  trigger: { type, keywords, matchType: 'contains', caseSensitive: false, postIds: [] },
});
const list = [
  mk('precios', 'dm_keyword', ['precio', 'costo'], 1),
  mk('envios', 'dm_keyword', ['envio', 'entrega'], 2),
  { ...mk('fallback', 'default_reply', [], 99) },
];
const ctx = (text, extra = {}) => ({ text, triggerType: 'dm_keyword', isFirstMessage: false, lastTriggeredByAutomation: {}, ...extra });

check('elige por palabra clave', selectAutomation(list, ctx('cuanto cuesta el envio?'))?.id, 'envios');
check('respeta prioridad', selectAutomation([...list].reverse(), ctx('precio y envio'))?.id, 'precios');
check('cae al fallback', selectAutomation(list, ctx('hola buenas tardes'))?.id, 'fallback');
check('respeta cooldown', selectAutomation(
  [{ ...list[0], cooldownMs: 3600000 }],
  ctx('precio', { lastTriggeredByAutomation: { precios: Date.now() - 60000 } }),
)?.id, undefined);
check('cooldown vencido sí dispara', selectAutomation(
  [{ ...list[0], cooldownMs: 3600000 }],
  ctx('precio', { lastTriggeredByAutomation: { precios: Date.now() - 7200000 } }),
)?.id, 'precios');
check('deshabilitada se ignora', selectAutomation([{ ...list[0], enabled: false }], ctx('precio')), null);
check('comentario no dispara reglas de DM', selectAutomation(list, ctx('precio', { triggerType: 'comment_keyword' })), null);

const porPost = [{ ...mk('post', 'comment_keyword', ['info'], 1), trigger: { type: 'comment_keyword', keywords: ['info'], matchType: 'contains', caseSensitive: false, postIds: ['POST_A'] } }];
check('filtra por publicación', selectAutomation(porPost, ctx('info', { triggerType: 'comment_keyword', postId: 'POST_B' })), null);
check('acierta la publicación correcta', selectAutomation(porPost, ctx('info', { triggerType: 'comment_keyword', postId: 'POST_A' }))?.id, 'post');

console.log('\n— Variables —');
const contact = { id: '1', username: 'lucia_prueba', name: 'Lucía Hernández Prieto', profilePic: null, tags: [], fields: { ciudad: 'Guadalajara' }, subscribed: true, firstSeenAt: 0, lastMessageAt: 0 };
check('nombre de pila', interpolate('Hola {{first_name}}!', { contact, vars: {} }), 'Hola Lucía!');
check('campo del contacto', interpolate('Envío a {{ciudad}}', { contact, vars: {} }), 'Envío a Guadalajara');
check('variable del run gana', interpolate('{{ciudad}}', { contact, vars: { ciudad: 'CDMX' } }), 'CDMX');
check('variable inexistente queda vacía', interpolate('[{{nada}}]', { contact, vars: {} }), '[]');
check('espacios dentro de las llaves', interpolate('{{ username }}', { contact, vars: {} }), 'lucia_prueba');

console.log('\n— Respuestas públicas —');
check('elige al azar entre varias', pickPublicReply({ publicReplies: ['a', 'b', 'c'] }, () => 0.5), 'b');
check('el azar en el borde no se sale de la lista', pickPublicReply({ publicReplies: ['a', 'b'] }, () => 0.99999), 'b');
check('ignora respuestas vacías', pickPublicReply({ publicReplies: ['  ', 'hola'] }, () => 0), 'hola');
check('lee el formato de una sola respuesta', pickPublicReply({ publicReplies: [], publicReply: '¡Listo!' }), '¡Listo!');
check('sin respuestas no contesta', pickPublicReply({ publicReplies: ['', ' '] }), null);

console.log('\n— Botones escritos a mano —');
const opciones = [{ id: 'check', title: 'Ya te sigo ✅' }, { id: 'no', title: 'Todavía no' }];
check('sin emoji ni mayúsculas', matchOptionByText(opciones, 'ya te sigo'), 'check');
check('con acentos y signos', matchOptionByText(opciones, '¡TODAVÍA NO!'), 'no');
check('otro texto no cuenta', matchOptionByText(opciones, 'ya te seguí'), null);

console.log('\n— Flujo inicial —');
const ruta = (flow) => flow.edges.map((e) => `${e.source}:${e.sourceHandle}→${e.target}`);
check('solo mensaje: disparador → texto', ruta(buildStarterFlow({ message: 'Aquí tienes 👇' })), ['trigger:next→msg_1']);
const completo = buildStarterFlow({
  message: 'Aquí va',
  link: { title: 'Descargar la guía completa ahora', url: 'https://example.com/guias' },
  followGate: {},
});
check('pedir que siga sale por «follows»', ruta(completo), ['trigger:next→gate_1', 'gate_1:follows→msg_1']);
check('el enlace va en un nodo «Enviar enlace»', completo.nodes.find((n) => n.id === 'msg_1')?.type, 'send_link');
check('el título del botón cabe en 20 caracteres', completo.nodes.find((n) => n.id === 'msg_1')?.data.linkTitle?.length, 20);

console.log('\n— Plantilla «Lanzamiento de un repo» —');
const plantilla = buildLanzamientoRepo({ repo: 'https://github.com/ejemplo/mi-bot/' });
const nodoDe = new Map(plantilla.nodes.map((n) => [n.id, n]));
const salidas = (id) => plantilla.edges.filter((e) => e.source === id);

check('limpia la URL del repo', nodoDe.get('c_github')?.data.url, 'https://api.github.com/repos/ejemplo/mi-bot');
check('palabra y nombre salen del repo', [plantilla.name, plantilla.trigger.keywords], ['Comentan MI-BOT → repo', ['MI-BOT']]);
check('un repo mal escrito se rechaza', (() => { try { buildLanzamientoRepo({ repo: 'mi-bot' }); return 'pasó'; } catch { return 'rechazado'; } })(), 'rechazado');
check('ids de nodo únicos', nodoDe.size, plantilla.nodes.length);
check('usa los 16 tipos de nodo', new Set(plantilla.nodes.map((n) => n.type)).size, 16);

check('toda arista sale de un puerto que existe', plantilla.edges.filter((e) => {
  const n = nodoDe.get(e.source);
  return !n || !nodoDe.has(e.target) || !outputHandles(n.type, n.data).some((h) => h.id === e.sourceHandle);
}).map((e) => e.id), []);
check('ningún puerto lleva a dos lugares', plantilla.edges.filter((e, i, todas) =>
  todas.findIndex((o) => o.source === e.source && o.sourceHandle === e.sourceHandle) !== i,
).map((e) => e.id), []);
check('ningún puerto queda suelto', plantilla.nodes.flatMap((n) =>
  outputHandles(n.type, n.data).filter((h) => !salidas(n.id).some((e) => e.sourceHandle === h.id)).map((h) => `${n.id}:${h.id}`),
), []);

const alcanzados = new Set(['trigger']);
for (let cola = ['trigger']; cola.length; ) {
  for (const e of salidas(cola.shift())) if (!alcanzados.has(e.target)) { alcanzados.add(e.target); cola.push(e.target); }
}
check('todo nodo se alcanza desde el disparador', plantilla.nodes.filter((n) => !alcanzados.has(n.id)).map((n) => n.id), []);

// La primera salida de un nodo con botones es a donde cae quien escribe otra cosa.
check('quien escribe en vez de elegir cae en «Solo curioseo»', salidas('segmento')[0]?.target, 'd_resumen');
check('el primer mensaje del comentario es texto', nodoDe.get(salidas('trigger')[0]?.target)?.type, 'send_text');

// Tarjeta de 240 × ~150: con eso ninguna se encima en el lienzo.
const encimadas = plantilla.nodes.flatMap((a, i) => plantilla.nodes.slice(i + 1)
  .filter((b) => Math.abs(a.position.x - b.position.x) < 260 && Math.abs(a.position.y - b.position.y) < 170)
  .map((b) => `${a.id}/${b.id}`));
check('ningún nodo se encima con otro', encimadas, []);

const bytes = (s) => new TextEncoder().encode(s ?? '').length;
check('textos de menos de 1000 bytes', plantilla.nodes.filter((n) => bytes(n.data.text) > 1000).map((n) => n.id), []);
check('máximo 3 botones', plantilla.nodes.filter((n) => (n.data.buttons?.length ?? 0) > 3).map((n) => n.id), []);
check('botones y opciones de máximo 20 caracteres', plantilla.nodes.flatMap((n) =>
  [...(n.data.buttons ?? []), ...(n.data.quickReplies ?? []), { title: n.data.linkTitle ?? '' }, { title: n.data.buttonTitle ?? '' }]
    .filter((b) => b.title.length > 20).map((b) => `${n.id}: ${b.title}`),
), []);
check('el seguimiento sale dentro de la ventana de 24 h', LANZAMIENTO_TIEMPO_RESPUESTA + LANZAMIENTO_ESPERA_SEGUIMIENTO < 24 * 3600000, true);
check('la espera del seguimiento es la de la constante', nodoDe.get('h_espera')?.data.delayMs, LANZAMIENTO_ESPERA_SEGUIMIENTO);

console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass} pruebas pasaron, ${fail} fallaron\n`);
process.exit(fail === 0 ? 0 : 1);
