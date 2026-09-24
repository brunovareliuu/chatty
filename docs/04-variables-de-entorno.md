# 4 · Variables de entorno

Chatty no trae nada configurado: todo lo que depende de tu proyecto sale de variables de
entorno. Van en dos lugares, con los **mismos nombres**:

| Dónde | Para qué | Archivo |
|---|---|---|
| Tu máquina | `npm run dev` | `web/.env.local` (cópialo de `web/.env.example`; está en `.gitignore`) |
| Producción | App Hosting | `web/apphosting.yaml` (valores normales) + **Secret Manager** (secretos) |

Las que empiezan con `NEXT_PUBLIC_` llegan al navegador: nunca pongas un secreto en una de
esas. Next las incrusta **al construir**, por eso en `apphosting.yaml` llevan
`availability: [BUILD, RUNTIME]`.

Mientras falte alguna de las seis de Firebase, el panel no enseña el login: se abre en *modo
guía*, y cada paso de **Primeros pasos** marca qué variables ya tiene y cuáles no (nunca su
valor).

## Obligatorias

### Firebase (públicas)

Salen de Configuración del proyecto → Tus apps → Web ([Firebase, paso 5](02-firebase.md#5-registra-la-app-web)).

| Variable | Ejemplo |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIza…` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `mi-chatty.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `mi-chatty` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `mi-chatty.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `123456789012` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:123456789012:web:abc123…` |

### El panel

| Variable | Qué es |
|---|---|
| `APP_URL` | La URL pública del panel, **sin slash final**. Tiene que ser idéntica a la que registras en Meta (redirect y webhook). En local, `http://localhost:3000` o la URL de tu túnel. |
| `ALLOWED_EMAILS` | Correos que pueden entrar, separados por coma: `yo@mimarca.com,socia@mimarca.com`. Si la dejas vacía, **el primero que inicie sesión queda como dueño** y nadie más entra. |

### Meta ([tutorial](03-meta-instagram.md))

| Variable | Qué es | ¿Secreto? |
|---|---|---|
| `META_APP_ID` | El **ID de la app de Instagram** (no el de Meta) | No |
| `META_APP_SECRET` | La **clave secreta de la app de Instagram** | **Sí** |
| `META_WEBHOOK_VERIFY_TOKEN` | La cadena que inventaste para verificar el webhook | **Sí** |

### Llaves propias

Genera cada una con `openssl rand -hex 32`:

| Variable | Qué hace | ¿Secreto? |
|---|---|---|
| `TOKEN_ENCRYPTION_KEY` | Cifra (AES-256-GCM) los tokens de Instagram antes de guardarlos en Firestore, y la llave privada de los avisos push. **Si la cambias, tienes que volver a conectar Instagram**: lo guardado ya no se descifra. | **Sí** |
| `CRON_SECRET` | La contraseña del latido de cada minuto ([el cron](07-cron.md)). Sin ella, `/api/cron/tick` no corre. | **Sí** |

## Opcionales

| Variable | Qué es | ¿Secreto? |
|---|---|---|
| `CLAUDE_API_KEY` | Prende el asistente. De [console.anthropic.com](https://console.anthropic.com) → API Keys. | **Sí** |
| `CLAUDE_WORKSPACE_ID` | Solo si tu llave no pertenece a un workspace y la API responde 400 pidiendo `anthropic-workspace-id`. Es el id `wrkspc_…` de la consola. | No |
| `NEXT_PUBLIC_BRAND_NAME` | Cómo te llamas en público: firma la política de privacidad y el asistente lo usa. Si no la pones, dice «Tu marca». | No |
| `NEXT_PUBLIC_SITE_URL` | Tu sitio, sin slash final (`https://mimarca.com`). El asistente lo menciona en los DMs que arma y la política de privacidad lo enlaza. Déjala vacía si no tienes sitio. | No |
| `NEXT_PUBLIC_TIMEZONE` | Tu zona horaria, en nombre IANA (`America/Bogota`, `Europe/Madrid`). Es la fecha que ve el asistente. Por defecto, `America/Mexico_City`. | No |

## Solo en local

| Variable | Qué es |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | El JSON de una cuenta de servicio **en una sola línea**. Alternativa a `gcloud auth application-default login` ([Correr en local](05-correr-en-local.md)). En producción no se usa. |
| `DEV_TUNNEL_HOST` | El dominio de tu túnel sin `https://` (por ejemplo `abc123.ngrok-free.app`). Next bloquea en desarrollo las peticiones que llegan de otro origen; esto las deja pasar. |

## Los secretos en producción

En App Hosting, los secretos **no** se escriben en `apphosting.yaml`: el archivo solo los
nombra (`secret: META_APP_SECRET`) y el valor vive en Secret Manager. Se crean así, uno por uno:

```bash
firebase apphosting:secrets:set META_APP_SECRET
firebase apphosting:secrets:set META_WEBHOOK_VERIFY_TOKEN
firebase apphosting:secrets:set TOKEN_ENCRYPTION_KEY
firebase apphosting:secrets:set CRON_SECRET
firebase apphosting:secrets:set CLAUDE_API_KEY     # si usas el asistente
```

Cada comando te pide el valor y te ofrece darle acceso a tu backend; di que sí. Si lo creaste
antes que el backend, dale acceso después con:

```bash
firebase apphosting:secrets:grantaccess NOMBRE --backend TU-BACKEND
```

Si `apphosting.yaml` nombra un secreto que no existe, **el despliegue falla**. ¿No vas a usar
el asistente? Borra el bloque de `CLAUDE_API_KEY` en vez de crear el secreto.

Sigue con [Correr en local](05-correr-en-local.md).
