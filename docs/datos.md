# El modelo de datos

Todo vive en **Firestore** (base `(default)`) de tu proyecto. Esta es la referencia de cada
colección: qué guarda, quién la escribe y quién la puede leer. Los campos exactos están en los
tipos de TypeScript que se indican: son la fuente de verdad.

Las reglas que hacen cumplir esto están en `firestore.rules`
([cómo se despliegan](02-firebase.md#7-despliega-las-reglas-y-los-índices)) y
`scripts/probar-reglas.sh` las prueba contra el emulador.

**Quién escribe:**

- **Servidor** — rutas de Next con el Admin SDK. Se salta las reglas; es el único que toca
  tokens, mensajes y todo lo que implica hablar con Meta.
- **Panel** — el navegador de alguien con sesión cuyo documento existe en `users/`.

## Personas del panel

| Ruta | Qué es | Escribe | Lee | Tipo |
|---|---|---|---|---|
| `users/{uid}` | Quién puede entrar: correo, nombre, foto, `role` (`owner` el primero, `agent` los demás) | Servidor, al iniciar sesión | Panel | `AppUser` en `web/src/lib/types.ts` |

## Instagram

Todo cuelga de la cuenta conectada. El id del documento es el id de Instagram de la cuenta.

```
accounts/{igUserId}                  la cuenta: usuario, foto, seguidores, vencimiento del token, permisos
  private/credentials                el token de Meta, cifrado con TOKEN_ENCRYPTION_KEY
  contacts/{igsid}                   cada persona que te escribió o comentó: etiquetas, notas, datos capturados
  conversations/{igsid}              el hilo: ventana de 24 h, no leídos, bot pausado o no
    messages/{mid}                   cada mensaje, entrante o saliente, con su estado
  automations/{id}                   disparador → flujo (palabras, publicaciones, prioridad, frecuencia)
  flows/{id}                         el flujo: nodos y conexiones del constructor
  runs/{id}                          una ejecución en curso de un flujo (dónde va, qué espera)
  tags/{id}                          etiquetas con su color
  assistantChats/{id}/messages/{n}   conversaciones con el asistente
```

| Parte | Escribe | Lee | Tipo |
|---|---|---|---|
| La cuenta | Servidor (conectar, renovar token, seguidores) | Panel | `IgAccount` en `lib/types.ts` |
| `private/**` | Servidor | **Nadie** desde el navegador | — |
| `contacts` | Servidor; el panel solo edita `tags`, `notes`, `fields`, `subscribed` | Panel | `Contact` |
| `conversations` | Servidor; el panel solo edita `status`, `assignedTo`, `tags`, `unreadCount` | Panel | `Conversation` |
| `messages` | Servidor (mandar implica llamar a Meta) | Panel | `Message` |
| `automations`, `flows`, `tags` | Panel (se editan en vivo) y el asistente | Panel | `Automation`, `Flow`, `Tag` |
| `runs` | Servidor (el motor) | Panel, para depurar | `FlowRun` |
| `assistantChats` | Servidor | Solo el servidor (el panel lo pide por `/api/asistente/chats`) | `lib/asistente/historial.ts` |

Un contacto que llega por un anuncio de Meta (Click to DM) queda marcado con el campo `anuncio`
y la etiqueta `anuncio`, así un flujo puede tratarlo distinto.

## Solo del servidor

| Ruta | Qué guarda |
|---|---|
| `config/notificaciones` | De qué te avisa el celular (Ajustes › Notificaciones) |
| `config/notificacionesEstado` | Contadores y las marcas redondas ya avisadas |
| `config/push/private/claves` | El par de llaves VAPID de Web Push (la privada, cifrada) |
| `pushSubscriptions/{sha256(endpoint)}` | Los dispositivos suscritos a avisos |
| `notificacionesEnviadas` | El historial de avisos (se poda a 200) |

La regla final de `firestore.rules` niega todo lo que no está nombrado arriba, así que ningún
navegador lee estas colecciones: el panel las pide por sus rutas de API.

## Si agregas una colección

Su regla en `firestore.rules` (o nada, si es solo del servidor), sus índices en
`firestore.indexes.json`, su fila aquí y, si la toca el navegador, una prueba en
`scripts/probar-reglas.sh`.
