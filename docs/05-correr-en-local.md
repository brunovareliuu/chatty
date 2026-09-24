# 5 · Correr en local

Para ver el panel en tu máquina y hacer cambios. La app vive en `web/`.

## 1. Instala y configura

```bash
cd web
npm install
cp .env.example .env.local
```

Llena `.env.local` con lo que juntaste en los pasos anteriores
([qué va en cada variable](04-variables-de-entorno.md)). Si todavía no tienes nada, no pasa
nada: `npm run dev` abre igual y te enseña la guía de instalación con lo que falta. Para empezar basta con Firebase,
`APP_URL=http://localhost:3000`, tu correo en `ALLOWED_EMAILS` y las dos llaves propias
(`openssl rand -hex 32`, una para `TOKEN_ENCRYPTION_KEY` y otra para `CRON_SECRET`).

## 2. Dale credenciales al servidor

El navegador entra con tu cuenta de Google, pero el **servidor** de Next (el que crea tu
sesión, habla con Meta y escribe lo sensible) usa el Admin SDK, y el Admin SDK necesita una
identidad de Google Cloud. Elige una:

**A · Tu propia cuenta (recomendado)**

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project mi-chatty
gcloud config set project mi-chatty
```

Así el servidor local actúa como tú (el segundo comando evita el error «requires a quota
project» al crear la sesión). Algunas organizaciones de Google Workspace hacen que esta
sesión caduque cada pocas horas: si de pronto `/api/auth/session` responde 401 o ves
`invalid_rapt` en la terminal, vuelve a correr el primer comando.

**B · Una cuenta de servicio**

Consola de Firebase → ⚙ Configuración del proyecto → **Cuentas de servicio** → **Generar nueva
clave privada**. Baja un JSON. Conviértelo a una sola línea y pégalo en `.env.local`:

```bash
node -e "console.log('FIREBASE_SERVICE_ACCOUNT=' + JSON.stringify(require('./ruta/al/archivo.json')))" >> .env.local
```

Ese archivo da control total de tu proyecto: no lo subas a ningún lado y bórralo cuando
termines. Si tu organización bloquea crear llaves, usa la opción A.

## 3. Arranca

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000):

- **Sin las seis variables de Firebase**, ves la guía de instalación (`/instalar`), sin login.
- **Con ellas**, ves el login. Entra con Google o con un usuario de correo que hayas creado en
  Firebase. Si tu correo está en `ALLOWED_EMAILS` (o eres el primero en entrar), llegas a la
  Bandeja.

Si cambias `.env.local` con el servidor prendido, reinícialo para que tome los valores nuevos.

Si el puerto 3000 está ocupado: `npm run dev -- -p 3100` (y cambia `APP_URL`).

## 4. Recibir webhooks en local (opcional)

Meta no llama a `localhost`. Para probar DMs y comentarios en tu máquina necesitas un túnel:

```bash
ngrok http 3000
# o: cloudflared tunnel --url http://localhost:3000
```

Con la URL que te dé (por ejemplo `https://abc123.ngrok-free.app`):

1. En `.env.local`: `APP_URL=https://abc123.ngrok-free.app` y
   `DEV_TUNNEL_HOST=abc123.ngrok-free.app`. Reinicia `npm run dev`.
2. En la app de Meta, agrega `https://abc123.ngrok-free.app/api/ig/callback` como URL de
   redireccionamiento y apunta el webhook a `https://abc123.ngrok-free.app/api/webhooks/instagram`.
3. En Firebase → Authentication → Dominios autorizados, agrega `abc123.ngrok-free.app`.
4. Entra al panel **por la URL del túnel** (no por localhost) y conecta Instagram en Ajustes.

Meta solo tiene **un** webhook por app: mientras apunte a tu túnel, producción no recibe
nada. Lo más cómodo es tener una segunda app de Meta para desarrollo, o probar directo en
producción.

Los flujos con esperas (nodos «Esperar» y preguntas con tiempo límite) dependen del cron. En
local lo disparas a mano:

```bash
curl -H "x-cron-secret: TU_CRON_SECRET" http://localhost:3000/api/cron/tick
```

## Comandos

Todos desde `web/`:

```bash
npm run dev         # servidor local
npm run test        # pruebas del motor de flujos y del matcher
npm run typecheck   # TypeScript sin emitir
npm run lint        # ESLint
npm run build       # build de producción, igual que en App Hosting
```

Antes de mandar un cambio (o de hacer push, que en App Hosting despliega), corre
`typecheck`, `lint`, `test` y `build`.

## Emuladores (opcional)

`firebase.json` trae los emuladores de Auth y Firestore (`firebase emulators:start`, requiere
Java). Sirven para probar reglas; el panel completo no está cableado a ellos (el
motor habla con Meta de verdad), así que para el día a día es más simple un proyecto de
Firebase de pruebas.

Sigue con [Desplegar](06-desplegar.md).
