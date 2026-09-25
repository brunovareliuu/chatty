/**
 * Carga la plantilla «Lanzamiento de un repo» (`src/lib/engine/plantilla-lanzamiento.ts`)
 * en tu cuenta de Instagram conectada: una automatización de comentario y su flujo.
 *
 *   cd web
 *   npm run plantilla -- --repo usuario/repo
 *
 * Opciones:
 *   --repo usuario/repo   obligatorio; tiene que ser público
 *   --palabra CHATTY      la que comentan (por omisión, el nombre del repo)
 *   --nombre Chatty       cómo se llama en los mensajes
 *   --descripcion "…"     lo que lee quien «solo curiosea»
 *   --firebase mi-chatty  el proyecto (por omisión, el de .env.local)
 *   --cuenta 1784…        el id de Instagram, si tienes más de una conectada
 *   --activar             la deja prendida; sin esto nace apagada, para que la revises
 *
 * Credenciales: las mismas que el servidor en local (FIREBASE_SERVICE_ACCOUNT en .env.local,
 * o `gcloud auth application-default login`). Con FIRESTORE_EMULATOR_HOST escribe al emulador.
 *
 * Si ya existe una automatización con el mismo nombre, le reemplaza el flujo y el disparador
 * y conserva sus números: se puede correr las veces que haga falta.
 */
import { parseArgs } from 'node:util';
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { buildLanzamientoRepo } from '../src/lib/engine/plantilla-lanzamiento.ts';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* sin .env.local: todo llega por opciones o por el entorno */
}

const { values: op } = parseArgs({
  options: {
    repo: { type: 'string' },
    palabra: { type: 'string' },
    nombre: { type: 'string' },
    descripcion: { type: 'string' },
    firebase: { type: 'string' },
    cuenta: { type: 'string' },
    activar: { type: 'boolean', default: false },
  },
});

function salir(mensaje: string): never {
  console.error(`\n✗ ${mensaje}\n`);
  process.exit(1);
}

if (!op.repo) salir('Falta --repo usuario/repo (el repo de GitHub que va a mandar el flujo).');

let plantilla: ReturnType<typeof buildLanzamientoRepo>;
try {
  plantilla = buildLanzamientoRepo({
    repo: op.repo,
    palabra: op.palabra,
    proyecto: op.nombre,
    descripcion: op.descripcion,
  });
} catch (err) {
  salir((err as Error).message);
}

const cuentaDeServicio = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : null;
const projectId =
  op.firebase ??
  cuentaDeServicio?.project_id ??
  process.env.FIREBASE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!projectId) salir('No sé a qué proyecto de Firebase escribir: pasa --firebase <id> o llena .env.local.');

const db = getFirestore(
  initializeApp({
    projectId,
    credential: cuentaDeServicio
      ? cert({
          projectId: cuentaDeServicio.project_id,
          clientEmail: cuentaDeServicio.client_email,
          privateKey: String(cuentaDeServicio.private_key).replace(/\\n/g, '\n'),
        })
      : applicationDefault(),
  }),
);

// --- La cuenta de Instagram ---------------------------------------------------

const cuentas = (await db.collection('accounts').get()).docs.filter((d) => d.get('active') !== false);
const cuenta = op.cuenta ? cuentas.find((d) => d.id === op.cuenta) : cuentas.length === 1 ? cuentas[0] : null;
if (!cuenta) {
  const lista = cuentas.map((d) => `  --cuenta ${d.id}   @${d.get('username')}`).join('\n');
  salir(
    cuentas.length === 0
      ? `No hay ninguna cuenta de Instagram conectada en «${projectId}». Conéctala en Ajustes primero.`
      : op.cuenta
        ? `La cuenta ${op.cuenta} no está conectada en «${projectId}». Hay estas:\n${lista}`
        : `Hay varias cuentas conectadas; elige una:\n${lista}`,
  );
}

// --- Crear o reemplazar ---------------------------------------------------------

const automatizaciones = cuenta.ref.collection('automations');
const flujos = cuenta.ref.collection('flows');
const ahora = Date.now();

const existente = (await automatizaciones.where('name', '==', plantilla.name).limit(1).get()).docs[0];
const flujoExistente = existente?.get('flowId') ? await flujos.doc(existente.get('flowId')).get() : null;

const flujoRef = flujoExistente?.exists ? flujoExistente.ref : flujos.doc();
const autoRef = existente?.ref ?? automatizaciones.doc();
// Sin --activar, una que ya existía se queda como estaba. El interruptor de la automatización
// y el del flujo van siempre juntos.
const prendida = op.activar || existente?.get('enabled') === true;

const batch = db.batch();
batch.set(
  flujoRef,
  {
    name: plantilla.name,
    description: `Plantilla «Lanzamiento de un repo» para ${op.repo}`,
    enabled: prendida,
    nodes: plantilla.nodes,
    edges: plantilla.edges,
    updatedAt: ahora,
    ...(flujoExistente?.exists ? {} : { createdAt: ahora }),
  },
  { merge: true },
);
if (existente) {
  batch.update(autoRef, { trigger: plantilla.trigger, flowId: flujoRef.id, enabled: prendida, updatedAt: ahora });
} else {
  // Las nuevas van al final: las que ya existían conservan su prioridad.
  const prioridad = (await automatizaciones.count().get()).data().count;
  batch.set(autoRef, {
    name: plantilla.name,
    enabled: prendida,
    trigger: plantilla.trigger,
    flowId: flujoRef.id,
    priority: prioridad,
    cooldownMs: 0,
    notificar: false,
    stats: { triggered: 0, lastTriggeredAt: null },
    createdAt: ahora,
    updatedAt: ahora,
  });
}
await batch.commit();

console.log(`
✓ ${existente ? 'Reemplacé' : 'Creé'} «${plantilla.name}» en @${cuenta.get('username')} (${projectId})
  ${plantilla.nodes.length} nodos, ${plantilla.edges.length} conexiones · ${prendida ? 'PRENDIDA: ya contesta comentarios' : 'apagada: préndela desde el panel cuando la revises'}
  Ábrela en /automations/${autoRef.id}
`);
