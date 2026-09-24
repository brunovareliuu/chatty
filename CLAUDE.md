# Chatty — contexto para programar

Chatty es un ManyChat propio para Instagram que cada quien despliega en su Firebase: una bandeja
para los DMs, automatizaciones por palabra clave, un constructor visual de flujos, contactos, un
asistente con Claude que arma automatizaciones y una app de celular con avisos push.

Escribe en español: código, comentarios, UI, commits y respuestas. Tono directo, sin groserías.

Lee también `README.md` (qué es y límites de Meta), `docs/` (instalación y uso),
`web/AGENTS.md` (Next.js 16 no es el Next que conoces: lee su guía en
`web/node_modules/next/dist/docs/` antes de escribir código de Next) y `CONTRIBUTING.md`.

**Nada atado a un despliegue.** El repo no trae ningún proyecto de Firebase, app de Meta,
dominio ni marca: todo sale de variables de entorno (`web/.env.example`, `web/apphosting.yaml`,
`docs/04-variables-de-entorno.md`) y la marca de quien lo usa, de `web/src/lib/marca.ts`. Nunca
metas en el código un correo, un dominio, un id de proyecto o datos de una persona real.

---

## Cómo está partido el código

La app vive en `web/` (Next.js 16, App Router). Las reglas de Firestore, en la raíz.

| Carpeta | Qué es |
|---|---|
| `web/src/app/(app)/…` | El panel de escritorio: bandeja, automatizaciones, flujos, contactos, asistente y ajustes, con barra lateral. |
| `web/src/app/m/…` | La app del celular (hermana de `(app)`, no cuelga de ella). |
| `web/src/app/instalar` | La guía de instalación. Sin Firebase configurado es lo único que se abre, y sin sesión. |
| `web/src/app/api/…` | Endpoints: webhook de Meta, cron, conexión de Instagram, asistente, mensajes, push y sesión. |
| `web/src/app/privacidad` | La política de privacidad pública (la pide Meta). |
| `web/src/lib/` | Lógica: el motor de flujos, Meta, sesión, avisos y el asistente. |
| `web/src/components/` | Pantallas y piezas, una carpeta por sección; `ui/` es el kit base y `movil/ui/` el de la app del celular. |
| `firestore.rules`, `firestore.indexes.json` | Seguridad e índices. Se despliegan con `firebase deploy --only firestore` (App Hosting no los toca). |
| `scripts/probar-reglas.sh` | Prueba de las reglas contra el emulador, con usuarios simulados. |

## Arquitectura

```
Instagram ──webhook──▶ /api/webhooks/instagram ──▶ Firestore
                                │                      │
                                ▼                      ▼
                       motor de flujos           bandeja en vivo
                                │             (onSnapshot en el navegador)
                                ▼
                       API de Instagram

Cloud Scheduler ──cada minuto──▶ /api/cron/tick
Panel ──▶ /api/asistente ──▶ Claude (con herramientas)
```

No hay carpeta `functions/` **a propósito**: el motor, el cron y el asistente viven en el mismo
despliegue de Next, y el cron es un endpoint protegido por secreto. Un solo despliegue es lo que
hace viable que cualquiera lo hospede. No lo partas en dos sin un motivo fuerte.

**Modo instalación.** `web/src/lib/instalacion.ts` dice si están las seis variables
`NEXT_PUBLIC_FIREBASE_*`. Si falta alguna, `/`, `(app)`, `/m` y `/login` mandan a `/instalar`:
sin ellas el SDK de Firebase del navegador truena y no hay login posible. `/instalar` enseña los
pasos y una lista en vivo de las variables (solo si existen, nunca su valor). Ya configurado,
`/instalar` pide sesión. Si agregas una variable obligatoria, súmala a esa lista.

**Sesión.** El navegador entra con Firebase Auth (Google o correo y contraseña). El servidor
(`/api/auth/session`) cambia el ID token por la cookie `__session` y, si el correo está en
`ALLOWED_EMAILS` (o es el primer usuario, cuando la lista está vacía), crea `users/{uid}`. Las
reglas piden que ese documento exista (`isMember()`). Quien ya tiene documento sigue entrando
aunque lo saquen de la lista: para quitarle el acceso hay que borrarlo.

