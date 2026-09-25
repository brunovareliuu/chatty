/**
 * La guía: cada paso para dejar Chatty funcionando y qué pasos necesita cada
 * sección del panel. Puro (sin Firestore ni DOM): lo leen el servidor, que
 * decide qué ya está hecho (`estado.ts`), y las pantallas que lo pintan.
 *
 * Un paso se da por hecho de tres formas (`revisa`):
 *   - `variables`: las variables de entorno que nombra existen;
 *   - `datos`: Firestore ya tiene lo que el paso produce (una cuenta, un DM…);
 *   - `manual`: no hay cómo saberlo desde aquí, lo marca la persona.
 *
 * En los textos, `{APP_URL}` se cambia por la URL del despliegue si ya está.
 */

export type PasoId =
  | 'cuentas'
  | 'firebase'
  | 'reglas'
  | 'servidor'
  | 'meta'
  | 'llaves'
  | 'desplegar'
  | 'webhook'
  | 'mensajes'
  | 'instagram'
  | 'dm'
  | 'cron'
  | 'insights'
  | 'automatizacion'
  | 'prueba'
  | 'claude'
  | 'celular'
  | 'marca';

export type Paso = {
  id: PasoId;
  titulo: string;
  /** Una línea: para qué sirve. */
  resumen: string;
  /** Cómo se hace, en orden. */
  como: string[];
  /** Bloques listos para copiar. */
  comandos?: string[];
  enlaces?: { href: string; texto: string }[];
  /** La guía larga, en el repo. */
  doc: string;
  revisa: 'variables' | 'datos' | 'manual';
  /** Si `revisa` es `variables`, cuáles. */
  variables?: string[];
  /** Qué lo marca solo, cuando se puede. */
  seMarca?: string;
  opcional?: boolean;
};

