# 8 · Primer uso: de cero a tu primer DM automático

Con la app desplegada y el cron corriendo, esto es lo que haces la primera vez. Al final,
alguien comenta una palabra en tu post y le llega un DM con un enlace.

## 1. Entra

Abre tu `APP_URL` e inicia sesión con Google o con el usuario de correo que creaste. La primera
cuenta que entra queda como **dueña**.

Si ves «Esta cuenta no tiene acceso», tu correo no está en `ALLOWED_EMAILS`. Si el botón de
Google falla con `auth/unauthorized-domain`, falta agregar el dominio en Firebase →
Authentication → Dominios autorizados.

## 2. Revisa que no falte nada

**Ajustes → Sistema** dice qué variables tiene el servidor y cuáles faltan, y enlaza la guía de
instalación. Todo en verde antes de seguir.

**Ajustes → Instagram → Datos para el panel de Meta** te da, listas para copiar, la URL del
webhook y la de redireccionamiento **exactas** que espera tu despliegue. Compáralas con las que
pusiste en Meta: un slash de más o un `http` en vez de `https` basta para que nada funcione.

## 3. Conecta Instagram

**Ajustes → Instagram → Conectar**. Te manda a Instagram, entras con tu cuenta profesional
(la que agregaste como tester), aceptas los permisos y vuelves al panel con la cuenta activa.

Detrás de ese botón pasan tres cosas: Chatty cambia el código por un token de larga duración
(60 días), lo guarda **cifrado** en Firestore y suscribe la cuenta a los webhooks. Desde ese
momento, cada DM y cada comentario llega a la **Bandeja**.

Pruébalo: desde otra cuenta de Instagram, mándate un DM. Debe aparecer en la Bandeja en
segundos, y puedes contestar desde ahí.

## 4. Tu primera automatización: «comenta GUÍA y te mando el link»

1. **Automatizaciones → Nueva**.
2. Disparador: **Alguien comenta una palabra clave en una publicación**.
3. Palabras clave: `GUÍA` (con y sin acento, si quieres: `guia, guía`).
4. Publicaciones: elige el post. Si no eliges ninguna, aplica a **todas**.
5. Respuesta pública (opcional): lo que contesta en el comentario, por ejemplo «¡Te lo mandé
   por DM!». Puedes poner varias y sale una al azar, para que no se vea robótico.
6. Se crea con un flujo de arranque. Ábrelo en el constructor y edita el primer mensaje: el
   texto y el enlace de tu guía.
7. Actívala.

Pruébalo desde otra cuenta: comenta `guía` en ese post. Llega la respuesta pública y el DM.

Lo que conviene saber de este caso (son reglas de Meta, no de Chatty):

- La respuesta a un comentario es **un solo DM privado, solo de texto**. Si tu flujo tiene
  botones, en ese primer mensaje salen como texto («Responde "Ya te sigo"»), y lo que sigue del
  flujo espera a que la persona conteste. Escribir el texto de un botón cuenta como tocarlo.
- Solo se puede contestar un comentario dentro de los 7 días siguientes.

Otros disparadores: palabra clave por DM, respuesta a una historia, primer mensaje y respuesta
por defecto. Cómo armar flujos con preguntas, esperas, condiciones y etiquetas:
[bandeja y automatizaciones](modulos/bandeja-y-automatizaciones.md).

## 5. El celular

Abre tu `APP_URL` en el teléfono: te lleva a la app de celular (`/m`). En iPhone,
**Compartir → Agregar a inicio** para instalarla; los avisos push solo funcionan así (iOS 16.4
o más nuevo). Después, en **Ajustes → Notificaciones**, activa los avisos en ese dispositivo y
manda una prueba. Detalle: [app del celular y avisos](modulos/app-movil-y-avisos.md).

## 6. El asistente (opcional)

Con `CLAUDE_API_KEY` configurada, en **Asistente** le pides en español lo que quieres —«cuando
comenten GUÍA en mi último post, mándales este link, solo si me siguen»— y lo crea de verdad.
Detalle: [asistente](modulos/asistente.md).

Si algo no funciona: [solución de problemas](solucion-de-problemas.md).