## Mapa de archivos

| Archivo | Qué hace |
|---|---|
| `web/src/lib/types.ts` | El modelo de datos completo. Empieza aquí. |
| `web/src/lib/instagram.ts` | Cliente de la Graph API: OAuth, envío, comentarios, permisos (`IG_SCOPES`) y campos de webhook. |
| `web/src/lib/webhook-handler.ts` | Traduce eventos de Meta, marca a quien llega por un anuncio y decide qué automatización responde. |
| `web/src/lib/engine/runner.ts` | Ejecuta los flujos nodo por nodo. |
| `web/src/lib/engine/matcher.ts` | Palabras clave, prioridad, respuesta pública al azar y botones escritos a mano. |
| `web/src/lib/engine/starter-flow.ts` | El flujo con el que nace una automatización (panel y asistente). |
| `web/src/lib/accounts.ts` | Cuentas conectadas + renovación y descifrado de tokens. |
| `web/src/lib/messaging.ts` | Persistencia de mensajes y envío con registro. |
| `web/src/lib/session.ts` | Sesión y `ALLOWED_EMAILS`. |
| `web/src/lib/instalacion.ts` | Si el despliegue ya tiene Firebase y qué variables faltan. |
| `web/src/lib/marca.ts` | La marca de quien usa el panel (`MARCA`, `SITE_URL`, `SITE_DOMINIO`, `ZONA_HORARIA`). Puro. |
| `web/src/lib/env.ts` | `requireEnv()` y `appUrl()`. |
| `web/src/components/flow/node-config.tsx` | Metadata de nodos: iconos, puertos, resúmenes. |
| `web/src/app/api/cron/tick/route.ts` | El latido: esperas, timeouts, tokens y seguidores. |

## Asistente (`/asistente`)

Claude con herramientas: crea cosas reales en la cuenta (una automatización activa contesta en
Instagram en cuanto se crea).

| Archivo | Qué hace |
|---|---|
| `web/src/app/api/asistente/route.ts` | Un mensaje: bucle de herramientas, streaming NDJSON y guardado. |
| `web/src/lib/asistente/herramientas.ts` | Las cuatro herramientas (`ver_publicaciones`, `ver_automatizaciones`, `crear_automatizacion`, `editar_automatizacion`), sus esquemas y la validación de lo que pide Claude. |
| `web/src/lib/asistente/instrucciones.ts` | Instrucciones de sistema, con caché. |
| `web/src/lib/asistente/historial.ts` | Conversaciones en Firestore y su conversión a lo que pinta la pantalla. |
| `web/src/lib/asistente/claude.ts` | Cliente, modelo (`CLAUDE_MODEL`, `claude-sonnet-5`) y errores legibles. |

- Pensamiento adaptativo y `fallbacks: 'default'` (cabecera beta `server-side-fallback-2026-07-01`).
  Lo que quedó antes de un bloque `fallback` solo se reenvía como texto (`replayable()`).
- Cada mensaje se guarda tal cual lo devolvió Claude: los bloques de pensamiento llevan firma y se
  reenvían sin tocar. `repairHistory()` completa resultados de herramienta a medias.
- **El asistente trabaja para el dueño de la cuenta.** Las respuestas automáticas con IA a los
  seguidores están descartadas: el motor de flujos no llama a Claude.

## La app del celular (`/m`) y los avisos push

Guía para programar pantallas: `docs/desarrollo/app-movil.md`. Lo imprescindible:

- Cinco pestañas: Hoy · Bandeja · Automatizar · Contactos · Más. `raizDe()` en
  `components/movil/ui/tabs.tsx` dice cuál se enciende con cada ruta: **una ruta nueva se apunta
  ahí**, si no la barra se apaga al entrar.
- `app/m/movil.css` redefine **los mismos tokens** de `globals.css` con valores de iOS, así
  `components/ui/*` se ve de iOS ahí sin cambiarlo (ojo: en iOS `--bg` es el gris y `--surface`
  el blanco). El kit está en `components/movil/ui/`: si dudas, es una `Seccion` con `Fila`s.
