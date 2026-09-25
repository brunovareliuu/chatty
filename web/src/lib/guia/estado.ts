import 'server-only';

import { adminDb } from '@/lib/firebase-admin';
import { accountsCol, automationsCol, conversationsCol, runsCol } from '@/lib/accounts';
import { firebaseListo } from '@/lib/instalacion';
import { PASOS, type Paso, type PasoId } from './pasos';

/**
 * Qué pasos de la guía ya están. Las variables se leen del entorno (solo si
 * existen, nunca su valor) y, si ya hay Firebase, se mira Firestore: una
 * cuenta conectada, una conversación, una automatización, el latido del cron,
 * la marca guardada.
 *
 *   hecho      ya está, lo supimos solos
 *   pendiente  falta, y se va a marcar solo en cuanto esté
 *   manual     no hay cómo saberlo desde aquí: lo marca la persona
 */
export type EstadoPaso = 'hecho' | 'pendiente' | 'manual';

export type PasoResuelto = Paso & {
  estado: EstadoPaso;
  /** Para los pasos que se revisan por variables: cuál está y cuál no. */
  variablesListas?: { nombre: string; lista: boolean }[];
};

export type Guia = {
  pasos: Record<PasoId, PasoResuelto>;
  /** La URL pública del panel, para armar las que van en Meta. */
  appUrl: string | null;
  /** Si ya hay Firebase: sin él, el panel está en modo guía. */
  conectado: boolean;
};

const hay = (v: string | undefined) => Boolean(v && v.trim());

/** https y no localhost: lo que Meta sí puede llamar. */
function urlPublica(v: string | undefined): boolean {
  if (!hay(v)) return false;
  try {
    const u = new URL(v!.trim());
    return u.protocol === 'https:' && !['localhost', '127.0.0.1', '0.0.0.0'].includes(u.hostname);
  } catch {
    return false;
  }
}

