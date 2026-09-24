# 6 · Desplegar en Firebase App Hosting

App Hosting construye la app de Next desde tu repositorio de GitHub y la sirve en Cloud Run.
Un `git push` a tu rama principal despliega solo. No hay `functions/` aparte: el motor de
Instagram, el cron y el asistente viven en la misma app.

## 1. Tu copia en GitHub

Haz fork de este repo o súbelo a un repositorio tuyo (puede ser privado). App Hosting lo lee
desde ahí.

## 2. Llena `web/apphosting.yaml`

Cambia cada `REEMPLAZA` ([de dónde sale cada valor](04-variables-de-entorno.md)). Hay una que
todavía no conoces, `APP_URL`, pero se puede adivinar: App Hosting le da a cada backend esta
dirección:

```
https://ID-DEL-BACKEND--ID-DEL-PROYECTO.REGION.hosted.app
```

Si tu backend se va a llamar `chatty`, tu proyecto es `mi-chatty` y lo pones en `us-central1`,
queda `https://chatty--mi-chatty.us-central1.hosted.app`. Si vas a usar dominio propio, pon
el dominio (lo conectas en el paso 7).

Haz commit y push.

## 3. Crea los secretos

Desde la raíz del repo, con tu proyecto elegido (`firebase use`):

```bash
firebase apphosting:secrets:set META_APP_SECRET
firebase apphosting:secrets:set META_WEBHOOK_VERIFY_TOKEN
firebase apphosting:secrets:set TOKEN_ENCRYPTION_KEY
firebase apphosting:secrets:set CRON_SECRET
firebase apphosting:secrets:set CLAUDE_API_KEY          # si usas el asistente
```

`TOKEN_ENCRYPTION_KEY` y `CRON_SECRET` los generas con `openssl rand -hex 32`. Si en local ya
tienes valores, usa **los mismos**: un token de Meta cifrado con una llave solo se descifra con
esa llave.

Si todavía no existe el backend, el comando no tiene a quién darle acceso: no pasa nada, se
lo das en el paso 5.

## 4. Crea el backend

```bash
firebase apphosting:backends:create
```

Te pregunta, en este orden más o menos:

| Pregunta | Respuesta |
|---|---|
| Región | `us-central1` (o la que prefieras; tiene que coincidir con tu `APP_URL`) |
| Repositorio | Conecta GitHub (la primera vez abre el navegador) y elige tu copia |
| **Directorio raíz** | **`web`** — la app no está en la raíz del repo |
| Rama | `main` (la que despliega sola con cada push) |
| ID del backend | `chatty` (o el que pusiste en `APP_URL`) |

También se puede desde la consola: **Compilación → App Hosting → Comenzar**, con las mismas
respuestas.

Al terminar arranca el primer despliegue. Tarda unos 5 a 10 minutos.

## 5. Dale acceso a los secretos

Si creaste los secretos antes que el backend (o el primer despliegue falló diciendo que no
puede leer un secreto):

```bash
for s in META_APP_SECRET META_WEBHOOK_VERIFY_TOKEN TOKEN_ENCRYPTION_KEY CRON_SECRET CLAUDE_API_KEY; do
  firebase apphosting:secrets:grantaccess $s --backend chatty
done

# y vuelve a desplegar
firebase apphosting:rollouts:create chatty --git-branch main
```

La cuenta de servicio del backend (`firebase-app-hosting-compute@TU-PROYECTO.iam.gserviceaccount.com`)
ya trae los permisos del Admin SDK sobre Firestore y Authentication. No hay que tocar IAM.

## 6. Termina de conectar todo con la URL

Con la app respondiendo en tu `APP_URL`:

1. **Firebase → Authentication → Configuración → Dominios autorizados** → agrega el dominio
   (`chatty--mi-chatty.us-central1.hosted.app`, sin `https://`). Sin esto, entrar con Google
   falla.
2. **Meta → tu app → Instagram → Configuración de la API con inicio de sesión de Instagram**
   ([tutorial](03-meta-instagram.md#3-configura-la-api-con-inicio-de-sesión-de-instagram)):
   - URL de redireccionamiento: `https://TU-URL/api/ig/callback`
   - Webhook: `https://TU-URL/api/webhooks/instagram` con tu token de verificación →
     **Verificar y guardar** → suscríbete a los seis campos.
3. Abre `https://TU-URL`, inicia sesión y sigue con [el cron](07-cron.md) y el
   [primer uso](08-primer-uso.md).

## 7. Dominio propio (opcional)

Consola → App Hosting → tu backend → **Configuración → Dominios** → **Agregar dominio
personalizado**. Te da registros DNS (un `A` y un `TXT`, a veces un `CNAME` para el
certificado) que pones en tu proveedor de DNS. Si usas Cloudflare, déjalos en **solo DNS**
(nube gris), no con proxy.

Cuando el dominio responda:

- Cambia `APP_URL` en `apphosting.yaml` y haz push.
- Agrega el dominio en Authentication → Dominios autorizados.
- En Meta, cambia la URL de redireccionamiento y la del webhook (y vuelve a verificarlo).
- Si ya tenías el cron, recréalo con la URL nueva.

## Día a día

- **Desplegar un cambio:** `git push` a `main`. App Hosting construye y cambia el tráfico a
  la versión nueva cuando termina.
- **Forzar un despliegue:** `firebase apphosting:rollouts:create chatty --git-branch main`.
- **Ver qué pasó:** consola → App Hosting → tu backend → pestañas de despliegues y registros.
  Los registros del servidor (errores de Meta, del cron, de la IA) están ahí mismo o en
  Google Cloud → Cloud Run → el servicio del backend → Registros.
- **Reglas e índices:** App Hosting no los toca. Si los cambias, `firebase deploy --only firestore`.
- **Cambiar un secreto:** `firebase apphosting:secrets:set NOMBRE` y vuelve a desplegar.

## Cuánto cuesta

Con `minInstances: 0` (así viene en `apphosting.yaml`), el servidor se apaga cuando nadie lo
usa y arranca en un par de segundos con la siguiente visita o webhook. El cron lo despierta
cada minuto, así que en la práctica casi siempre está tibio. Para una persona o un equipo chico,
la cuenta suele ser de centavos al mes; lo que más podría costar es el asistente (Claude), que
se paga aparte y solo si lo usas.

Sigue con [El cron](07-cron.md).
