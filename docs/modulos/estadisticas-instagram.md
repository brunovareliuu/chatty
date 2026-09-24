# Estadísticas de Instagram

Un tablero de cómo va tu cuenta (`/instagram`, y `/m/instagram` en el celular): seguidores
día por día, alcance, vistas, likes, comentarios, guardados, compartidos, tus publicaciones con
sus cifras, quién te ve y qué te funciona.

## Cómo junta los datos

La pantalla **no le pregunta a Meta**: lee lo que el [cron](../07-cron.md) fue guardando en
Firestore. Es así porque Meta no guarda la historia de tus seguidores, no da 90 días de un
golpe y borra los números de cada historia a las 24 horas. El recolector:

- cada hora: perfil, lista de posts, historias y lo que va de hoy;
- cada 6 horas: los últimos días cerrados, el alcance de cada periodo y las métricas de posts;
- a diario: la audiencia;
- en cuanto hay permiso: el historial de 90 días, en tandas.

El botón **Actualizar** fuerza una pasada. Sin cron, el tablero se queda como lo dejó la última.

## El permiso

Casi todo pide `instagram_business_manage_insights`. Sin él solo hay perfil, likes y
comentarios, y el tablero lo dice con un botón **Reconectar Instagram**.

1. Agrega el permiso en tu app de Meta ([Meta, paso 3](../03-meta-instagram.md#permisos)).
2. Toca **Reconectar Instagram** en el tablero. Meta vuelve directo aquí.

Si al reconectar Meta dice «Invalid scope», el permiso no está agregado en la app.

## Cómo leer las cifras

- **Periodos**: Hoy, Ayer, 7, 28 y 90 días (`/instagram?rango=28` abre directo ahí).
- **Los periodos de Meta terminan ayer**: hoy va a medias y Meta tarda hasta 48 h en cerrar un
  día. Lo que Chatty cuenta en vivo (DMs, automatizaciones) sí incluye hoy.
- **Los días se cortan en hora del Pacífico**, como Meta. Las horas de publicación, en tu zona
  (`NEXT_PUBLIC_TIMEZONE`; por defecto, la del centro de México).
- **Alcance y cuentas alcanzadas no se suman por día** (son personas únicas): se piden por
  periodo. Si Meta no da el periodo largo, la cifra dice «por día».
- **«Típico» es la mediana**, no el promedio: dos reels virales no inflan la cuenta.
- **Likes y comentarios por día sin permiso**: el cron guarda una foto horaria de cada post y
  resta día contra día. El primer día después de conectar no tiene cifra; empieza al siguiente.
- **Las vistas no existen sin el permiso.** Meta no las da de otra forma.

Si algo falla al actualizar, el tablero enseña el mensaje de Meta y lo básico sigue
funcionando. El estado del recolector está en `accounts/{id}/estadisticas/estado`
(`ultimoError`, `permiso`, `proximaEn`).

## Para programadores

Toda la lógica pura (fechas, periodos, cifras, «lo importante») está en
`web/src/lib/estadisticas/` y tiene pruebas (`npm run test`). El recolector vive en
`servidor.ts` y lo llama el paso 5 del tick. `GET /api/instagram/estadisticas` lee el tablero y
`POST` fuerza una pasada.
