import 'server-only';

import { createHash } from 'node:crypto';
import webpush, { WebPushError } from 'web-push';
import { adminDb } from '../firebase-admin';
import { decryptToken, encryptToken } from '../crypto';
import {
  completaPreferencias,
  hitoCruzado,
  marcasDe,
  type Aviso,
  type AvisoEnviado,
  type Dispositivo,
  type EventoPush,
  type MetricaHito,
  type Preferencias,
} from './tipos';

/**
 * Avisos push al celular del dueño, con el estándar Web Push (sin Firebase
 * Cloud Messaging: no hace falta configurar nada en la consola).
 *
 *   config/push/private/claves     el par VAPID; se genera solo la primera vez.
 *                                  La privada va cifrada con TOKEN_ENCRYPTION_KEY y
 *                                  la subcolección `private` no la lee ningún cliente.
 *   config/notificaciones          qué avisos están prendidos (Ajustes › Notificaciones).
 *   config/notificacionesEstado    contadores, marcas cruzadas y el último lead visto.
 *   pushSubscriptions/{id}         un doc por celular o navegador suscrito.
 *   notificacionesEnviadas/{id}    historial, para ver qué salió aunque el teléfono lo perdiera.
 */

const clavesRef = () => adminDb.doc('config/push/private/claves');
const preferenciasRef = () => adminDb.doc('config/notificaciones');
const estadoRef = () => adminDb.doc('config/notificacionesEstado');
const suscripcionesCol = () => adminDb.collection('pushSubscriptions');
const historialCol = () => adminDb.collection('notificacionesEnviadas');

const HISTORIAL_MAX = 200;

// ---------------------------------------------------------------------------
// Llaves VAPID
// ---------------------------------------------------------------------------

type Claves = { publicKey: string; privateKey: string };
let cacheClaves: Claves | null = null;

/** El par de llaves del servidor. La primera llamada lo crea; las demás lo leen. */
export async function clavesVapid(): Promise<Claves> {
  if (cacheClaves) return cacheClaves;
  const claves = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(clavesRef());
    const data = snap.data() as { publicKey?: string; privateKeyEnc?: string } | undefined;
    if (data?.publicKey && data.privateKeyEnc) {
      return { publicKey: data.publicKey, privateKey: decryptToken(data.privateKeyEnc) };
    }
    const nuevas = webpush.generateVAPIDKeys();
    tx.set(clavesRef(), {
      publicKey: nuevas.publicKey,
      privateKeyEnc: encryptToken(nuevas.privateKey),
      creadoEn: Date.now(),
    });
    return nuevas;
  });
  cacheClaves = claves;
  return claves;
}

/** Web Push exige un contacto del remitente: la URL pública (https) o un correo. */
function sujetoVapid(): string {
  const url = process.env.APP_URL ?? '';
  if (url.startsWith('https://')) return url;
  const correo = (process.env.ALLOWED_EMAILS ?? '').split(',')[0]?.trim();
  return `mailto:${correo || 'admin@example.com'}`;
}

// ---------------------------------------------------------------------------
// Dispositivos suscritos
// ---------------------------------------------------------------------------

export type SuscripcionJson = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

type SuscripcionDoc = SuscripcionJson & {
  nombre: string;
  uid: string;
  creadoEn: number;
  ultimoEnvioEn: number | null;
  ultimoError: string | null;
};

export function idDeEndpoint(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex').slice(0, 32);
}

export function esSuscripcionValida(s: unknown): s is SuscripcionJson {
  const x = s as SuscripcionJson | null;
  return Boolean(
    x &&
      typeof x.endpoint === 'string' &&
      x.endpoint.startsWith('https://') &&
      x.keys &&
      typeof x.keys.p256dh === 'string' &&
      typeof x.keys.auth === 'string',
  );
}

