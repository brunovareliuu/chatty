'use client';

/**
 * El lado del navegador de los avisos push: registrar el service worker,
 * pedir permiso, suscribirse y mandar la suscripción al servidor.
 *
 * En iPhone solo funciona con el panel agregado a la pantalla de inicio
 * (iOS 16.4+); en Safari normal `PushManager` ni existe. Android y escritorio
 * funcionan desde el navegador.
 */

export type EstadoPush =
  | 'cargando'
  | 'sin-soporte' // el navegador no sabe de push
  | 'ios-sin-instalar' // iPhone/iPad fuera de la pantalla de inicio
  | 'bloqueado' // el usuario negó el permiso: solo se arregla en los ajustes del sistema
  | 'inactivo' // hay soporte y no está suscrito
  | 'activo'; // suscrito en este dispositivo

export function esIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // El iPad con Safari se presenta como Mac; el toque lo delata.
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export function esStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function soportaPush(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function registrarSw(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
  } catch (err) {
    console.warn('[push] no se pudo registrar el service worker', err);
    return null;
  }
}

export async function suscripcionActual(): Promise<PushSubscription | null> {
  if (!soportaPush()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function estadoPush(): Promise<EstadoPush> {
  if (!soportaPush()) return esIos() && !esStandalone() ? 'ios-sin-instalar' : 'sin-soporte';
  if (Notification.permission === 'denied') return 'bloqueado';
  const sub = await suscripcionActual();
  return sub ? 'activo' : 'inactivo';
}

function claveAUint8(base64: string): Uint8Array {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const crudo = window.atob(b64);
  const salida = new Uint8Array(crudo.length);
  for (let i = 0; i < crudo.length; i++) salida[i] = crudo.charCodeAt(i);
  return salida;
}

/** Un nombre legible para la lista de dispositivos: «iPhone», «Mac · Chrome»… */
export function nombreDispositivo(): string {
  const ua = navigator.userAgent;
  const aparato = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Macintosh/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : 'Navegador';
  const navegador = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : '';
  const app = esStandalone() ? ' · app' : navegador ? ` · ${navegador}` : '';
  return `${aparato}${app}`;
}

export class PushBloqueado extends Error {
  constructor() {
    super('El permiso de notificaciones está bloqueado en este dispositivo.');
    this.name = 'PushBloqueado';
  }
}

/**
 * Pide permiso y suscribe este dispositivo. Tiene que llamarse desde un toque
 * o clic del usuario: los navegadores ignoran la petición si no.
 */
export async function activarPush(): Promise<void> {
  if (!soportaPush()) throw new Error('Este navegador no recibe notificaciones.');

  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new PushBloqueado();

  const reg = (await registrarSw()) ?? (await navigator.serviceWorker.ready);
  await navigator.serviceWorker.ready;

  const res = await fetch('/api/push/clave');
  if (!res.ok) throw new Error('No se pudo obtener la llave del servidor.');
  const { clavePublica } = (await res.json()) as { clavePublica: string };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: claveAUint8(clavePublica) as BufferSource,
    });
  }

  const guardado = await fetch('/api/push/suscribir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suscripcion: sub.toJSON(), nombre: nombreDispositivo() }),
  });
  if (!guardado.ok) {
    const body = (await guardado.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'El servidor no guardó la suscripción.');
  }
}

export async function desactivarPush(): Promise<void> {
  const sub = await suscripcionActual();
  if (!sub) return;
  await fetch('/api/push/suscribir', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});
  await sub.unsubscribe();
}