export const PASOS: Record<PasoId, Paso> = {
  cuentas: {
    id: 'cuentas',
    titulo: 'Las cuentas que necesitas',
    resumen: 'Google con tarjeta, tu Instagram profesional y una cuenta de Meta para desarrolladores.',
    como: [
      'Una cuenta de Google con tarjeta: el proyecto de Firebase va en plan Blaze. Con poco uso cuesta centavos al mes.',
      'Tu Instagram como cuenta profesional (Empresa o Creador): Configuración → Tipo de cuenta y herramientas.',
      'Una cuenta en developers.facebook.com, con la que vas a crear la app que conecta tu Instagram.',
      'En tu computadora: Node 20 o más nuevo, la CLI de Firebase y la de Google Cloud (gcloud).',
    ],
    comandos: ['npm i -g firebase-tools'],
    enlaces: [
      { href: 'https://console.firebase.google.com', texto: 'Consola de Firebase' },
      { href: 'https://developers.facebook.com/apps', texto: 'Meta para desarrolladores' },
    ],
    doc: 'docs/01-requisitos.md',
    revisa: 'manual',
  },
  firebase: {
    id: 'firebase',
    titulo: 'Tu proyecto de Firebase',
    resumen: 'La base de datos y el login del panel.',
    como: [
      'En la consola de Firebase: Agregar proyecto, y cámbialo a plan Blaze.',
      'Firestore Database → Crear base de datos: edición Standard, modo producción.',
      'Authentication → Método de acceso: activa Google y Correo electrónico/contraseña.',
      'Configuración del proyecto → Tus apps → Web (</>). Copia los seis valores a web/.env.local (en producción, a web/apphosting.yaml).',
    ],
    doc: 'docs/02-firebase.md',
    revisa: 'variables',
    variables: [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
    ],
    seMarca: 'En cuanto el servidor ve las seis variables.',
  },
  reglas: {
    id: 'reglas',
    titulo: 'Las reglas de seguridad',
    resumen: 'Que nadie más que tu equipo lea tus DMs. Vienen en el repo; solo hay que subirlas.',
    como: ['Desde la raíz del repo, liga tu proyecto y súbelas. Repite el último comando cada vez que cambien.'],
    comandos: ['firebase login\nfirebase use --add\nfirebase deploy --only firestore'],
    doc: 'docs/02-firebase.md',
    revisa: 'manual',
  },
  servidor: {
    id: 'servidor',
    titulo: 'Las credenciales del servidor',
    resumen: 'El servidor del panel necesita una identidad de Google Cloud para escribir en tu Firestore.',
    como: [
      'En producción no haces nada: App Hosting ya le da una.',
      'En tu máquina, usa tu propia cuenta de Google (o el JSON de una cuenta de servicio en FIREBASE_SERVICE_ACCOUNT):',
    ],
    comandos: ['gcloud auth application-default login\ngcloud auth application-default set-quota-project TU-PROYECTO'],
    doc: 'docs/05-correr-en-local.md',
    revisa: 'datos',
    seMarca: 'Cuando el panel ya pudo leer tu Firestore.',
  },
  meta: {
    id: 'meta',
    titulo: 'Tu app de Meta',
    resumen: 'La que conecta tu Instagram con el panel.',
    como: [
      'En developers.facebook.com/apps: Crear app, con el caso de uso «Administrar mensajes y contenido en Instagram».',
      'En «Configuración de la API con inicio de sesión de Instagram», agrega los permisos instagram_business_basic, instagram_business_manage_messages, instagram_business_manage_comments e instagram_business_manage_insights.',
      'Copia el ID y la clave secreta de la app de Instagram. Ojo: no son los de la app de Meta que salen arriba.',
      'Roles de la app → agrega tu cuenta como Tester de Instagram y acepta la invitación desde Instagram.',
    ],
    enlaces: [{ href: 'https://developers.facebook.com/apps', texto: 'Tus apps de Meta' }],
    doc: 'docs/03-meta-instagram.md',
    revisa: 'variables',
    variables: ['META_APP_ID', 'META_APP_SECRET'],
    seMarca: 'Cuando el servidor ve META_APP_ID y META_APP_SECRET.',
  },
  llaves: {
    id: 'llaves',
    titulo: 'Las llaves del panel',
    resumen: 'Una cifra los tokens de Instagram; la otra protege el cron.',
    como: [
      'En web/, copia el ejemplo de variables si no lo has hecho.',
      'Genera dos valores distintos, uno para TOKEN_ENCRYPTION_KEY y otro para CRON_SECRET. Si luego cambias la primera, hay que volver a conectar Instagram.',
    ],
    comandos: ['cp .env.example .env.local\nopenssl rand -hex 32'],
    doc: 'docs/04-variables-de-entorno.md',
    revisa: 'variables',
    variables: ['TOKEN_ENCRYPTION_KEY', 'CRON_SECRET'],
    seMarca: 'Cuando el servidor ve las dos llaves.',
  },
  desplegar: {
    id: 'desplegar',
    titulo: 'Ponerlo en internet',
    resumen: 'Meta no le habla a localhost: el panel necesita una URL pública.',
    como: [
      'Sube tu copia a GitHub y llena los REEMPLAZA de web/apphosting.yaml, incluido APP_URL.',
      'Crea los secretos y el backend de App Hosting (el directorio raíz es web).',
      'En Firebase → Authentication → Configuración → Dominios autorizados, agrega tu dominio.',
      'Para probar en tu máquina basta un túnel (ngrok o cloudflared) con su URL en APP_URL.',
    ],
    comandos: [
      'firebase apphosting:secrets:set META_APP_SECRET\nfirebase apphosting:secrets:set META_WEBHOOK_VERIFY_TOKEN\nfirebase apphosting:secrets:set TOKEN_ENCRYPTION_KEY\nfirebase apphosting:secrets:set CRON_SECRET',
      'firebase apphosting:backends:create',
    ],
    doc: 'docs/06-desplegar.md',
    revisa: 'variables',
    variables: ['APP_URL'],
    seMarca: 'Cuando APP_URL es una dirección https pública (no localhost).',
  },
  webhook: {
    id: 'webhook',
    titulo: 'El webhook de Meta',
    resumen: 'Por donde Meta te avisa de cada DM y cada comentario.',
    como: [
      'Inventa una cadena larga y ponla en META_WEBHOOK_VERIFY_TOKEN.',
      'En tu app de Meta, en «Configurar webhooks», pega esta URL y la misma cadena, y dale Verificar y guardar (el panel ya tiene que estar en internet):',
      'Suscríbete a los campos messages, messaging_postbacks, messaging_seen, message_reactions, messaging_referral y comments.',
      'En «Configurar el inicio de sesión para empresas», la URL de redireccionamiento es la segunda:',
    ],
    comandos: ['{APP_URL}/api/webhooks/instagram', '{APP_URL}/api/ig/callback'],
    doc: 'docs/03-meta-instagram.md',
    revisa: 'variables',
    variables: ['META_WEBHOOK_VERIFY_TOKEN'],
    seMarca: 'Cuando llega tu primer DM. Mientras, márcalo tú cuando Meta lo verifique.',
  },
  mensajes: {
    id: 'mensajes',
    titulo: 'Permitir el acceso a los mensajes',
    resumen: 'Un interruptor en la app de Instagram. Sin él no llega ningún DM, y no hay error que te avise.',
    como: [
      'En el teléfono: Instagram → Configuración y privacidad → Mensajes y respuestas a historias → Herramientas conectadas → Permitir el acceso a los mensajes.',
    ],
    doc: 'docs/03-meta-instagram.md',
    revisa: 'manual',
    seMarca: 'Cuando llega tu primer DM.',
  },
  instagram: {
    id: 'instagram',
    titulo: 'Conectar tu Instagram',
    resumen: 'El panel guarda el token cifrado y suscribe tu cuenta a los webhooks.',
    como: [
      'Entra al panel con tu cuenta. La primera que entra queda como dueña.',
      'Ajustes → Instagram → Conectar, con la cuenta profesional que agregaste como tester.',
    ],
    doc: 'docs/08-primer-uso.md',
    revisa: 'datos',
    seMarca: 'En cuanto hay una cuenta conectada.',
  },
  dm: {
    id: 'dm',
    titulo: 'Tu primer DM',
    resumen: 'La prueba de que todo lo anterior funciona.',
    como: ['Desde otra cuenta de Instagram, mándate un DM. Debe aparecer en la Bandeja en segundos, y puedes contestarlo desde ahí.'],
    doc: 'docs/08-primer-uso.md',
    revisa: 'datos',
    seMarca: 'En cuanto llega la primera conversación.',
  },
  cron: {
    id: 'cron',
    titulo: 'El cron: el latido de cada minuto',
    resumen: 'Despierta los flujos que esperan, cierra las preguntas sin respuesta y renueva los tokens antes de que venzan.',
    como: ['Crea un job de Cloud Scheduler que llame cada minuto con tu CRON_SECRET:'],
    comandos: [
      'gcloud services enable cloudscheduler.googleapis.com\ngcloud scheduler jobs create http chatty-tick \\\n  --schedule="* * * * *" \\\n  --uri="{APP_URL}/api/cron/tick" \\\n  --http-method=GET \\\n  --headers="x-cron-secret=TU_CRON_SECRET" \\\n  --location=us-central1',
    ],
    doc: 'docs/07-cron.md',
    revisa: 'datos',
    seMarca: 'Cuando el cron corrió en los últimos minutos.',
  },
  insights: {
    id: 'insights',
    titulo: 'El permiso de estadísticas',
    resumen: 'Sin él solo se ven likes y comentarios; con él, alcance, vistas, seguidores y audiencia.',
    como: [
      'En tu app de Meta, en los permisos de la API con inicio de sesión de Instagram, agrega instagram_business_manage_insights.',
      'En el panel, en Estadísticas, toca Reconectar Instagram: el permiso nuevo solo llega con una conexión nueva.',
      'El historial se va juntando solo: Meta no guarda la historia de tus seguidores, así que el panel la anota cada hora desde que conectas.',
    ],
    doc: 'docs/modulos/estadisticas-instagram.md',
    revisa: 'datos',
    seMarca: 'Cuando la cuenta conectada ya trae el permiso.',
  },
  automatizacion: {
    id: 'automatizacion',
    titulo: 'Tu primera automatización',
    resumen: 'El clásico «comenta GUÍA y te mando el link».',
    como: [
      'Automatizaciones → Nueva → «Alguien comenta una palabra clave en una publicación».',
      'Palabra clave GUÍA, el post donde aplica y una o varias respuestas públicas.',
      'Abre su flujo y escribe el DM con el enlace que quieres mandar. Actívala.',
    ],
    doc: 'docs/08-primer-uso.md',
    revisa: 'datos',
    seMarca: 'En cuanto existe una automatización.',
  },
  prueba: {
    id: 'prueba',
    titulo: 'Probarla',
    resumen: 'Que la veas contestar de verdad.',
    como: ['Desde otra cuenta, comenta GUÍA en ese post: llega la respuesta pública y el DM.'],
    doc: 'docs/08-primer-uso.md',
    revisa: 'datos',
    seMarca: 'La primera vez que una automatización arranca un flujo.',
  },
  claude: {
    id: 'claude',
    titulo: 'La llave de Claude',
    resumen: 'Prende el asistente, que arma y edita automatizaciones por ti.',
    como: [
      'En console.anthropic.com → API Keys, crea una llave.',
      'Ponla en CLAUDE_API_KEY (en producción, como secreto). Si la API responde 400 pidiendo anthropic-workspace-id, crea la llave dentro de un workspace o pon su id en CLAUDE_WORKSPACE_ID.',
    ],
    comandos: ['firebase apphosting:secrets:set CLAUDE_API_KEY'],
    enlaces: [{ href: 'https://console.anthropic.com', texto: 'Consola de Anthropic' }],
    doc: 'docs/modulos/asistente.md',
    revisa: 'variables',
    variables: ['CLAUDE_API_KEY'],
    seMarca: 'Cuando el servidor ve CLAUDE_API_KEY.',
    opcional: true,
  },
  celular: {
    id: 'celular',
    titulo: 'La app en tu celular',
    resumen: 'Para contestar desde el teléfono y que te lleguen los avisos.',
    como: [
      'Abre la URL del panel en el teléfono. En iPhone: Compartir → Agregar a inicio (los avisos solo llegan así).',
      'Ajustes › Notificaciones → activa los avisos en ese dispositivo y manda una prueba.',
    ],
    doc: 'docs/modulos/app-movil-y-avisos.md',
    revisa: 'datos',
    seMarca: 'En cuanto un dispositivo está suscrito a los avisos.',
    opcional: true,
  },
  marca: {
    id: 'marca',
    titulo: 'Ponle tu marca',
    resumen: 'El nombre, el logo y el color con los que se ve el panel y la app del celular.',
    como: [
      'Ajustes › Marca: escribe cómo se llama tu panel, sube tu logo y elige tu color. Mientras eliges, todo el panel se pinta.',
      'Dale Guardar. Sin Firebase se queda en este navegador; ya conectado, lo ven todos y el ícono del celular cambia.',
    ],
    doc: 'docs/modulos/marca.md',
    revisa: 'manual',
    seMarca: 'Al guardarla en Ajustes › Marca se palomea sola.',
    opcional: true,
  },
};

