# Cómo contribuir

¡Gracias por querer mejorar Chatty! Unas reglas cortas para que todo se integre fácil.

## Antes de empezar

- Lee [CLAUDE.md](CLAUDE.md): la arquitectura, el mapa de archivos y las reglas que no se rompen
  (los IDs de puerto del motor, los tokens que nunca tocan el cliente, la cookie `__session`…).
- Para algo grande, abre primero un issue contando qué quieres hacer. Nos ahorra a todos un PR
  que no encaja.

## El código

- **Todo en español**: código, comentarios, textos de la pantalla y mensajes de commit. Tono
  directo, sin groserías.
- Escribe como el código de alrededor: mismos nombres, misma densidad de comentarios.
- **Nunca un hex en una pantalla**: los colores salen de los tokens de `web/src/app/globals.css`.
  El acento es la marca de quien lo instala: lo que va encima es `text-accent-fg`, no `text-white`.
- **Nada de datos reales** en pruebas o ejemplos: nombres, correos, teléfonos y cuentas de
  ficción (`tumarca.com`, `example.com`).
- **Nada atado a un proyecto**: lo que dependa del despliegue va en una variable de entorno,
  documentada en `web/.env.example`, `web/apphosting.yaml`,
  [docs/04-variables-de-entorno.md](docs/04-variables-de-entorno.md) y, si algún paso depende de
  ella, en el catálogo de `web/src/lib/guia/` (lo que enseña «Primeros pasos»).
- Si tocas el modelo de datos, actualiza [docs/datos.md](docs/datos.md) y, si hace falta,
  `firestore.rules` y `firestore.indexes.json`.

## Antes de mandar tu PR

Desde `web/`:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Si cambiaste las reglas de Firestore, corre también la prueba contra el emulador (requiere Java),
desde la raíz:

```bash
firebase emulators:exec --only firestore --project demo-chatty ./scripts/probar-reglas.sh
```

## Ideas por las que empezar

- Borrar conversaciones y contactos desde el panel.
- Más tipos de nodo en el constructor (por ejemplo, esperar hasta una fecha).
- Copiar los adjuntos de los DMs a Storage (las URLs de Meta caducan en horas; el tipo
  `Attachment` ya prevé `mirroredUrl`).
- La interfaz en otros idiomas.

## Seguridad

Si encuentras una vulnerabilidad, **no abras un issue público**. Repórtala en privado con el
botón **Report a vulnerability** de la pestaña **Security** del repositorio.
