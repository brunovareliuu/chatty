# Chatty — contexto para programar

Chatty es un ManyChat propio para Instagram que cada quien despliega en su Firebase: una bandeja
para los DMs, automatizaciones por palabra clave, un constructor visual de flujos, contactos,
estadísticas de la cuenta, un asistente con Claude que arma automatizaciones y una app de celular
con avisos push. Sin Firebase se abre en *modo guía*: el sistema con sus secciones y, en cada una,
el checklist de lo que le falta.

Escribe en español: código, comentarios, UI, commits y respuestas. Tono directo, sin groserías.

Lee también `README.es.md` (qué es y límites de Meta; `README.md` es lo mismo en inglés), `docs/` (instalación y uso),
`web/AGENTS.md` (Next.js 16 no es el Next que conoces: lee su guía en
`web/node_modules/next/dist/docs/` antes de escribir código de Next) y `CONTRIBUTING.md`.

**Nada atado a un despliegue.** El repo no trae ningún proyecto de Firebase, app de Meta,
dominio ni marca: todo sale de variables de entorno (`web/.env.example`, `web/apphosting.yaml`,
`docs/04-variables-de-entorno.md`), la marca de quien lo usa de `web/src/lib/marca.ts` y la
identidad del panel (nombre, logo y color) de Ajustes › Marca. Nunca metas en el código un correo,
un dominio, un id de proyecto o datos de una persona real.

---

## Cómo está partido el código

La app vive en `web/` (Next.js 16, App Router). Las reglas de Firestore, en la raíz.

| Carpeta | Qué es |
|---|---|
| `web/src/app/(app)/…` | El panel de escritorio: bandeja, automatizaciones, flujos, contactos, estadísticas, asistente, ajustes y primeros pasos, con barra lateral. |
| `web/src/app/m/…` | La app del celular (hermana de `(app)`, no cuelga de ella). |
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

**Modo guía y Primeros pasos.** `web/src/lib/instalacion.ts` dice si están las seis variables
`NEXT_PUBLIC_FIREBASE_*`. Si falta alguna, el SDK de Firebase del navegador truena, así que
`(app)/layout.tsx` no pinta el panel real: pinta `ShellGuia` (la misma barra, sin Firebase) y cada
página de sección devuelve `<PantallaModulo id=… />` (qué es, una vista previa con datos de ficción
y su checklist) en vez de su pantalla. `/`, `/m` y `/login` mandan a `/primeros-pasos`.

- El catálogo vive en `web/src/lib/guia/pasos.ts` (puro): cada paso con cómo se hace, comandos,
  enlaces y cómo se revisa (`variables`, `datos` o `manual`), y qué pasos necesita cada sección.
- `web/src/lib/guia/estado.ts` (servidor) decide qué ya está: las variables (solo si existen) y,
  con Firebase, Firestore (una cuenta, una conversación, una automatización, una ejecución, el
  permiso de estadísticas, una suscripción push y el latido del cron en `config/sistema`). Guarda
  un minuto de memoria para no leer en cada navegación.
- Lo `manual` lo palomea la persona; se guarda en `localStorage` (`components/guia/hechos.ts`) y
  todas las listas y contadores leen de ahí.
- Ya conectado, la barra lateral enseña «Primeros pasos» con su avance, cada sección pone arriba
  `AvisoModulo` si le falta algo, y `/primeros-pasos/<sección>` enseña su checklist.
- Si agregas un paso o una sección, va en `pasos.ts` (y su regla de estado en `estado.ts`).

**La identidad del panel (Ajustes › Marca).** Nombre, logo y color: la ve todo el que entra, en
la barra, el login, la pestaña, la app del celular y su ícono. Guía completa en
`docs/modulos/marca.md`.

- `lib/identidad/tipos.ts` (puro, con pruebas en `scripts/identidad-test.ts`): el color, lo que
  se acepta guardar, la burbuja de fábrica (el ícono) y el letrero «chatty» (`LETRERO`, con la
  cola de la «y» en `fill-accent`; `usaLetrero()` dice cuándo va en vez del cuadro con el
  nombre, y `LogoConNombre` lo pinta en la barra). De un solo color salen cuatro variables (`--marca`,
  `--marca-fg`, `--marca-oscuro`, `--marca-fg-oscuro`): el texto que se lee encima y la versión
  para el modo oscuro (se aclara si no se ve sobre negro; los grises pasan a casi blanco).
- `globals.css` y `m/movil.css` derivan de ahí `--accent`, `--accent-fg` y `--accent-soft`.
  Ninguna pantalla sabe cuál es el color.
- Ya conectado vive en `config/marca` (y el logo, PNG en data URL, aparte en `config/marcaLogo`).
  El layout raíz lo lee con `leerIdentidad()` (`lib/identidad/servidor.ts`, un minuto de memoria)
  y pinta el color en `<style id="marca">`, sin parpadeo. Se guarda por `PUT /api/identidad`.
- En el modo guía vive en `localStorage` (`chatty:marca`): `SCRIPT_LOCAL` pone el color en el
  `<head>` antes de pintar.
- En el navegador, `useIdentidad()` (`components/identidad/proveedor.tsx`) da nombre y logo, y
  `<LogoMarca />` los pinta. La pantalla de Ajustes tiñe todo el panel mientras eliges
  (`vistaPrevia`).
