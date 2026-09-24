# Chatty

**Tu propio ManyChat para Instagram**, corriendo en **tu** Firebase, con **tus** datos: una
bandeja para tus DMs, automatizaciones por palabra clave y un constructor visual de flujos.

Cada quien despliega su propia copia: su proyecto de Firebase, su app de Meta, su base de
datos. Nadie comparte información con nadie. El repo no trae ningún proyecto configurado.

---

## Ábrelo

```bash
cd web
npm install
npm run dev
```

Abre [localhost:3000](http://localhost:3000). Como todavía no está conectado a nada, no te pide
cuenta: te enseña la **guía de instalación**, paso por paso, con una lista en vivo de lo que ya
tienes y lo que falta. Cuando pones las llaves de tu Firebase, la guía se aparta y aparece el
login.

---

## Qué hace

- **Bandeja** — todos los DMs de tu Instagram en tiempo real; contestas desde la web.
- **Automatizaciones** — por palabra clave en DM, en comentarios (el clásico *«comenta GUÍA y
  te mando el link»*), respuestas a historias, primer mensaje y respuesta por defecto. Varias
  respuestas públicas al azar, prioridades y límites de frecuencia.
- **Constructor visual de flujos** — mensajes, botones, enlaces, respuestas rápidas, preguntas
  que guardan datos, «pedir que te siga», esperas, condiciones, etiquetas, pasar a humano y
  llamadas a tu propia API.
- **Contactos** — quién te escribió, sus etiquetas, sus notas y lo que capturaste.
- **Asistente con Claude** (opcional) — *«cuando comenten GUÍA en mi último post, mándales este
  link, solo si me siguen»* y lo arma.
- **App de celular** instalable, con **avisos push** propios: automatizaciones, comentarios,
  DMs sin contestar y cifras redondas.

Todo en español.

---

## Cómo está armado

```
Instagram ──webhook──▶ /api/webhooks/instagram ──▶ Firestore
                                │                      │
                                ▼                      ▼
                       motor de flujos           bandeja en vivo
                                │             (onSnapshot en el navegador)
                                ▼
                       API de Instagram

Cloud Scheduler ──cada minuto──▶ /api/cron/tick   (esperas, timeouts, tokens, seguidores)
```

- **Next.js 16** (App Router) — pantallas y endpoints en una sola app, desplegada en
  **Firebase App Hosting**. No hay `functions/` aparte: un solo despliegue.
- **Firestore** — el navegador lee en vivo; lo sensible solo lo escribe el servidor.
- **Cloud Scheduler** — un latido por minuto.
- **Claude** (opcional) — el asistente, siempre desde el servidor.

---

## Instalación

La misma guía que abre el panel, con más detalle, está en **[docs/](docs/README.md)**:

1. [Lo que necesitas](docs/01-requisitos.md)
2. [Firebase](docs/02-firebase.md)
3. [Meta e Instagram](docs/03-meta-instagram.md)
4. [Variables de entorno](docs/04-variables-de-entorno.md)
5. [Correr en local](docs/05-correr-en-local.md)
6. [Desplegar](docs/06-desplegar.md)
7. [El cron](docs/07-cron.md)
8. [Primer uso](docs/08-primer-uso.md)

Necesitas Node 20+, un proyecto de Firebase en plan Blaze (con poco uso cuesta centavos) y una
cuenta de Instagram profesional. Para tu propia cuenta no hace falta revisión de Meta.

---

## Seguridad

- Sin Firebase configurado, el panel solo enseña la guía de instalación: no hay datos que
  proteger. Ya configurado, todo pide sesión.
- Solo entran los correos de `ALLOWED_EMAILS`, y las reglas piden además que el servidor te haya
  dado de alta: una cuenta de Firebase creada por fuera no ve nada. `scripts/probar-reglas.sh`
  lo comprueba contra el emulador.
- Los tokens de Meta se guardan **cifrados** (AES-256-GCM) en una subcolección que las reglas
  niegan a todo navegador.
- Cada webhook se valida contra la firma `X-Hub-Signature-256`; sin firma válida, se descarta.
- El nodo «Llamar a una API» bloquea destinos internos, para que un flujo no pueda leer las
  credenciales del servidor.
- La llave de Claude solo vive en el servidor, y todo lo que Claude pide se valida antes de
  escribir.

Si encuentras una vulnerabilidad, repórtala en privado (ver
[CONTRIBUTING.md](CONTRIBUTING.md#seguridad)) antes de abrir un issue público.

---

## Límites que impone Meta (no son bugs)

- **Ventana de 24 horas**: solo le escribes libremente a alguien durante las 24 h posteriores a
  *su* último mensaje. Después, solo respuestas de persona (etiqueta `HUMAN_AGENT`, hasta 7 días).
- **Un DM privado por comentario**, dentro de 7 días, **solo de texto**. Lo demás del flujo espera
  a que la persona conteste.
- **Saber si alguien te sigue** solo funciona después de que te escribió o tocó un botón.
- **1000 bytes** por mensaje, **3 botones**, **13 respuestas rápidas**.
- Los tokens duran **60 días**; Chatty los renueva mientras el cron corra.
- Para conectar cuentas que no tienen rol en tu app de Meta, Meta exige **revisión de la app**.

---

## Desarrollo

```bash
cd web
npm run dev         # servidor local
npm run test        # motor de flujos y matcher
npm run typecheck
npm run lint
npm run build
```

Arquitectura, mapa de archivos y las reglas que no se rompen: [CLAUDE.md](CLAUDE.md).
Para contribuir: [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

[MIT](LICENSE).