export type ModuloId = 'bandeja' | 'automatizaciones' | 'contactos' | 'estadisticas' | 'asistente' | 'ajustes';

export type Modulo = {
  id: ModuloId;
  titulo: string;
  ruta: string;
  /** Qué es, en una línea. */
  que: string;
  /** Lo que tiene que estar antes de esta sección, en orden. */
  pasos: PasoId[];
};

/** Lo que necesita cualquier cosa que hable con Instagram. */
const BASE: PasoId[] = ['cuentas', 'firebase', 'reglas', 'servidor', 'meta', 'llaves', 'desplegar', 'webhook', 'mensajes', 'instagram'];

export const MODULOS: Modulo[] = [
  {
    id: 'bandeja',
    titulo: 'Bandeja',
    ruta: '/inbox',
    que: 'Todos los DMs de tu Instagram en tiempo real, para leerlos y contestarlos desde aquí.',
    pasos: [...BASE, 'dm'],
  },
  {
    id: 'automatizaciones',
    titulo: 'Automatizaciones',
    ruta: '/automations',
    que: 'Respuestas automáticas por palabra clave en DMs y comentarios, con un constructor visual de flujos.',
    pasos: [...BASE, 'cron', 'automatizacion', 'prueba'],
  },
  {
    id: 'contactos',
    titulo: 'Contactos',
    ruta: '/contacts',
    que: 'Quién te escribió o comentó, con sus etiquetas, sus notas y lo que capturaste en los flujos.',
    pasos: [...BASE, 'dm'],
  },
  {
    id: 'estadisticas',
    titulo: 'Estadísticas',
    ruta: '/instagram',
    que: 'Cómo va tu cuenta: seguidores día por día, alcance, vistas, likes, tus publicaciones y qué te funciona.',
    pasos: [...BASE, 'insights', 'cron'],
  },
  {
    id: 'asistente',
    titulo: 'Asistente',
    ruta: '/asistente',
    que: 'Claude arma y edita automatizaciones por ti: se lo pides en español y lo crea de verdad.',
    pasos: ['cuentas', 'firebase', 'reglas', 'servidor', 'meta', 'llaves', 'instagram', 'claude'],
  },
  {
    id: 'ajustes',
    titulo: 'Ajustes',
    ruta: '/settings',
    que: 'Tu cuenta de Instagram, los avisos al celular, tu marca y el estado del sistema.',
    pasos: ['firebase', 'instagram', 'celular', 'marca'],
  },
];

/** El orden de «Primeros pasos»: la instalación, el primer uso y lo opcional. */
export const GRUPOS_DE_PASOS: { titulo: string; pasos: PasoId[] }[] = [
  { titulo: 'Instalar', pasos: ['cuentas', 'firebase', 'reglas', 'servidor', 'meta', 'llaves', 'desplegar', 'webhook', 'mensajes', 'cron'] },
  { titulo: 'Empezar a usarlo', pasos: ['instagram', 'dm', 'automatizacion', 'prueba', 'insights'] },
  { titulo: 'Opcional', pasos: ['claude', 'celular', 'marca'] },
];

export function moduloPorId(id: ModuloId): Modulo {
  return MODULOS.find((m) => m.id === id)!;
}