- `app/page.tsx` manda el celular a `/m` y la computadora a `/inbox`; el service worker traduce
  las direcciones de los avisos según quién los toca.
- Push: Web Push estándar, sin FCM. `lib/push/tipos.ts` (eventos y preferencias, puro),
  `lib/push/cliente.ts` (navegador), `lib/push/servidor.ts` (`notificar(evento, aviso)`, borra
  suscripciones muertas). Llaves VAPID generadas solas en `config/push/private/claves`.
  `public/sw.js` solo maneja `push` y `notificationclick`: **sin `fetch`**, a propósito.
- Eventos: `automatizacion`, `comentarios`, `checkpoint`, `dm_sin_respuesta` y `prueba`.

## Datos

El modelo completo está en `docs/datos.md`:

```
/users/{uid}                          quién puede entrar (lo escribe solo el servidor)
/accounts/{igUserId}                  cuenta conectada — legible por el panel
  /private/credentials                token de Meta cifrado — NEGADO a todo cliente
  /contacts/{igsid}
  /conversations/{igsid}/messages/{mid}
  /automations/{id}                   disparador → flujo
  /flows/{id}                         nodos y aristas
  /runs/{id}                          ejecuciones en curso
  /tags/{id}
  /assistantChats/{id}/messages/{n}   conversaciones del asistente — solo servidor
/config/…, /pushSubscriptions, /notificacionesEnviadas   avisos push — solo servidor
```

Si agregas una colección: su regla en `firestore.rules` (o nada, si es solo del servidor: la
regla final la niega), sus índices en `firestore.indexes.json`, su fila en `docs/datos.md` y una
prueba en `scripts/probar-reglas.sh` si la toca el navegador.

---

## Reglas que no se rompen

**Los IDs de puerto son un contrato.** `outputHandles()` en `node-config.tsx` y el `case` en
`runner.ts` tienen que devolver los mismos identificadores (`'true'`/`'false'`,
`'answered'`/`'timeout'`, `'follows'`/`'timeout'`, el id del botón, `'next'`). Si no coinciden,
las aristas dejan de enrutar **en silencio**: sin error, el flujo simplemente se corta.

**El primer mensaje de un run de comentario es la respuesta privada.** `startRun` recibe
`privateReply` y el runner la manda contra `comment_id`, solo como texto (`toPlainText`). Ya
enviada, cualquier nodo de `SENDING_NODES` espera a que la persona conteste
(`waitingForWindow`). Un nodo nuevo que mande mensajes tiene que ir en esa lista.

**Los tokens de Meta jamás tocan el cliente.** Viven cifrados en
`accounts/{id}/private/credentials`, que las reglas niegan por completo. `getAccountToken()` en
`accounts.ts` es el **único** lugar que descifra.

**La llave de Claude jamás toca el cliente.** Solo `lib/asistente/claude.ts` la lee; todo lo
que habla con Claude corre en rutas del servidor.

**El webhook responde rápido.** Meta reintenta si tardamos. Valida, contesta 200 y haz el
trabajo pesado dentro de `after()` de `next/server`.

**La cookie de sesión se llama `__session`.** App Hosting (Cloud Run detrás de su CDN) solo
deja pasar esa. Otro nombre rompe el login en producción, no en local.

**Nunca un hex literal en una pantalla.** Todo color de interfaz sale de los tokens de
`globals.css`; el único parámetro de marca es el acento (el naranja `#fa4c03`, igual en claro y
oscuro). Se escribe `text-accent`, `bg-accent/10`, `border-accent`, nunca `[#fa4c03]`. Los
colores de estado son rojo (`neg`) y verde (`pos`).

**Nada de `setState` dentro de un efecto.** El ESLint de React lo marca como error.
`firestore-hooks.ts` deriva el estado de carga comparando una `key` en el render, y el lienzo de
flujos se monta con el flujo ya cargado (`Canvas` recibe `initialFlow` por props): si se
resincronizara con cada snapshot, pisaría lo que el usuario está moviendo. Para cargar datos en
un efecto, llama a `setState` dentro del `.then`.

