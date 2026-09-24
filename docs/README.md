# Documentación de Chatty

> **Lo más rápido:** `cd web && npm install && npm run dev` y abre
> [localhost:3000](http://localhost:3000). Mientras no esté conectado a Firebase, el panel abre
> su propia guía de instalación (`/instalar`), con una lista en vivo de lo que ya tienes y lo
> que falta. Estos archivos son la versión larga de cada paso.

## Instalación, en orden

La primera vez, síguelos de arriba abajo. Cada uno termina con una lista de «listo si…».

1. [Lo que necesitas](01-requisitos.md) — cuentas, costos y herramientas.
2. [Firebase](02-firebase.md) — proyecto, Firestore, login y reglas.
3. [Meta e Instagram](03-meta-instagram.md) — la app que conecta tu cuenta.
4. [Variables de entorno](04-variables-de-entorno.md) — qué es cada una y de dónde sale.
5. [Correr en local](05-correr-en-local.md) — verlo en tu máquina.
6. [Desplegar](06-desplegar.md) — ponerlo en internet con Firebase App Hosting.
7. [El cron](07-cron.md) — el latido de cada minuto.
8. [Primer uso](08-primer-uso.md) — conectar Instagram y tu primer DM automático.

## Cómo se usa

| Guía | Qué es |
|---|---|
| [Bandeja, automatizaciones y flujos](modulos/bandeja-y-automatizaciones.md) | Los DMs, las palabras clave y el constructor visual |
| [Asistente](modulos/asistente.md) | Claude arma y edita automatizaciones por ti |
| [La app del celular y los avisos](modulos/app-movil-y-avisos.md) | Instalarla y los avisos push |

## Referencia

- [El modelo de datos](datos.md) — cada colección de Firestore y quién la escribe.
- [Solución de problemas](solucion-de-problemas.md).

## Para quien programa

- [CLAUDE.md](../CLAUDE.md) — la arquitectura, el mapa de archivos y las reglas que no se
  rompen. Sirve igual si programas con Claude Code que sin él.
- [La app del celular por dentro](desarrollo/app-movil.md).
- [Cómo contribuir](../CONTRIBUTING.md).
