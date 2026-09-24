# Bandeja, automatizaciones y flujos

El corazón de Chatty: todos tus DMs en una pantalla y las respuestas automáticas que armas
con palabras clave y un constructor visual. Es lo que hace ManyChat, en tu propio Firebase.

## Cómo viaja un mensaje

```
Instagram ──webhook──▶ /api/webhooks/instagram ──▶ Firestore
                                │                      │
                                ▼                      ▼
                       motor de flujos           Bandeja en vivo
                                │             (el navegador escucha)
                                ▼
                       API de Instagram
```

1. Alguien te escribe, comenta o responde una historia. Meta avisa a tu webhook.
2. Chatty valida la firma (`X-Hub-Signature-256`), contesta rápido y guarda el mensaje.
3. Busca una automatización que coincida. Si hay, arranca su flujo.
4. La Bandeja se actualiza sola en tu navegador.

## Bandeja (`/inbox`)

- Todas las conversaciones de la cuenta, con no leídos y la última actividad.
- Contestas desde ahí: texto, y lo que Meta permita según la ventana de 24 horas.
- **Pausar el bot** en una conversación para atenderla tú: las automatizaciones dejan de
  contestarle a esa persona hasta que la reactives. El nodo «Pasar a humano» hace lo mismo
  desde un flujo.
- Estados: abierta o cerrada; asignada a alguien del equipo; etiquetas.

## Contactos (`/contacts`)

Cada persona que te escribió o comentó: usuario, foto, si te sigue (cuando Meta deja saberlo),
etiquetas, notas y los datos que capturaste con «Preguntar y guardar». Desde el panel solo se
editan etiquetas, notas y datos; lo demás lo mantiene el motor.

## Automatizaciones (`/automations`)

Una automatización es **un disparador y un flujo**.

| Disparador | Cuándo salta |
|---|---|
| Palabra clave en DM | Alguien te escribe una palabra |
| Comentario en publicación | Alguien comenta una palabra en uno o varios posts (o en todos) |
| Respuesta a historia | Alguien contesta una de tus historias |
| Primer mensaje | Alguien te escribe por primera vez |
| Respuesta por defecto | Nada más coincidió |

Cómo se compara el texto: **contiene la palabra**, **es exactamente**, **empieza con**,
**expresión regular** o **cualquier mensaje**. Sin distinguir mayúsculas; puedes poner varias
palabras separadas por coma (`precio, costo, cuánto`).

Más opciones:

- **Prioridad**: si dos automatizaciones coinciden, gana la de número más bajo (la que va más arriba en la lista).
- **Frecuencia**: siempre, o máximo una vez por hora, día o semana por persona.
- **Respuestas públicas** (en comentarios): una o varias; sale una al azar.
- **Avisarme** (la campana): te llega un push cada vez que se dispara.
- **Clonar** una automatización para hacer otra parecida.

Una automatización de comentario **sin palabras clave y sin publicaciones** se rechaza: le
contestaría a todos los comentarios de tu cuenta.

## El constructor de flujos (`/flows/…`)

Arrastras nodos y los conectas. Cada automatización nace con un flujo de arranque que ya
funciona; lo editas desde ahí.

| Nodo | Qué hace |
|---|---|
| **Enviar mensaje** | Texto (hasta 1000 bytes) |
| **Enviar botones** | Texto con hasta 3 botones; cada botón es una salida del nodo |
| **Respuestas rápidas** | Hasta 13 opciones que aparecen sobre el teclado |
| **Enviar enlace** | Un botón que abre una URL |
| **Enviar archivo** | Imagen, video o audio |
| **Preguntar y guardar** | Hace una pregunta, guarda la respuesta en un dato del contacto y sale por «contestó» o «sin respuesta» (con tiempo límite) |
| **Pedir que te siga** | Revisa si la persona te sigue; si no, se lo pide y espera |
| **Esperar** | Pausa el flujo minutos, horas o días (lo despierta el cron) |
| **Condición** | Divide el camino según lo que escribió, sus etiquetas, sus datos o si te sigue |
| **Poner / quitar etiqueta** | Organiza a tus contactos |
| **Guardar dato** | Escribe un valor en los datos del contacto |
| **Pasar a humano** | Pausa el bot en esa conversación y te avisa |
| **Llamar a una API** | Un `fetch` a tu propio servicio (un CRM, una hoja, un webhook de Zapier/Make) con los datos del contacto. Bloquea direcciones internas para que un flujo no pueda leer las credenciales del servidor |
| **Fin** | Termina el flujo |

En los textos puedes usar variables: `{{first_name}}`, `{{full_name}}`, `{{username}}`,
cualquier dato guardado del contacto (`{{email}}`, `{{ciudad}}`…) y las del disparador
(`{{comment_text}}` en comentarios).

Los flujos dormidos (Esperar, preguntas con tiempo) dependen del [cron](../07-cron.md).

## Las reglas de Meta que cambian cómo armas un flujo

- **Comentario → DM:** el primer mensaje es la «respuesta privada» al comentario: **una sola,
  solo texto**, dentro de 7 días. Si ese primer nodo lleva botones, se mandan como texto
  («Responde "Ya te sigo"») y escribir ese texto cuenta como tocar el botón. Todo lo que sigue
  espera a que la persona conteste, porque hasta entonces no hay conversación abierta.
- **Ventana de 24 horas:** fuera de ella el motor no manda nada. Tú sí puedes contestar desde la
  Bandeja hasta 7 días (etiqueta `HUMAN_AGENT`).
- **«Pedir que te siga»:** Meta solo dice si alguien te sigue después de que te escribió o tocó
  un botón. Si no deja comprobarlo, el nodo deja pasar.

## Ideas que funcionan

- *Comenta GUÍA y te la mando*: comentario con palabra → respuesta pública → DM con enlace.
- *Solo para seguidores*: comentario → «Pedir que te siga» → enlace.
- *Captura de leads*: DM «PRECIO» → «Preguntar y guardar» el correo → «Llamar a una API» a tu
  CRM → etiqueta `lead`.
- *Fuera de horario*: respuesta por defecto → mensaje con tu horario → «Pasar a humano».

## Para programadores

- El modelo completo está en `web/src/lib/types.ts`. Empieza ahí.
- `web/src/lib/webhook-handler.ts` traduce los eventos de Meta y elige la automatización;
  `web/src/lib/engine/runner.ts` ejecuta los nodos; `matcher.ts` compara palabras.
- Cómo agregar un tipo de nodo: [CLAUDE.md](../../CLAUDE.md#cómo-agregar-un-tipo-de-nodo).
- `npm run test` corre las pruebas del motor y del matcher.
