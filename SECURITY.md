# Seguridad

Chatty guarda conversaciones de Instagram y tokens de Meta. Si encuentras una forma de leer o
escribir algo que no te toca, repórtalo en privado.

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Usa **[Report a vulnerability](https://github.com/brunovareliuu/chatty/security/advisories/new)**
en la pestaña **Security** del repositorio. Incluye:

- qué se puede hacer y qué se necesita para hacerlo (¿sesión?, ¿una cuenta de Firebase?);
- los pasos para reproducirlo, contra tu propia instalación o el emulador;
- la versión o el commit.

Recibirás respuesta en cuanto se revise. Si es real, se arregla en `main`, se publica una
versión y se te da crédito en el aviso, si quieres.

## Qué versiones reciben arreglos

Solo la última versión publicada y `main`. Cada instalación es de quien la despliega: actualiza
tu copia para recibir los arreglos.

## Lo que ya está cubierto

- Los tokens de Meta se guardan cifrados (AES-256-GCM) en una ruta que las reglas niegan a todo
  navegador.
- Todo webhook se valida con `X-Hub-Signature-256`.
- Las reglas de Firestore piden sesión **y** alta en `users/{uid}`; `scripts/probar-reglas.sh`
  las prueba en el CI contra el emulador.
- El nodo «Llamar a una API» bloquea destinos internos.
- La llave de Claude solo vive en el servidor.

Fuera de alcance: los límites de la API de Meta, y las instalaciones con variables de entorno
expuestas por quien las despliega.
