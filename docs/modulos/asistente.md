# Asistente

Un chat con Claude (`/asistente`) que trabaja **para ti** dentro del panel: le pides en
español lo que quieres y lo crea de verdad en tu cuenta.

> «Cuando comenten GUÍA en mi último post, mándales este link, solo si me siguen.»
>
> «Si alguien escribe PRECIO por DM, mándale mis precios y pregúntale su correo.»
>
> «Escríbeme 4 respuestas públicas distintas para cuando comenten INFO.»

## Qué puede hacer

| Herramienta | Qué hace |
|---|---|
| Ver publicaciones | Lee tus posts para saber a cuál te refieres («el último», «el del reel de ayer») |
| Ver automatizaciones | Revisa lo que ya tienes para no duplicar |
| Crear automatización | Disparador + flujo completo, **activa en cuanto se crea** |
| Editar automatización | Cambia palabras, mensajes, publicaciones o la apaga |

Todo lo que Claude pide se **valida en el servidor** antes de escribir en Firestore. Por
ejemplo, una automatización de comentarios sin palabras clave ni publicaciones se rechaza,
porque contestaría todos los comentarios de tu cuenta.

Lo que **no** hace, a propósito: contestarle a tus seguidores con IA. El motor de flujos nunca
llama a Claude; el asistente solo te ayuda a ti a armar cosas.

## Configurarlo

1. Crea una llave en [console.anthropic.com](https://console.anthropic.com) → **API Keys**.
2. Ponla en `CLAUDE_API_KEY`: en `.env.local` para local y como secreto en producción
   (`firebase apphosting:secrets:set CLAUDE_API_KEY`, y que `apphosting.yaml` la nombre).
3. Si Claude responde 400 pidiendo `anthropic-workspace-id`, tu llave no pertenece a un
   workspace: crea la llave dentro de uno, o pon su id (`wrkspc_…`) en `CLAUDE_WORKSPACE_ID`.

Sin ella, todo lo demás funciona igual y la pantalla del asistente te dice qué falta.

## Costo y modelo

Se cobra por uso en tu cuenta de Anthropic. El modelo es `claude-sonnet-5`, con pensamiento
adaptativo y caché de las instrucciones (lo fijo del prompt no se vuelve a cobrar completo en
cada mensaje). Se cambia en `CLAUDE_MODEL`, en `web/src/lib/asistente/claude.ts`.

## Dónde vive

| Archivo | Qué hace |
|---|---|
| `web/src/app/api/asistente/route.ts` | Un mensaje: bucle de herramientas, streaming y guardado |
| `web/src/lib/asistente/herramientas.ts` | Las herramientas, sus esquemas y la validación de lo que pide Claude |
| `web/src/lib/asistente/instrucciones.ts` | Las instrucciones de sistema (tu marca sale de `NEXT_PUBLIC_BRAND_NAME` y tu sitio de `NEXT_PUBLIC_SITE_URL`) |
| `web/src/lib/asistente/historial.ts` | Las conversaciones en Firestore (`accounts/{id}/assistantChats`, solo servidor) |
| `web/src/lib/asistente/claude.ts` | El cliente, el modelo y los errores legibles. **Es el único lugar que lee la llave** |
