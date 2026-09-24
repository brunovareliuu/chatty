# Solución de problemas

Ordenado por dónde se ve el síntoma. Casi todo sale de una URL mal copiada, una variable que
falta o un permiso de Meta.

**Antes que nada:** si el panel te enseña la guía de instalación en vez del login, le falta
alguna de las seis variables de Firebase (la guía dice cuáles). Ya adentro, Ajustes → **Sistema**
dice qué variables faltan y Ajustes → **Instagram** te da las URLs exactas que espera tu
despliegue. Los errores del servidor salen en la consola
de Firebase → App Hosting → tu backend → Registros (o `npm run dev` en local).

## Entrar al panel

| Síntoma | Causa y arreglo |
|---|---|
| El botón de Google dice `auth/unauthorized-domain` | Falta tu dominio en Firebase → Authentication → Configuración → **Dominios autorizados** (sin `https://`). |
| «Esta cuenta no tiene acceso» | Tu correo no está en `ALLOWED_EMAILS`, o la dejaste vacía y alguien más entró primero (el primero queda de dueño). Agrégalo y vuelve a desplegar. |
| Inicio sesión y me regresa al login | El servidor no pudo crear la sesión. En local casi siempre son las credenciales: vuelve a correr `gcloud auth application-default login` (o revisa `FIREBASE_SERVICE_ACCOUNT`). Busca el error en la terminal. |
| `requires a quota project` en local | `gcloud auth application-default set-quota-project TU-PROYECTO`. |
| Funciona en local pero en producción no guarda la sesión | La cookie tiene que llamarse `__session` (App Hosting descarta las demás). No la renombres. |
| Quiero quitarle el acceso a alguien | Sácalo de `ALLOWED_EMAILS`, borra su documento en `users/` y su usuario en Authentication. Solo quitarlo de la lista no basta: quien ya tiene documento en `users/` sigue entrando. |

## Conectar Instagram

| Síntoma | Causa y arreglo |
|---|---|
| «Invalid platform app» o «Invalid client_id» | Usaste el ID de la app **de Meta**. `META_APP_ID` es el **ID de la app de Instagram** ([Meta, paso 3](03-meta-instagram.md#el-id-y-la-clave-secreta)). |
| «Invalid redirect_uri» / «URL bloqueada» | La URL de redireccionamiento en Meta no es **idéntica** a `APP_URL` + `/api/ig/callback`. Copia la de Ajustes → Instagram. |
| «Invalid scope» | Falta agregar uno de los cuatro permisos en la app de Meta. |
| Instagram dice que la cuenta no puede usar la app | En modo desarrollo solo entran cuentas con rol: agrégala como **tester de Instagram** y acepta la invitación. |
| Volví del login y la cuenta dice «Reconectar» | El token no sirvió o expiró. Reconecta; si se repite, revisa `lastError` en la tarjeta de la cuenta. |

## Los DMs y comentarios no llegan

| Síntoma | Causa y arreglo |
|---|---|
| Meta no verifica el webhook | La app no está desplegada todavía, la URL no termina en `/api/webhooks/instagram`, o el token de verificación no es el mismo que `META_WEBHOOK_VERIFY_TOKEN`. |
| El webhook está verificado pero la bandeja no se mueve | 1) En el teléfono: **Permitir el acceso a los mensajes** (Instagram → Mensajes y respuestas a historias → Herramientas conectadas). 2) Los seis campos suscritos en Meta. 3) Reconecta la cuenta para que se vuelva a suscribir. |
| Los registros dicen «firma inválida» | `META_APP_SECRET` no es la **clave secreta de la app de Instagram**. |
| Llegan DMs pero no comentarios | Falta el campo `comments` en los webhooks de Meta, o el permiso `instagram_business_manage_comments`. |
| La automatización de comentario contesta en público pero no manda el DM | El comentario tiene más de 7 días, o esa persona ya recibió su respuesta privada por ese comentario (Meta permite una). |
| Un flujo se queda en «Esperar» para siempre | El cron no corre ([El cron](07-cron.md)). |
| No puedo contestar desde la bandeja: «fuera de la ventana de 24 h» | Regla de Meta: después de 24 h de su último mensaje solo puedes mandar respuestas de persona (etiqueta `HUMAN_AGENT`, hasta 7 días). |
| Mi webhook local dejó de recibir en producción | Meta tiene **un** webhook por app. Si lo apuntaste a tu túnel, regrésalo a la URL de producción. |

## Despliegue

| Síntoma | Causa y arreglo |
|---|---|
| El build falla: no puede leer un secreto | El secreto no existe o el backend no tiene acceso: `firebase apphosting:secrets:grantaccess NOMBRE --backend TU-BACKEND`, y vuelve a desplegar. |
| El build falla por `CLAUDE_API_KEY` | `apphosting.yaml` la pide. Crea el secreto o borra ese bloque del archivo. |
| El build no encuentra `package.json` | El **directorio raíz** del backend tiene que ser `web`. Se cambia en la consola: App Hosting → tu backend → Configuración. |
| Cambié una variable `NEXT_PUBLIC_*` y no se nota | Se incrustan al construir: vuelve a desplegar. |
| `The query requires an index` en los registros | No desplegaste los índices: `firebase deploy --only firestore`. Si es uno nuevo, el error trae un enlace que lo crea; agrégalo también a `firestore.indexes.json`. |
| `PERMISSION_DENIED` desde el navegador | Las reglas no están desplegadas (`firebase deploy --only firestore`) o tu cuenta no está dada de alta en `users/` (entra por el login del panel, no solo con Firebase). |

## Asistente y avisos

| Síntoma | Causa y arreglo |
|---|---|
| El asistente dice que falta la llave | `CLAUDE_API_KEY` no está en el entorno. |
| Claude responde 400 pidiendo `anthropic-workspace-id` | Tu llave no es de un workspace: pon `CLAUDE_WORKSPACE_ID` o crea la llave dentro de uno. |
| Los avisos no llegan al iPhone | Solo funcionan con el panel instalado en la pantalla de inicio (iOS 16.4+), y el permiso se pide con un toque. Si lo negaste, se arregla en Ajustes del iPhone → Notificaciones. |