**Nada atado a un despliegue ni datos reales.** Ver arriba.

## Trampas conocidas

- **El borde por omisión tiene que estar en `@layer base`.** Una regla `* { border-color }` sin
  capa le gana a todas las utilidades de Tailwind: `border-accent` y compañía salen grises sin
  aviso. Si un borde de color no pinta, mira eso primero.
- **`adminDb.settings()` va dentro de un `try/catch`** en `firebase-admin.ts`: Next evalúa el
  módulo en varios workers al construir y `settings()` solo admite una llamada.
- **`scripts/` está excluido de `tsconfig.json`.** Las pruebas corren con el type-stripping
  nativo de Node, que exige importar con extensión `.ts` y no entiende el alias `@/`.
- **`RouteContext` y otros tipos globales de Next** los genera `next dev`/`next build` en
  `.next/types`. Si `npm run typecheck` se queja en un checkout recién clonado, corre antes
  `npx next typegen`.
- **Chrome sin ventana no baja de ~500 px de ancho.** Para ver la app a 390 px, emula el
  dispositivo por CDP (`Emulation.setDeviceMetricsOverride`); con `--window-size` la captura sale
  recortada aunque la página esté bien.
- **`lucide-react` ya no trae iconos de marca.** El de Instagram es un SVG propio en
  `components/ui/instagram-icon.tsx`.
- **Las URLs del CDN de Meta caducan en horas.** El tipo `Attachment` prevé `mirroredUrl` para
  copiar adjuntos a Storage.
- **zsh aborta el comando entero si un glob no coincide** (`--include=*.ts` sin comillas): pon
  los globs entre comillas.

## Límites de Meta (no son bugs)

- **Ventana de 24 h**: solo se escribe libremente durante las 24 h posteriores al último mensaje
  *del usuario*. Fuera de eso, la etiqueta `HUMAN_AGENT` (hasta 7 días), **solo** para respuestas
  escritas por una persona — el motor nunca la usa.
- **Un DM privado por comentario**, dentro de 7 días, **solo de texto**. Los botones se convierten
  en texto y escribir el texto de un botón cuenta como tocarlo.
- **Saber si alguien te sigue** (`is_user_follow_business`) solo funciona después de que la
  persona escribió o tocó un botón. «Pedir que te siga» deja pasar si Meta no deja comprobarlo.
- 1000 bytes por mensaje, 3 botones, 13 respuestas rápidas.
- Tokens de 60 días, renovados por el cron.
- Cuentas sin rol en la app de Meta exigen revisión de la app.
- API base: `https://graph.instagram.com/v25.0` (no requiere página de Facebook).

## Comandos

```bash
cd web
npm run dev         # servidor local (sin .env.local abre /instalar)
npm run test        # motor de flujos y matcher
npm run typecheck   # si faltan tipos de Next: npx next typegen
npm run lint
npm run build
node scripts/iconos.mjs   # rehace los iconos desde scripts/logo/marca.svg

# desde la raíz
firebase deploy --only firestore      # reglas e índices
firebase emulators:exec --only firestore --project demo-chatty ./scripts/probar-reglas.sh
```

Producción despliega sola con cada push a la rama conectada en App Hosting
(`docs/06-desplegar.md`).

## Cómo agregar un tipo de nodo

1. `web/src/lib/types.ts` — nombre en `NodeType`, campos en `FlowNodeData`.
2. `web/src/lib/engine/runner.ts` — un `case` en `runNode` que devuelva `continue`, `sleep`,
   `wait_reply` o `stop`. Si manda mensajes, súmalo a `SENDING_NODES`.
3. `web/src/components/flow/node-config.tsx` — entrada en `NODE_META`, puertos en
   `outputHandles` y resumen en `nodeSummary`.
4. `web/src/components/flow/node-inspector.tsx` — el formulario para editarlo.

`outputHandles` y el `case` del runner tienen que usar los mismos identificadores de puerto.
