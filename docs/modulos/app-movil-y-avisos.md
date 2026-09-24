# La app del celular y los avisos

El panel trae su propia app de celular en `/m`, con el look de las apps de iOS (listas
agrupadas, títulos grandes, hojas que suben), y manda **avisos push** al teléfono. No es una
app de tienda: es una PWA que se instala desde el navegador, sin Firebase Cloud Messaging ni
nada que configurar en consolas.

## Instalarla

Abre tu `APP_URL` en el teléfono: si entras desde un celular te lleva solo a `/m`.

- **iPhone (iOS 16.4 o más nuevo):** en Safari, **Compartir → Agregar a inicio**. Los avisos
  push **solo** funcionan con la app instalada así.
- **Android:** Chrome ofrece «Instalar app», o menú ⋮ → **Agregar a la pantalla principal**.

Desde la app, **Más › Ver el panel de escritorio** abre el panel completo.

## Las pestañas

| Pestaña | Qué hay |
|---|---|
| **Hoy** | Sin leer, automatizaciones que saltaron hoy, contactos nuevos y quién te escribió |
| **Bandeja** | Tus DMs, para leer y contestar |
| **Automatizar** | Tus automatizaciones: prenderlas, apagarlas, crear una nueva |
| **Contactos** | Quién te escribió, con sus etiquetas y datos |
| **Más** | Estadísticas, el asistente, Primeros pasos, Ajustes, la apariencia y el panel de escritorio |

El constructor visual de flujos pide pantalla grande: desde el celular te lleva al panel de
escritorio. La app nunca es un callejón sin salida.

## Activar los avisos

1. Con la app instalada, ve a **Ajustes › Notificaciones** (o toca «Activar» en el aviso que
   aparece). El permiso se pide **con un toque**: el navegador no deja pedirlo solo.
2. Manda un aviso de **prueba**.
3. Elige de qué quieres enterarte:

| Aviso | Cuándo llega | Viene prendido |
|---|---|---|
| Automatización disparada | Solo las que marcaste con «avisarme» | Sí |
| Comentarios | Cada tantos comentarios nuevos (5, 10, 25, 50 o 100) | Sí |
| Checkpoints | Seguidores, comentarios o contactos cruzan una marca redonda | Sí |
| DMs sin contestar | Un DM que ninguna automatización atendió, o que llegó a una conversación que atiendes tú | No (Instagram ya te avisa) |

Cada dispositivo se suscribe por separado; en Ajustes ves cuáles están suscritos y los últimos
avisos que salieron. Tocar un aviso abre la pantalla correspondiente (en el celular, la de la
app; en la computadora, la del panel).

## Cómo funciona por dentro

- **Web Push estándar** con llaves VAPID que el panel genera solo la primera vez (la privada se
  guarda cifrada con `TOKEN_ENCRYPTION_KEY` en `config/push/private/claves`).
- El service worker (`web/public/sw.js`) solo maneja `push` y los toques: no intercepta ninguna
  otra petición.
- Los de seguidores los revisa el [cron](../07-cron.md) cada hora; los de automatizaciones,
  comentarios y DMs, el webhook en el momento.

## Si no llegan

- En iPhone: tiene que estar instalada en la pantalla de inicio. Si negaste el permiso, se
  arregla en Ajustes del iPhone → Notificaciones → tu app, no desde el panel.
- Revisa que el aviso esté prendido en Ajustes › Notificaciones y que tu dispositivo aparezca
  suscrito.
- Los checkpoints de seguidores necesitan el cron corriendo.

La guía para programar pantallas de `/m` (el kit de componentes, los colores, el mapa de
rutas) está en [docs/desarrollo/app-movil.md](../desarrollo/app-movil.md).