- Los iconos (favicon, la app del celular, los avisos) los pinta
  `app/iconos/[archivo]/route.tsx` con `next/og`. Tienen los mismos nombres que tenían cuando
  eran archivos de `public/iconos`, con `?v=` de la última vez que se guardó.

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
| `web/src/lib/instalacion.ts` | Si el despliegue ya tiene Firebase (si no, modo guía). |
| `web/src/lib/guia/` | El catálogo de pasos por sección y qué ya está hecho. |
| `web/src/lib/marca.ts` | La marca de quien usa el panel (`MARCA`, `SITE_URL`, `SITE_DOMINIO`, `ZONA_HORARIA`). Puro. |
| `web/src/lib/identidad/` | La identidad del panel: nombre, logo y color (`tipos.ts` puro, `servidor.ts`). |
| `web/src/app/iconos/[archivo]/route.tsx` | Los iconos del panel y de la app, pintados con la marca. |
| `web/src/lib/env.ts` | `requireEnv()` y `appUrl()`. |
| `web/src/components/flow/node-config.tsx` | Metadata de nodos: iconos y resúmenes. |
| `web/src/lib/engine/puertos.ts` | `outputHandles()`: los puertos de salida de cada nodo (puro; lo usan el lienzo y las pruebas). |
| `web/src/lib/engine/plantilla-lanzamiento.ts` | La plantilla «Lanzamiento de un repo» (55 nodos); se carga con `npm run plantilla`. |
| `web/src/app/api/cron/tick/route.ts` | El latido: esperas, timeouts, tokens, seguidores y estadísticas. |

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

## Estadísticas (`/instagram`, `/m/instagram`)

**La pantalla no habla con Meta: lee lo que el cron fue guardando.** Meta no guarda la historia
de seguidores, no da 90 días de golpe y borra los números de las historias a las 24 h, así que
el paso 5 del tick (`recolectarSiToca`) junta todo en `accounts/{id}/estadisticas*`.

- `web/src/lib/estadisticas/`: `tipos.ts`, `calculos.ts` (días en hora del Pacífico como corta
  Meta; `ZONA_LOCAL` para las horas de publicación), `meta.ts` (qué se pide y cómo se lee; una
  métrica que Meta rechaza en un día reciente se veta), `cifras.ts` + `lecturas.ts` (los comparten
  escritorio y celular), `servidor.ts` (el recolector, con candado y presupuesto de tiempo) y
  `cliente.ts` (`useTableroIg`). Todo lo puro tiene pruebas (`scripts/estadisticas-test.ts`).
- Casi todo pide `instagram_business_manage_insights` (ya está en `IG_SCOPES`); sin él solo hay
  perfil, likes y comentarios, y el tablero ofrece reconectar (`/api/ig/connect?volver=/instagram`).
- Decisiones: los periodos de Meta terminan ayer; alcance y cuentas únicas se piden por periodo,
  no se suman por día; «típico» es la mediana; likes y comentarios por día sin permiso salen de
  restar las fotos horarias de cada post (`diario` en `estadisticasPosts`).
- `calculos.ts` y compañía leen `process.env` directo (no `@/lib/marca`): las pruebas los corren
  con Node, sin los alias de la app.

## La app del celular (`/m`) y los avisos push

Guía para programar pantallas: `docs/desarrollo/app-movil.md`. Lo imprescindible:

- Cinco pestañas: Hoy · Bandeja · Automatizar · Contactos · Más (Estadísticas y el asistente
  cuelgan de Más). `raizDe()` en
  `components/movil/ui/tabs.tsx` dice cuál se enciende con cada ruta: **una ruta nueva se apunta
  ahí**, si no la barra se apaga al entrar.
- `app/m/movil.css` redefine **los mismos tokens** de `globals.css` con valores de iOS, así
  `components/ui/*` se ve de iOS ahí sin cambiarlo (ojo: en iOS `--bg` es el gris y `--surface`
  el blanco). El acento no: sale de la marca, igual que en el escritorio. El kit está en `components/movil/ui/`: si dudas, es una `Seccion` con `Fila`s.
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
  /estadisticas*                      el tablero de /instagram — solo servidor
/config/…, /pushSubscriptions, /notificacionesEnviadas   avisos push, latido del cron y la marca — solo servidor
```

Si agregas una colección: su regla en `firestore.rules` (o nada, si es solo del servidor: la
regla final la niega), sus índices en `firestore.indexes.json`, su fila en `docs/datos.md` y una
prueba en `scripts/probar-reglas.sh` si la toca el navegador.

---

## Reglas que no se rompen

**Los IDs de puerto son un contrato.** `outputHandles()` en `lib/engine/puertos.ts` y el `case` en
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
`globals.css`. El acento es la marca de quien lo instala (de fábrica, el naranja `#fa4c03`) y
cambia en Ajustes › Marca. Se escribe `text-accent`, `bg-accent/10`, `border-accent`, nunca
`[#fa4c03]`. **Lo que va encima del acento es `text-accent-fg`, nunca `text-white`**: con una
marca clara, el blanco no se lee. Los colores de estado son rojo (`neg`) y verde (`pos`).

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
- **Una variable de módulo no es la misma en todo el servidor.** Next empaqueta aparte las rutas
  de API y las páginas: si una API tiene que borrar una memoria que leen las páginas, esa memoria
  va en `globalThis` (así lo hace `lib/identidad/servidor.ts`).
- **Con `app/manifest.ts`, Next ignora `manifest` en la metadata** y enlaza el suyo, sin query.
  Para que el celular vea iconos nuevos, el `?v=` va en los iconos de adentro.

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
npm run dev         # servidor local (sin .env.local abre en modo guía)
npm run test        # motor de flujos, matcher, estadísticas y la marca
npm run typecheck   # si faltan tipos de Next: npx next typegen
npm run lint
npm run build

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
3. `web/src/components/flow/node-config.tsx` — entrada en `NODE_META` y resumen en
   `nodeSummary`; sus puertos, en `outputHandles` de `web/src/lib/engine/puertos.ts`.
4. `web/src/components/flow/node-inspector.tsx` — el formulario para editarlo.

`outputHandles` y el `case` del runner tienen que usar los mismos identificadores de puerto.
