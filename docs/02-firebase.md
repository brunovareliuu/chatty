# 2 · Firebase

Aquí creas el proyecto donde vive todo: la base de datos (Firestore), el login
(Authentication) y, más adelante, la app (App Hosting). Al final despliegas las reglas de
seguridad que vienen en el repo.

Todo se puede hacer desde la consola ([console.firebase.google.com](https://console.firebase.google.com));
donde hay comando equivalente, va al lado.

## 1. Crea el proyecto

Consola → **Agregar proyecto** → ponle nombre (por ejemplo `mi-chatty`). Google Analytics es
opcional: el panel no lo usa.

```bash
firebase projects:create mi-chatty --display-name "Chatty"
```

Anota el **ID del proyecto** (el `mi-chatty` de arriba, o el que te haya dado Firebase). Lo vas
a usar en casi todos los pasos.

## 2. Cámbialo a plan Blaze

Consola → engrane ⚙ → **Uso y facturación** → **Detalles y configuración del plan** →
**Modificar plan** → Blaze. Pide una cuenta de facturación con tarjeta.

App Hosting, Secret Manager y Cloud Scheduler no funcionan en el plan gratuito. Con el uso normal de una persona o un equipo chico el costo real son centavos; si
quieres dormir tranquilo, en Google Cloud → **Facturación → Presupuestos y alertas** pon una
alerta de, por ejemplo, 5 dólares.

## 3. Firestore

Consola → **Compilación → Firestore Database** → **Crear base de datos**.

- Edición: **Standard**.
- ID de la base: `(default)`. El código espera esa.
- Ubicación: la más cercana a ti o a tu público (`nam5` o `us-central1` si estás en América).
  **No se puede cambiar después.**
- Modo: **producción**. Las reglas buenas las despliegas tú en el paso 8.

```bash
firebase firestore:databases:create "(default)" --location=nam5 --project mi-chatty
```

## 4. Authentication

Consola → **Compilación → Authentication** → **Comenzar** → pestaña **Método de acceso**.
Activa los dos:

- **Google** — el más cómodo. Te pide un correo de asistencia: pon el tuyo.
- **Correo electrónico/contraseña** — útil para cuentas del equipo que no son de Google.

El panel **no tiene registro**: nadie se crea una cuenta sola. Para entrar con correo y
contraseña, crea el usuario tú en **Authentication → Usuarios → Agregar usuario**. Y aunque
alguien tenga cuenta de Firebase, solo entra si su correo está en `ALLOWED_EMAILS`
([variables](04-variables-de-entorno.md)).

**Dominios autorizados.** En **Authentication → Configuración → Dominios autorizados**,
`localhost` ya viene. Cuando despliegues (paso 6) vuelve aquí y agrega el dominio de App
Hosting (`…hosted.app`) y tu dominio propio si usas uno. Sin eso, el botón de Google falla con
`auth/unauthorized-domain`.

## 5. Registra la app web

Consola → engrane ⚙ → **Configuración del proyecto** → **General** → **Tus apps** → icono
**Web** (`</>`) → apodo `Chatty`. No marques Hosting (el panel usa App Hosting).

Te enseña un bloque `firebaseConfig`. Esos seis valores son los `NEXT_PUBLIC_FIREBASE_*` del
[paso 4](04-variables-de-entorno.md). No son secretos: llegan al navegador de todos modos, y lo
que protege tus datos son las reglas.

En cuanto los pongas en `web/.env.local`, el panel deja de enseñar la guía de instalación y
aparece el login.

```bash
firebase apps:create web "Chatty" --project mi-chatty
firebase apps:sdkconfig WEB --project mi-chatty    # imprime los seis valores
```

## 6. Liga el repo con tu proyecto

Desde la **raíz del repo** (donde está `firebase.json`):

```bash
firebase login
firebase use --add      # elige tu proyecto y ponle el alias "default"
```

Eso crea `.firebaserc`, que es de tu copia: está en `.gitignore` para que nadie suba el suyo
por accidente.

## 7. Despliega las reglas y los índices

```bash
firebase deploy --only firestore
```

Esto sube dos archivos de la raíz:

| Archivo | Qué hace |
|---|---|
| `firestore.rules` | Quién lee y escribe cada colección. Los tokens de Meta, las llaves de push y las conversaciones del asistente **nunca** llegan al navegador. |
| `firestore.indexes.json` | Los índices compuestos que piden las consultas del panel. Tardan unos minutos en construirse. |

Cómo funcionan, en corto: al iniciar sesión, el servidor del panel revisa `ALLOWED_EMAILS` y
crea tu documento en `users/`. Las reglas piden que ese documento exista, así que alguien que se
cree una cuenta de Firebase por su lado no ve nada. El detalle de cada colección está en
[datos.md](datos.md).

Cada vez que cambies las reglas o los índices, repite este comando. App Hosting **no** los
despliega.

## 8. Las credenciales del servidor

El servidor de Next habla con Firestore y Authentication con el **Admin SDK**, que necesita una
identidad de Google Cloud:

- **En producción** no haces nada: App Hosting le da a tu app una cuenta de servicio con
  permisos sobre el proyecto.
- **En tu máquina** tienes dos caminos, explicados en [Correr en local](05-correr-en-local.md):
  `gcloud auth application-default login`, o el JSON de una cuenta de servicio en
  `FIREBASE_SERVICE_ACCOUNT`.

## Listo si…

- [ ] El proyecto está en Blaze.
- [ ] Firestore y Authentication (Google + correo) están activos.
- [ ] Tienes los seis valores de la app web.
- [ ] `firebase deploy --only firestore` terminó sin errores.

Sigue con [Meta e Instagram](03-meta-instagram.md).
