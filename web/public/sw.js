/*
 * Service worker del panel. Solo hace una cosa: recibir los avisos push y
 * enseñarlos. No intercepta peticiones (sin `fetch`): el panel lee Firestore
 * en vivo y la cookie `__session` tiene que llegar intacta al servidor.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let aviso = { titulo: 'Chatty', cuerpo: '', url: '/', tag: undefined };
  try {
    if (event.data) aviso = { ...aviso, ...event.data.json() };
  } catch {
    if (event.data) aviso.cuerpo = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(aviso.titulo, {
      body: aviso.cuerpo,
      icon: '/iconos/icono-192.png',
      badge: '/iconos/icono-192.png',
      tag: aviso.tag,
      renotify: Boolean(aviso.tag),
      data: { url: aviso.url },
    }),
  );
});

/*
 * Los avisos los arma el servidor, que no sabe desde qué aparato se van a
 * leer, así que traen las direcciones del panel de escritorio. En un celular
 * eso abriría el panel encogido en vez de la app: aquí se traducen.
 */
const EN_LA_APP = [
  [/^\/inbox(?=$|[/?])/, '/m/bandeja'],
  [/^\/contacts(?=$|[/?])/, '/m/contactos'],
  [/^\/automations(?=$|[/?])/, '/m/automatizaciones'],
  [/^\/asistente(?=$|[/?])/, '/m/asistente'],
  [/^\/settings(?=$|[/?])/, '/m/ajustes'],
];

const ES_CELULAR = /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(self.navigator.userAgent);

function aDondeVa(crudo) {
  const url = new URL(crudo || '/', self.location.origin);
  if (!ES_CELULAR || url.pathname.startsWith('/m')) return url.href;
  for (const [de, a] of EN_LA_APP) {
    if (de.test(url.pathname)) {
      url.pathname = url.pathname.replace(de, a);
      return url.href;
    }
  }
  return url.href;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = aDondeVa(event.notification.data?.url);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      // Si el panel ya está abierto, lo traemos al frente y lo llevamos ahí.
      for (const v of ventanas) {
        if (new URL(v.url).origin === self.location.origin && 'focus' in v) {
          if ('navigate' in v) v.navigate(destino);
          return v.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});

/*
 * El navegador puede renovar la suscripción por su cuenta (rota la llave,
 * cambia el endpoint). Le mandamos la nueva al servidor para no perder el
 * dispositivo sin que nadie se entere.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  const nueva = event.newSubscription
    ? Promise.resolve(event.newSubscription)
    : self.registration.pushManager.subscribe(event.oldSubscription?.options ?? { userVisibleOnly: true });

  event.waitUntil(
    nueva
      .then((sub) =>
        fetch('/api/push/suscribir', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suscripcion: sub.toJSON(), renovada: true }),
        }),
      )
      .catch(() => {}),
  );
});
