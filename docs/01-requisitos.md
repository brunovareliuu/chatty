# 1 · Lo que necesitas antes de empezar

Chatty corre en **tu** proyecto de Firebase y habla con **tu** app de Meta. Nadie comparte
datos con nadie: cada copia es independiente. Este tutorial dice qué juntar antes de tocar
código. Con todo a la mano, la instalación completa toma entre una y dos horas.

## Cuentas

| Qué | Para qué | Costo |
|---|---|---|
| Cuenta de Google | Firebase y Google Cloud | Gratis |
| Proyecto de Firebase en **plan Blaze** | App Hosting, Secret Manager y Cloud Scheduler lo exigen | Pago por uso. Con poco tráfico suele costar **centavos al mes**, pero pide tarjeta |
| Cuenta de Instagram **profesional** (Empresa o Creador) | Recibir y mandar DMs, leer comentarios | Gratis |
| Cuenta de desarrollador de Meta ([developers.facebook.com](https://developers.facebook.com)) | Crear la app que conecta tu Instagram | Gratis |
| Repositorio en GitHub | App Hosting despliega desde ahí | Gratis |

Opcional:

| Qué | Prende | Costo |
|---|---|---|
| Llave de la API de Claude ([console.anthropic.com](https://console.anthropic.com)) | El **asistente**, que arma y edita automatizaciones por ti | Por uso |

Sin ella, todo lo demás funciona igual: bandeja, automatizaciones, flujos, contactos y la app
del celular con sus avisos.

## En tu computadora

- **Node.js 20 o superior** (`node -v`).
- **Firebase CLI**: `npm i -g firebase-tools`, y luego `firebase login`.
- **Google Cloud CLI** (`gcloud`), para el cron y, si quieres, las credenciales en local:
  [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install).
- **Git**.
- Opcional, para probar webhooks en local: [ngrok](https://ngrok.com) o
  [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).

## El orden

Cada tutorial usa algo del anterior. Síguelos en orden la primera vez:

1. **Requisitos** — este archivo.
2. [Firebase](02-firebase.md) — el proyecto, la base de datos, el login y las reglas.
3. [Meta e Instagram](03-meta-instagram.md) — la app que conecta tu cuenta.
4. [Variables de entorno](04-variables-de-entorno.md) — qué va en cada una y de dónde sale.
5. [Correr en local](05-correr-en-local.md) — verlo funcionando en tu máquina.
6. [Desplegar](06-desplegar.md) — ponerlo en internet con App Hosting.
7. [El cron](07-cron.md) — el latido de cada minuto (esperas, tokens, avisos).
8. [Primer uso](08-primer-uso.md) — conectar Instagram y probar tu primera automatización.

Luego, cada módulo tiene su guía en [`docs/modulos/`](README.md#módulos).

> **Para ver por dónde vas:** corre el panel (`cd web && npm install && npm run dev`) y abre
> [localhost:3000](http://localhost:3000). Se abre el sistema en *modo guía*: cada sección con
> cómo se ve funcionando y sus pasos, y **Primeros pasos** con el checklist de todo. Lo que el panel
> puede revisar se marca solo; lo demás lo palomeas tú.

> **Un consejo que ahorra horas:** despliega primero (paso 6) aunque sea con lo mínimo.
> Meta no acepta `localhost` como redirect ni como webhook, así que para conectar Instagram
> necesitas una URL pública: la de App Hosting o la de un túnel.
