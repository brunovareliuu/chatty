import type { FlowEdge, FlowNode, FlowNodeData, NodeType, Trigger } from '../types';

/**
 * Plantilla «Lanzamiento de un repo»: comentan una palabra en tu reel y el
 * flujo les manda tu proyecto de GitHub. Es el flujo grande de demostración:
 * usa los 16 tipos de nodo.
 *
 *   comentario → respuesta privada → pedir que te siga → ¿qué te describe?
 *     ├─ Creo contenido  → pregunta seguidores → +10k: ofrece llamada → pasa a humano
 *     ├─ Tengo negocio   → nombre + DMs al día → +30: ofrece instalarlo → pasa a humano
 *     ├─ Programo        → estrellas en vivo de la API de GitHub → enlace + imagen
 *     └─ Solo curioseo   → qué es en corto → enlace
 *   → a las 18 h: «¿pudiste probarlo?» → listo / me atoré (humano) / aún no
 *
 * Pura, sin Firebase: la usan el script `scripts/cargar-plantilla.ts` y las
 * pruebas. Las posiciones están puestas a mano para que el lienzo se lea.
 */

export type OpcionesLanzamiento = {
  /** `usuario/repo` en GitHub. Tiene que ser público: el flujo lee sus estrellas y su imagen. */
  repo: string;
  /** Cómo se llama en los mensajes. Por omisión, el nombre del repo con mayúscula. */
  proyecto?: string;
  /** La palabra que comentan. Por omisión, el proyecto en mayúsculas. */
  palabra?: string;
  /** Lo que lee quien «solo curiosea». */
  descripcion?: string;
};

