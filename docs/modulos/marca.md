# Tu marca: nombre, logo y color

Chatty se ve con la marca de quien lo instala. En **Ajustes › Marca** eliges cómo se llama el
panel, su logo y su color, y lo ve todo el que entra: la barra lateral, el login, la pestaña del
navegador, la app del celular y su ícono.

## Dónde se cambia

- **Ya conectado:** Ajustes › Marca. En el celular, **Más › Marca** abre esa misma pantalla.
- **En el modo guía** (sin Firebase) también se puede, en Ajustes: se guarda en ese navegador.
  Cuando conectes tu Firebase, Ajustes › Marca te ofrece usar la que elegiste.

## Qué se puede elegir

| | |
|---|---|
| **Nombre del panel** | Hasta 30 letras. De fábrica: Chatty. |
| **Logo** | PNG, JPG, WebP o SVG. Se guarda como un PNG cuadrado y ligero. Sin logo va la burbuja de Chatty en el ícono y la pestaña. |
| **Color** | Seis de un toque (naranja, rosa, morado, azul, turquesa y grafito) u **Otro**: cualquier color, con el selector o escrito en hex. |

Mientras eliges, todo el panel se pinta con tu marca, y abajo ves cómo queda en claro y en
oscuro. Nada se guarda hasta que le das **Guardar**; **Descartar**, o salir de la pantalla, lo
deja como estaba. **Volver a la de fábrica** regresa a Chatty en naranja.

**El letrero de Chatty.** Mientras el panel se llame Chatty y no tenga logo propio, la barra y el
login enseñan el letrero «chatty» en vez del cuadro con el nombre. La cola de la «y» va en tu
color: si cambias el color, cambia con él. En cuanto le pones otro nombre o subes tu logo, vuelven
el cuadro y tu nombre.

**El logo.** Cuadrado y con fondo transparente queda mejor: va sobre tu color. Si tu logo ya trae
su propio fondo (sus esquinas no son transparentes, como una foto o un JPG), ocupa el cuadro
entero. El interruptor **Sobre tu color** cambia entre las dos formas.

## Lo que hace el panel con tu color

- **El texto de encima:** blanco si se lee sobre tu color; si no (un amarillo, un verde claro),
  negro.
- **El modo oscuro:** si tu color no se ve sobre negro (un azul marino, por ejemplo), se aclara
  sin cambiarle el tono. El negro y los grises pasan a casi blanco: una marca en blanco y negro se
  invierte.
- **Un color muy claro,** como un amarillo, se lee poco sobre blanco en textos e íconos. Ajustes
  te avisa, pero lo puedes usar igual.
- Rojo y verde no vienen en la lista porque son los colores de error y de «listo» del panel: un
  botón de tu marca no debe parecer una alerta. Con **Otro** los puedes poner de todos modos.

## El ícono del celular

- El panel dibuja sus iconos con tu marca: el de la pestaña, el de la app del celular y el de los
  avisos. Cambian en cuanto guardas.
- **iPhone:** una app que ya está en la pantalla de inicio se queda con el nombre y el ícono que
  tenía cuando la agregaste. Para ver los nuevos, bórrala de la pantalla de inicio y vuelve a
  agregarla (Compartir → Agregar a inicio). Los avisos que ya tenías activados no se pierden.
- **Android** los actualiza solo, al rato.

## Cómo funciona por dentro

- Se guarda en Firestore: en `config/marca` el nombre, el color y si hay logo; en
  `config/marcaLogo`, el logo. Solo el servidor los lee y los escribe; la pantalla guarda por
  `PUT /api/identidad`, que pide sesión y revisa que el logo sea de verdad un PNG.
- El servidor pinta tu color en la página antes de mandarla, así no se ve el naranja un instante.
  Guarda un minuto de memoria: si tu panel corre en varias instancias, las demás ven el cambio en
  menos de un minuto.
- Los iconos los dibuja `web/src/app/iconos/[archivo]/route.tsx`.
- En el modo guía se guarda en el `localStorage` del navegador (`chatty:marca`).
- El color de fábrica, los seis de la lista y cómo se calcula el modo oscuro están en
  `web/src/lib/identidad/tipos.ts`.

## Lo que no se cambia aquí

El nombre de tu negocio, el que sale en la política de privacidad y el que usa el asistente,
viene de `NEXT_PUBLIC_BRAND_NAME` ([variables de entorno](../04-variables-de-entorno.md)).