function variables(): Record<string, boolean> {
  // Las NEXT_PUBLIC_* con su nombre literal: Next las incrusta al construir.
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: hay(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: hay(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: hay(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: hay(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: hay(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    NEXT_PUBLIC_FIREBASE_APP_ID: hay(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    META_APP_ID: hay(process.env.META_APP_ID),
    META_APP_SECRET: hay(process.env.META_APP_SECRET),
    META_WEBHOOK_VERIFY_TOKEN: hay(process.env.META_WEBHOOK_VERIFY_TOKEN),
    TOKEN_ENCRYPTION_KEY: hay(process.env.TOKEN_ENCRYPTION_KEY),
    CRON_SECRET: hay(process.env.CRON_SECRET),
    APP_URL: urlPublica(process.env.APP_URL),
    CLAUDE_API_KEY: hay(process.env.CLAUDE_API_KEY) || hay(process.env.ANTHROPIC_API_KEY),
  };
}

type Senales = {
  lectura: boolean;
  cuentas: boolean;
  insights: boolean;
  conversaciones: boolean;
  automatizaciones: boolean;
  ejecuciones: boolean;
  cronEn: number | null;
  avisos: boolean;
  marca: boolean;
};

const SIN_DATOS: Senales = {
  lectura: false,
  cuentas: false,
  insights: false,
  conversaciones: false,
  automatizaciones: false,
  ejecuciones: false,
  cronEn: null,
  avisos: false,
  marca: false,
};

/** El cron escribe su latido aquí cada vez que corre (`api/cron/tick`). */
export const sistemaRef = () => adminDb.collection('config').doc('sistema');

// Cada pantalla pregunta; con un minuto de memoria se ahorran lecturas.
let memoria: { en: number; senales: Senales } | null = null;
const VIGENCIA_MS = 60 * 1000;

async function senales(): Promise<Senales> {
  if (!firebaseListo()) return SIN_DATOS;
  if (memoria && Date.now() - memoria.en < VIGENCIA_MS) return memoria.senales;

  try {
    const cuentas = await accountsCol().where('active', '==', true).limit(5).get();
    const ids = cuentas.docs.map((d) => d.id);
    const primero = async (consultas: Promise<FirebaseFirestore.QuerySnapshot>[]) =>
      (await Promise.all(consultas)).some((q) => !q.empty);

    const [conversaciones, automatizaciones, ejecuciones, avisos, sistema, marca] = await Promise.all([
      primero(ids.map((id) => conversationsCol(id).limit(1).get())),
      primero(ids.map((id) => automationsCol(id).limit(1).get())),
      primero(ids.map((id) => runsCol(id).limit(1).get())),
      adminDb.collection('pushSubscriptions').limit(1).get().then((q) => !q.empty),
      sistemaRef().get(),
      // Ajustes › Marca la guarda aquí (lib/identidad/servidor.ts).
      adminDb.doc('config/marca').get().then((d) => d.exists),
    ]);

    const s: Senales = {
      lectura: true,
      cuentas: ids.length > 0,
      insights: cuentas.docs.some((d) =>
        ((d.get('scopes') as string[] | undefined) ?? []).includes('instagram_business_manage_insights'),
      ),
      conversaciones,
      automatizaciones,
      ejecuciones,
      cronEn: (sistema.get('ultimoTickEn') as number | undefined) ?? null,
      avisos,
      marca,
    };
    memoria = { en: Date.now(), senales: s };
    return s;
  } catch (err) {
    // Sin credenciales del servidor (o sin reglas, o sin red): el paso
    // «servidor» sale pendiente y todo lo que depende de datos también.
    console.error('[guia] no se pudo leer Firestore', err instanceof Error ? err.message : err);
    memoria = { en: Date.now(), senales: SIN_DATOS };
    return SIN_DATOS;
  }
}

function estadoDe(id: PasoId, v: Record<string, boolean>, s: Senales): EstadoPaso {
  const todas = (nombres: string[]) => nombres.every((n) => v[n]);
  const si = (ok: boolean): EstadoPaso => (ok ? 'hecho' : 'pendiente');
  switch (id) {
    case 'cuentas':
      return s.cuentas ? 'hecho' : 'manual';
    case 'firebase':
      return si(todas(PASOS.firebase.variables!));
    case 'reglas':
      // Si el panel ya muestra conversaciones, las reglas dejan leer: se da por hecho.
      return s.conversaciones ? 'hecho' : 'manual';
    case 'servidor':
      return si(s.lectura);
    case 'meta':
      return si(todas(['META_APP_ID', 'META_APP_SECRET']));
    case 'llaves':
      return si(todas(['TOKEN_ENCRYPTION_KEY', 'CRON_SECRET']));
    case 'desplegar':
      return si(v.APP_URL);
    case 'webhook':
      if (!v.META_WEBHOOK_VERIFY_TOKEN) return 'pendiente';
      return s.conversaciones ? 'hecho' : 'manual';
    case 'mensajes':
      return s.conversaciones ? 'hecho' : 'manual';
    case 'instagram':
      return si(s.cuentas);
    case 'dm':
      return si(s.conversaciones);
    case 'cron':
      return si(s.cronEn !== null && Date.now() - s.cronEn < 10 * 60 * 1000);
    case 'insights':
      return si(s.insights);
    case 'automatizacion':
      return si(s.automatizaciones);
    case 'prueba':
      return si(s.ejecuciones);
    case 'claude':
      return si(v.CLAUDE_API_KEY);
    case 'celular':
      return si(s.avisos);
    case 'marca':
      // Sin Firebase vive en el navegador: la palomea la pantalla de Ajustes al guardarla.
      return s.marca ? 'hecho' : 'manual';
  }
}

export async function leerGuia(): Promise<Guia> {
  const v = variables();
  const s = await senales();
  const pasos = {} as Record<PasoId, PasoResuelto>;
  for (const paso of Object.values(PASOS)) {
    pasos[paso.id] = {
      ...paso,
      estado: estadoDe(paso.id, v, s),
      ...(paso.variables
        ? { variablesListas: paso.variables.map((nombre) => ({ nombre, lista: Boolean(v[nombre]) })) }
        : {}),
    };
  }
  const appUrl = hay(process.env.APP_URL) ? process.env.APP_URL!.trim().replace(/\/+$/, '') : null;
  return { pasos, appUrl, conectado: firebaseListo() };
}
