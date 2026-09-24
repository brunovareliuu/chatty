# 3 · Meta e Instagram

Chatty habla con Instagram por la **API de Instagram con inicio de sesión de Instagram**. No
necesitas página de Facebook. Aquí preparas la cuenta, creas la app de Meta y juntas los tres valores que van en las
variables: `META_APP_ID`, `META_APP_SECRET` y `META_WEBHOOK_VERIFY_TOKEN`.

> Meta cambia de lugar los botones de su panel cada tanto. Si algo no está donde dice aquí,
> busca el nombre del paso: los conceptos no cambian.

## 1. La cuenta de Instagram

En la app de Instagram, en el teléfono:

1. **Cuenta profesional.** Configuración y privacidad → Tipo de cuenta y herramientas →
   Cambiar a cuenta profesional (Empresa o Creador). Las cuentas personales no tienen API.
2. **Acceso a los mensajes.** Configuración y privacidad → Mensajes y respuestas a historias →
   Herramientas conectadas → activa **Permitir el acceso a los mensajes**. Sin esto la API no
   recibe ningún DM y no hay error que te avise.

## 2. Crea la app de Meta

En [developers.facebook.com/apps](https://developers.facebook.com/apps):

1. **Crear app** → nombre (por ejemplo «Chatty de Mi Marca») → correo de contacto.
2. Caso de uso: **Administrar mensajes y contenido en Instagram**.
3. Si te pregunta por un portafolio comercial, puedes elegir el tuyo o seguir sin él.

## 3. Configura la API con inicio de sesión de Instagram

Dentro de la app: **Casos de uso** → Instagram → **Personalizar** →
**Configuración de la API con inicio de sesión de Instagram**. Ahí hay varios pasos:

### Permisos

Agrega estos cuatro (Chatty los pide al conectar la cuenta; están en `IG_SCOPES` de
`web/src/lib/instagram.ts`):

| Permiso | Para qué |
|---|---|
| `instagram_business_basic` | Perfil, publicaciones, seguidores |
| `instagram_business_manage_messages` | Leer y mandar DMs |
| `instagram_business_manage_comments` | Leer comentarios, contestarlos y mandar la respuesta privada |
| `instagram_business_manage_insights` | Alcance, vistas y audiencia del tablero de [estadísticas](modulos/estadisticas-instagram.md) |

### El ID y la clave secreta

En la sección de **inicio de sesión para empresas** aparecen el **ID de la app de Instagram**
y la **clave secreta de la app de Instagram**.

> **Ojo, la trampa más común:** son distintos del «ID de la app» de Meta que ves arriba, en
> Configuración básica. Chatty necesita los **de Instagram**: el inicio de sesión va a
> `instagram.com/oauth/authorize` y Meta firma los webhooks con esa clave. Si usas los de Meta,
> conectar Instagram falla con «Invalid platform app» y los webhooks se descartan por firma.

- ID de la app de Instagram → `META_APP_ID`
- Clave secreta de la app de Instagram → `META_APP_SECRET` (es secreto: va en Secret Manager)

### URL de redireccionamiento

En **Configurar el inicio de sesión para empresas de Instagram** → URL de redireccionamiento
de OAuth, pon:

```
https://TU-URL/api/ig/callback
```

`TU-URL` es tu `APP_URL`: la de App Hosting (`https://…hosted.app`) o tu dominio. Tiene que
coincidir **exacto**, sin slash final. Si pruebas en local con un túnel, agrega también la URL
del túnel.

### Webhooks

En **Configurar webhooks**:

1. **URL de devolución de llamada:** `https://TU-URL/api/webhooks/instagram`
2. **Token de verificación:** inventa una cadena larga (por ejemplo `openssl rand -hex 16`).
   Es tu `META_WEBHOOK_VERIFY_TOKEN`.
3. **Verificar y guardar.** Meta llama a esa URL en ese momento, así que **la app ya tiene que
   estar desplegada** con ese mismo token. Si todavía no despliegas, deja este paso para el
   final del [tutorial de despliegue](06-desplegar.md).
4. Suscríbete a estos campos:

   `messages` · `messaging_postbacks` · `messaging_seen` · `message_reactions` ·
   `messaging_referral` · `comments`

Además de esto, cuando conectas una cuenta desde el panel, Chatty la suscribe sola a esos
mismos campos (`subscribed_apps`).

## 4. Tu cuenta como tester

Mientras la app esté en **modo desarrollo**, solo funciona con cuentas que tengan un rol en
ella. Agrega la tuya:

1. En la app: **Roles de la app** → **Roles** → Agregar personas → **Tester de Instagram** →
   tu usuario de Instagram.
2. Acepta la invitación: en Instagram, Configuración → Apps y sitios web → Invitaciones de
   testers (o en [instagram.com/accounts/manage_access](https://www.instagram.com/accounts/manage_access/)).

Con eso puedes conectar tu cuenta y todo funciona **sin revisión de Meta**.

## 5. ¿Y si otras cuentas van a usar tu copia?

Si solo conectas tus propias cuentas, sáltate esto.

Para que negocios que no tienen rol en tu app conecten su Instagram, Meta pide:

- **Verificación del negocio** en tu portafolio comercial.
- **Revisión de la app** con acceso avanzado para cada permiso: un video del flujo completo
  (conectar, recibir un DM, contestar) y la explicación de para qué usas cada permiso.
- Una **política de privacidad** pública, y cómo pedir que se borren los datos. El panel trae
  las dos cosas en `https://TU-URL/privacidad`: antes de mandarla, cambia en
  `web/src/app/privacidad/page.tsx` el correo de contacto (`CORREO_PRIVACIDAD`) y la fecha, y
  revisa que describa lo que de verdad haces con los datos.
- Pasar la app a **modo en vivo**.

## Límites que impone Meta (no son bugs)

- **Ventana de 24 horas.** Solo puedes escribirle libremente a alguien durante las 24 h
  posteriores a *su* último mensaje. Después, Chatty usa la etiqueta `HUMAN_AGENT` (hasta 7
  días), y solo para respuestas escritas por una persona: el motor nunca la usa.
- **Un DM privado por comentario**, dentro de los 7 días siguientes, y **solo de texto**. Lo
  que sigue del flujo espera a que la persona conteste; los botones de ese primer mensaje se
  mandan como texto («Responde "Ya te sigo"»).
- **Saber si alguien te sigue** solo funciona después de que la persona te escribió o tocó un
  botón.
- **1000 bytes** por mensaje de texto, **3 botones**, **13 respuestas rápidas**.
- Los tokens duran **60 días**. Chatty los renueva solo mientras [el cron](07-cron.md) corra.

## Listo si…

- [ ] Tu Instagram es profesional y permite el acceso a los mensajes.
- [ ] La app tiene los cuatro permisos.
- [ ] Tienes el **ID** y la **clave secreta de la app de Instagram**.
- [ ] Inventaste el token de verificación del webhook.
- [ ] Tu cuenta es tester y aceptaste la invitación.

La URL de redireccionamiento y el webhook se terminan cuando tengas la URL pública
([Desplegar](06-desplegar.md)). Sigue con [Variables de entorno](04-variables-de-entorno.md).