/** Guarda (o renueva) la suscripción de un dispositivo. Devuelve si era nueva. */
export async function guardarSuscripcion(
  uid: string,
  sub: SuscripcionJson,
  nombre: string | null,
): Promise<{ id: string; nueva: boolean }> {
  const id = idDeEndpoint(sub.endpoint);
  const ref = suscripcionesCol().doc(id);
  const previa = await ref.get();
  const doc: SuscripcionDoc = {
    endpoint: sub.endpoint,
    expirationTime: sub.expirationTime ?? null,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    nombre: nombre?.trim() || (previa.data() as SuscripcionDoc | undefined)?.nombre || 'Dispositivo',
    uid,
    creadoEn: (previa.data() as SuscripcionDoc | undefined)?.creadoEn ?? Date.now(),
    ultimoEnvioEn: (previa.data() as SuscripcionDoc | undefined)?.ultimoEnvioEn ?? null,
    ultimoError: null,
  };
  await ref.set(doc);
  return { id, nueva: !previa.exists };
}

export async function borrarSuscripcion(q: { id?: string; endpoint?: string }): Promise<void> {
  const id = q.id ?? (q.endpoint ? idDeEndpoint(q.endpoint) : null);
  if (!id) return;
  await suscripcionesCol().doc(id).delete();
}

export async function listarDispositivos(): Promise<Dispositivo[]> {
  const snap = await suscripcionesCol().orderBy('creadoEn', 'desc').get();
  return snap.docs.map((d) => {
    const x = d.data() as SuscripcionDoc;
    return {
      id: d.id,
      nombre: x.nombre,
      endpoint: x.endpoint,
      creadoEn: x.creadoEn,
      ultimoEnvioEn: x.ultimoEnvioEn ?? null,
      ultimoError: x.ultimoError ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Preferencias y estado
// ---------------------------------------------------------------------------

export async function leerPreferencias(): Promise<Preferencias> {
  const snap = await preferenciasRef().get();
  return completaPreferencias(snap.data() as Partial<Preferencias> | undefined);
}

export async function guardarPreferencias(p: Preferencias): Promise<void> {
  await preferenciasRef().set({ ...completaPreferencias(p), actualizadoEn: Date.now() });
}

type Estado = {
  contadores?: Partial<Record<MetricaHito, number>>;
  /** La última marca avisada por métrica. */
  hitos?: Partial<Record<MetricaHito, number>>;
  seguidoresRevisadosEn?: number;
  historialLimpiadoEn?: number;
};

export async function leerEstado(): Promise<Estado> {
  const snap = await estadoRef().get();
  return (snap.data() as Estado | undefined) ?? {};
}

export async function guardarEstado(patch: Estado): Promise<void> {
  await estadoRef().set(patch, { merge: true });
}

// ---------------------------------------------------------------------------
// Enviar
// ---------------------------------------------------------------------------

export type ResultadoEnvio = { enviados: number; fallidos: number; omitido?: 'apagado' | 'sin-dispositivos' };

/**
 * Manda un aviso a todos los dispositivos suscritos. Respeta lo apagado en
 * Ajustes (salvo `prueba`), da de baja las suscripciones muertas (404/410) y
 * deja el aviso en el historial.
 */
export async function notificar(evento: EventoPush, aviso: Aviso): Promise<ResultadoEnvio> {
  if (evento !== 'prueba') {
    const prefs = await leerPreferencias();
    if (!prefs.eventos[evento]) return { enviados: 0, fallidos: 0, omitido: 'apagado' };
  }

  const subs = await suscripcionesCol().get();
  if (subs.empty) return { enviados: 0, fallidos: 0, omitido: 'sin-dispositivos' };

  const claves = await clavesVapid();
  const vapidDetails = { subject: sujetoVapid(), publicKey: claves.publicKey, privateKey: claves.privateKey };
  const limpio: Aviso = {
    titulo: aviso.titulo.slice(0, 120),
    cuerpo: aviso.cuerpo.slice(0, 400),
    url: aviso.url ?? '/',
    ...(aviso.tag ? { tag: aviso.tag } : {}),
  };
  const payload = JSON.stringify(limpio);

  let enviados = 0;
  let fallidos = 0;
  await Promise.all(
    subs.docs.map(async (doc) => {
      const d = doc.data() as SuscripcionDoc;
      try {
        await webpush.sendNotification({ endpoint: d.endpoint, keys: d.keys }, payload, {
          vapidDetails,
          TTL: 24 * 60 * 60,
          urgency: 'high',
        });
        enviados++;
        await doc.ref.update({ ultimoEnvioEn: Date.now(), ultimoError: null });
      } catch (err) {
        fallidos++;
        const codigo = err instanceof WebPushError ? err.statusCode : 0;
        // El navegador borró la suscripción: el dispositivo ya no existe para nosotros.
        if (codigo === 404 || codigo === 410) {
          await doc.ref.delete();
          return;
        }
        const detalle = err instanceof Error ? err.message : String(err);
        await doc.ref.update({ ultimoError: `${codigo || ''} ${detalle}`.trim().slice(0, 200) });
        console.error('[push] falló el envío a', d.nombre, detalle);
      }
    }),
  );

  await historialCol().add({ ...limpio, evento, enviadoEn: Date.now(), dispositivos: enviados, fallidos });
  return { enviados, fallidos };
}

export async function historial(n = 30): Promise<AvisoEnviado[]> {
  const snap = await historialCol().orderBy('enviadoEn', 'desc').limit(n).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AvisoEnviado, 'id'>) }));
}