export type Plantilla = {
  name: string;
  trigger: Trigger;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

const HORA = 60 * 60 * 1000;

/**
 * Cuánto se espera una respuesta antes de tomar la salida «No contestó». Con
 * la espera del seguimiento suma menos de 24 h: el último mensaje sale dentro
 * de la ventana de Meta aunque la persona nunca conteste.
 */
export const LANZAMIENTO_TIEMPO_RESPUESTA = 4 * HORA;
export const LANZAMIENTO_ESPERA_SEGUIMIENTO = 18 * HORA;

/** Separación de la cuadrícula: la tarjeta mide 240 de ancho y hasta ~150 de alto. */
const COL = 300;
const FILA = 200;

export function buildLanzamientoRepo(opts: OpcionesLanzamiento): Plantilla {
  const repo = opts.repo.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new Error(`«${opts.repo}» no parece un repo de GitHub: escríbelo como usuario/repo`);
  }
  const nombreRepo = repo.split('/')[1];
  const proyecto = opts.proyecto?.trim() || nombreRepo.charAt(0).toUpperCase() + nombreRepo.slice(1);
  const palabra = (opts.palabra?.trim() || proyecto).toUpperCase();
  const descripcion =
    opts.descripcion?.trim() || `${proyecto} es open source y gratis: lo instalas tú, es tuyo y no pagas mensualidades.`;
  const enlace = `https://github.com/${repo}`;
  const verEnGithub = { linkTitle: 'Ver en GitHub', linkUrl: enlace };

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  const nodo = (id: string, type: NodeType, col: number, fila: number, data: FlowNodeData = {}) => {
    nodes.push({ id, type, position: { x: col * COL, y: fila * FILA }, data });
  };
  /**
   * Si la persona escribe en vez de tocar un botón y el texto no coincide con
   * ninguno, el motor toma la PRIMERA arista del nodo. Por eso, en los nodos
   * con botones, la primera que se declara es la salida más segura.
   */
  const arista = (source: string, sourceHandle: string, target: string) => {
    edges.push({ id: `${source}-${sourceHandle}-${target}`, source, target, sourceHandle });
  };

  // --- Entrada: comentario → respuesta privada → pedir que te siga -----------

  nodo('trigger', 'trigger', 0, 0, { label: 'Disparador' });
  nodo('privada', 'send_text', 0, 1, {
    // Es la respuesta privada al comentario: solo texto, y nada más sale hasta que contesten.
    text: `¡Hola {{first_name}}! Vi tu comentario 👀 Te tengo ${proyecto} listo para mandártelo. Contéstame lo que sea por aquí (con un «va» basta) y te lo paso.`,
  });
  nodo('comento', 'add_tag', 0, 2, { tag: `comento-${palabra.toLowerCase()}` });
  nodo('seguir', 'follow_gate', 0, 3, {
    text: 'Antes de pasártelo: ¿me sigues? Así te enteras de lo que viene 🙌 Cuando me sigas, toca el botón.',
    buttonTitle: 'Ya te sigo',
    retryText: 'Todavía no me aparece que me sigas 👀 Dale seguir y vuelve a tocar el botón.',
    maxAttempts: 2,
    timeoutMs: LANZAMIENTO_TIEMPO_RESPUESTA,
  });
  nodo('sin_seguir', 'send_link', 5.5, 4, {
    text: 'Sin problema, aquí está igual 🙌 Si te late, regálale una ⭐',
    ...verEnGithub,
  });
  nodo('fin_sin_seguir', 'end', 5.5, 5);
  nodo('segmento', 'send_quick_replies', 0, 4, {
    text: 'Para mandarte lo que más te sirve: ¿qué te describe mejor?',
    quickReplies: [
      { id: 'creador', title: '🎨 Creo contenido' },
      { id: 'negocio', title: '🏪 Tengo un negocio' },
      { id: 'dev', title: '💻 Programo' },
      { id: 'curioso', title: '👀 Solo curioseo' },
    ],
  });

  arista('trigger', 'next', 'privada');
  arista('privada', 'next', 'comento');
  arista('comento', 'next', 'seguir');
  arista('seguir', 'follows', 'segmento');
  arista('seguir', 'timeout', 'sin_seguir');
  arista('sin_seguir', 'next', 'fin_sin_seguir');
  arista('segmento', 'curioso', 'd_resumen');
  arista('segmento', 'creador', 'a_tag');
  arista('segmento', 'negocio', 'b_tag');
  arista('segmento', 'dev', 'c_tag');

  // --- Creo contenido ---------------------------------------------------------
  // Cada paso que sigue baja un poco a la izquierda: así las salidas «No» y
  // «No contestó» bajan por un carril libre a la derecha, sin pasar por debajo
  // de las tarjetas.

  nodo('a_tag', 'add_tag', -5, 6, { tag: 'creador' });
  nodo('a_seguidores', 'ask_question', -5, 7, {
    text: '¿Cuántos seguidores tienes, más o menos? Solo el número, sin «k» 🔢',
    saveToField: 'seguidores',
    timeoutMs: LANZAMIENTO_TIEMPO_RESPUESTA,
  });
  nodo('a_grande', 'condition', -5.25, 8, {
    rules: [{ subject: 'field', key: 'seguidores', op: 'gt', value: '10000' }],
    matchAll: true,
  });
  nodo('a_tag_grande', 'add_tag', -5.5, 9, { tag: 'creador-grande' });
  nodo('a_llamada', 'send_buttons', -5.5, 10, {
    text: `Con {{seguidores}} seguidores ya no se contestan los DMs a mano 😅 ¿Te ayudo a dejar ${proyecto} instalado en una llamada de 15 minutos?`,
    buttons: [
      { kind: 'postback', id: 'llamada', title: '📞 Sí, agendemos' },
      { kind: 'postback', id: 'solo', title: 'Yo le entro solo' },
    ],
  });
  nodo('a_interes', 'set_field', -5.75, 11, { fieldKey: 'interes', fieldValue: 'llamada' });
  nodo('a_aviso', 'send_text', -5.75, 12, {
    text: '¡Va, {{first_name}}! Te escribo yo en un rato para agendar la llamada 📞',
  });
  nodo('a_humano', 'assign_human', -5.75, 13);
  nodo('a_link', 'send_link', -4.5, 15, {
    text: 'Para creadores: arma flujos como este para tus reels y deja de contestar «info» uno por uno 🙌',
    ...verEnGithub,
  });

  arista('a_tag', 'next', 'a_seguidores');
  arista('a_seguidores', 'answered', 'a_grande');
  arista('a_seguidores', 'timeout', 'a_link');
  arista('a_grande', 'true', 'a_tag_grande');
  arista('a_grande', 'false', 'a_link');
  arista('a_tag_grande', 'next', 'a_llamada');
  arista('a_llamada', 'solo', 'a_link');
  arista('a_llamada', 'llamada', 'a_interes');
  arista('a_interes', 'next', 'a_aviso');
  arista('a_aviso', 'next', 'a_humano');
  arista('a_link', 'next', 'h_pendiente');

  // --- Tengo un negocio -------------------------------------------------------

  nodo('b_tag', 'add_tag', -2, 6, { tag: 'negocio' });
  nodo('b_nombre', 'ask_question', -2, 7, {
    text: '¿Cómo se llama tu negocio?',
    saveToField: 'negocio',
    timeoutMs: LANZAMIENTO_TIEMPO_RESPUESTA,
  });
  nodo('b_dms', 'ask_question', -2.25, 8, {
    text: '¿Y cuántos DMs te llegan al día, más o menos? Solo el número 🔢',
    saveToField: 'dms_al_dia',
    timeoutMs: LANZAMIENTO_TIEMPO_RESPUESTA,
  });
  nodo('b_muchos', 'condition', -2.5, 9, {
    rules: [{ subject: 'field', key: 'dms_al_dia', op: 'gt', value: '30' }],
    matchAll: true,
  });
  nodo('b_dolor', 'send_text', -2.75, 10, {
    text: `{{negocio}} con {{dms_al_dia}} DMs al día ya necesita esto 🔥 ${proyecto} contesta, etiqueta y te pasa solo las conversaciones que van en serio.`,
  });
  nodo('b_instalar', 'send_buttons', -2.75, 11, {
    text: '¿Lo instalas tú o te lo instalo yo?',
    buttons: [
      { kind: 'postback', id: 'instalar', title: 'Instálamelo tú' },
      { kind: 'postback', id: 'yo', title: 'Lo instalo yo' },
    ],
  });
  nodo('b_interes', 'set_field', -3, 12, { fieldKey: 'interes', fieldValue: 'instalación de {{negocio}}' });
  nodo('b_aviso', 'send_text', -3, 13, {
    text: '¡Va! Te escribo yo en un rato para ver lo de {{negocio}} 🙌',
  });
  nodo('b_humano', 'assign_human', -3, 14);
  nodo('b_link', 'send_link', -1, 13, {
    text: 'Para negocios: todos tus DMs en una bandeja, y los flujos contestan lo repetitivo de día y de noche 🙌',
    ...verEnGithub,
  });

  arista('b_tag', 'next', 'b_nombre');
  arista('b_nombre', 'answered', 'b_dms');
  arista('b_nombre', 'timeout', 'b_link');
  arista('b_dms', 'answered', 'b_muchos');
  arista('b_dms', 'timeout', 'b_link');
  arista('b_muchos', 'true', 'b_dolor');
  arista('b_muchos', 'false', 'b_link');
  arista('b_dolor', 'next', 'b_instalar');
  arista('b_instalar', 'yo', 'b_link');
  arista('b_instalar', 'instalar', 'b_interes');
  arista('b_interes', 'next', 'b_aviso');
  arista('b_aviso', 'next', 'b_humano');
  arista('b_link', 'next', 'h_pendiente');

  // --- Programo ---------------------------------------------------------------

  nodo('c_tag', 'add_tag', 1.5, 6, { tag: 'dev' });
  nodo('c_github', 'http_request', 1.5, 7, {
    // Los campos planos de la respuesta (stargazers_count, forks_count…) quedan como variables.
    url: `https://api.github.com/repos/${repo}`,
    method: 'GET',
    headers: { Accept: 'application/vnd.github+json' },
  });
  nodo('c_con_estrellas', 'condition', 1.5, 8, {
    rules: [{ subject: 'field', key: 'stargazers_count', op: 'gt', value: '0' }],
    matchAll: true,
  });
  nodo('c_estrellas', 'send_text', 1, 9, {
    text: 'Va en {{stargazers_count}} ⭐ y {{forks_count}} forks. Ese número lo acabo de sacar en vivo de la API de GitHub, desde este mismo flujo 🤓',
  });
  nodo('c_nuevo', 'send_text', 2, 9, {
    text: 'Está recién salido del horno 🔥 Serías de los primeros en darle ⭐',
  });
  nodo('c_link', 'send_link', 1.5, 10, {
    text: 'Aquí está el código 👇 El README te lleva paso a paso y los PRs son bienvenidos.',
    ...verEnGithub,
  });
  // Después del enlace a propósito: si la imagen fallara, el enlace ya llegó.
  nodo('c_imagen', 'send_media', 1.5, 11, {
    mediaType: 'image',
    mediaUrl: `https://opengraph.githubassets.com/1/${repo}`,
  });
  nodo('c_pausa', 'wait', 1.5, 12, { delayMs: 4000 });
  nodo('c_pide_estrella', 'send_buttons', 1.5, 13, {
    text: '¿Me regalas una ⭐? Es lo que hace que más gente lo encuentre.',
    buttons: [
      { kind: 'postback', id: 'estrella', title: '⭐ Ya le di' },
      { kind: 'postback', id: 'luego', title: 'Luego' },
    ],
  });
  nodo('c_tag_estrella', 'add_tag', 1, 14, { tag: 'dio-estrella' });
  nodo('c_luego', 'send_text', 2, 14, {
    text: 'Va, sin presión 😄 Ahí queda el enlace para cuando tengas un rato.',
  });
  nodo('c_gracias', 'send_text', 1, 15, {
    text: '¡Eres grande, {{first_name}}! 🙌 Si mandas un PR, lo reviso yo.',
  });

  arista('c_tag', 'next', 'c_github');
  arista('c_github', 'next', 'c_con_estrellas');
  arista('c_con_estrellas', 'true', 'c_estrellas');
  arista('c_con_estrellas', 'false', 'c_nuevo');
  arista('c_estrellas', 'next', 'c_link');
  arista('c_nuevo', 'next', 'c_link');
  arista('c_link', 'next', 'c_imagen');
  arista('c_imagen', 'next', 'c_pausa');
  arista('c_pausa', 'next', 'c_pide_estrella');
  arista('c_pide_estrella', 'luego', 'c_luego');
  arista('c_pide_estrella', 'estrella', 'c_tag_estrella');
  arista('c_tag_estrella', 'next', 'c_gracias');
  arista('c_gracias', 'next', 'h_pendiente');
  arista('c_luego', 'next', 'h_pendiente');

  // --- Solo curioseo ----------------------------------------------------------

  nodo('d_resumen', 'send_text', 4.5, 6, { text: descripcion });
  nodo('d_pausa', 'wait', 4.5, 9, { delayMs: 3000 });
  nodo('d_meta', 'send_text', 4.5, 12, {
    text: 'Por cierto 👀 este chat lo está contestando un flujo automático hecho con Chatty. En vivo.',
  });
  nodo('d_link', 'send_link', 4.5, 15, { text: 'Aquí lo tienes, gratis y open source 👇', ...verEnGithub });

  arista('d_resumen', 'next', 'd_pausa');
  arista('d_pausa', 'next', 'd_meta');
  arista('d_meta', 'next', 'd_link');
  arista('d_link', 'next', 'h_pendiente');

  // --- Seguimiento al día siguiente -------------------------------------------

  nodo('h_pendiente', 'add_tag', 0, 17, { tag: 'pendiente-probar' });
  nodo('h_espera', 'wait', 0, 18, { delayMs: LANZAMIENTO_ESPERA_SEGUIMIENTO });
  nodo('h_pregunta', 'send_buttons', 0, 19, {
    text: `¡Hey {{first_name}}! ¿Pudiste probar ${proyecto}?`,
    buttons: [
      { kind: 'postback', id: 'listo', title: '🎉 Ya lo tengo' },
      { kind: 'postback', id: 'atorado', title: '😵 Me atoré' },
      { kind: 'postback', id: 'aun', title: 'Aún no' },
    ],
  });
  nodo('h_quitar', 'remove_tag', -1, 20.5, { tag: 'pendiente-probar' });
  nodo('h_listo', 'add_tag', -1, 21.5, { tag: 'lo-probo' });
  nodo('h_es_dev', 'condition', -1, 22.5, {
    rules: [{ subject: 'tag', key: 'dev', op: 'exists' }],
    matchAll: true,
  });
  nodo('h_pr', 'send_text', -1.5, 23.5, {
    text: 'Ya que lo tienes corriendo: si se te ocurre algo, los PRs son bienvenidos 👀 Lo reviso yo.',
  });
  nodo('h_captura', 'send_text', -0.5, 23.5, {
    text: '¡Qué buena! 🙌 Mándame captura de tu primer flujo y lo comparto en historias.',
  });
  nodo('h_fin', 'end', -1, 24.5);
  nodo('h_atorado', 'ask_question', 0, 20.5, {
    text: '¿En qué paso te atoraste? Cuéntame y lo vemos 👇',
    saveToField: 'atorado_en',
    timeoutMs: LANZAMIENTO_TIEMPO_RESPUESTA,
  });
  nodo('h_humano', 'assign_human', 0, 21.5);
  nodo('h_aun', 'send_text', 1, 20.5, {
    text: 'Sin prisa. Cuando quieras, ahí arriba está el enlace 🙌',
  });
  nodo('h_fin_aun', 'end', 1, 21.5);

  arista('h_pendiente', 'next', 'h_espera');
  arista('h_espera', 'next', 'h_pregunta');
  arista('h_pregunta', 'atorado', 'h_atorado');
  arista('h_pregunta', 'listo', 'h_quitar');
  arista('h_pregunta', 'aun', 'h_aun');
  arista('h_quitar', 'next', 'h_listo');
  arista('h_listo', 'next', 'h_es_dev');
  arista('h_es_dev', 'true', 'h_pr');
  arista('h_es_dev', 'false', 'h_captura');
  arista('h_pr', 'next', 'h_fin');
  arista('h_captura', 'next', 'h_fin');
  arista('h_atorado', 'answered', 'h_humano');
  arista('h_atorado', 'timeout', 'h_fin_aun');
  arista('h_aun', 'next', 'h_fin_aun');

  return {
    name: `Comentan ${palabra} → repo`,
    trigger: {
      type: 'comment_keyword',
      keywords: [palabra],
      matchType: 'contains',
      caseSensitive: false,
      postIds: [],
      publicReplies: [
        'Te lo mandé por DM 📩',
        'Revisa tus mensajes 👀',
        '¡Listo, {{first_name}}! Ya te escribí 🚀',
        'Va directo a tu bandeja 🙌',
      ],
      publicReply: null,
    },
    nodes,
    edges,
  };
}