/** Deja solo los últimos HISTORIAL_MAX avisos. Lo llama el cron de vez en cuando. */
export async function limpiarHistorial(): Promise<number> {
  const viejos = await historialCol().orderBy('enviadoEn', 'desc').offset(HISTORIAL_MAX).limit(200).get();
  if (viejos.empty) return 0;
  const batch = adminDb.batch();
  for (const d of viejos.docs) batch.delete(d.ref);
  await batch.commit();
  return viejos.size;
}

// ---------------------------------------------------------------------------
// Los eventos del negocio
// ---------------------------------------------------------------------------

const NOMBRE_METRICA: Record<MetricaHito, string> = {
  seguidores: 'seguidores',
  comentarios: 'comentarios',
  contactos: 'personas te han escrito',
};

const RUTA_METRICA: Record<MetricaHito, string> = {
  seguidores: '/settings',
  comentarios: '/inbox',
  contactos: '/contacts',
};

const numero = (n: number) => new Intl.NumberFormat('es-MX').format(n);

/**
 * Checkpoint: avisa si `valor` cruzó una marca redonda que no se había
 * avisado. La primera vez que ve una métrica solo anota dónde va, sin avisar:
 * un checkpoint de hace meses no es noticia.
 */
export async function revisarHito(metrica: MetricaHito, valor: number): Promise<void> {
  const estado = await leerEstado();
  const ultimo = estado.hitos?.[metrica];

  if (ultimo === undefined) {
    const cruzadas = marcasDe(metrica).filter((m) => m <= valor);
    await guardarEstado({ hitos: { [metrica]: cruzadas.length ? cruzadas[cruzadas.length - 1] : 0 } });
    return;
  }

  const marca = hitoCruzado(metrica, valor, ultimo);
  if (marca === null) return;
  await guardarEstado({ hitos: { [metrica]: marca } });

  const prefs = await leerPreferencias();
  if (!prefs.hitos[metrica]) return;

  await notificar('checkpoint', {
    titulo: `🏁 ${numero(marca)} ${NOMBRE_METRICA[metrica]}`,
    cuerpo:
      valor > marca
        ? `Cruzaste la marca de ${numero(marca)}. Vas en ${numero(valor)}.`
        : `Acabas de llegar a ${numero(marca)}.`,
    url: RUTA_METRICA[metrica],
    tag: `hito-${metrica}`,
  });
}

/**
 * Un comentario nuevo en una publicación. Suma al contador y, cada N
 * (Ajustes), manda un aviso con el último que llegó.
 */
export async function registrarComentario(datos: { username: string | null; texto: string }): Promise<void> {
  const total = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(estadoRef());
    const actual = ((snap.data() as Estado | undefined)?.contadores?.comentarios ?? 0) + 1;
    tx.set(estadoRef(), { contadores: { comentarios: actual } }, { merge: true });
    return actual;
  });

  const prefs = await leerPreferencias();
  const n = prefs.cadaComentarios;
  if (prefs.eventos.comentarios && total % n === 0) {
    const quien = datos.username ? `@${datos.username}` : 'Alguien';
    await notificar('comentarios', {
      titulo: `💬 ${n} comentarios nuevos`,
      cuerpo: `Ya van ${numero(total)}. El último, ${quien}: «${datos.texto.slice(0, 120)}»`,
      url: '/inbox',
      tag: 'comentarios',
    });
  }

  await revisarHito('comentarios', total);
}
