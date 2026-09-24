# La app del celular (`/m`)

Otra app dentro del mismo panel: su armazón, su navegación y sus colores (los de
iOS), pero el mismo cerebro — la misma sesión, las mismas consultas a Firestore
y los mismos avisos push que el escritorio. Por eso aquí cabe **todo** el panel
sin reescribirlo.

El lenguaje visual es el de las apps nativas de iOS: listas agrupadas como
Ajustes, títulos grandes que se encogen al rodar, hojas que suben desde abajo.
Lo único que cambia respecto a iOS es el acento: ahí es el azul del sistema,
aquí el **naranja de Chatty**.

## Cómo llega el usuario

`/` mira el user-agent y reparte: celular → `/m`, computadora → `/inbox`. Como
el `start_url` del manifest es `/`, tocar el icono del iPhone abre la app y no
el panel encogido. Desde la app se puede ir al panel grande (Más › Ver el panel
de escritorio) y esa dirección ya no pasa por el reparto.

## El mapa

| Pestaña | Ruta | Qué cuelga de ella |
|---|---|---|
| Hoy | `/m` | las cuatro cifras y quién te escribió |
| Bandeja | `/m/bandeja` | `/m/bandeja/[id]` |
| Automatizar | `/m/automatizaciones` | `/m/automatizaciones/[id]` |
| Contactos | `/m/contactos` | — |
| Más | `/m/mas` | `/m/asistente`, `/m/ajustes` y el enlace al panel grande |

Son 9 rutas. Lo que **no** tiene pantalla de celular y se abre en el panel
grande es el lienzo de nodos de un flujo: su fila lo dice, con el icono de
monitor.

`raizDe()` en `components/movil/ui/tabs.tsx` dice qué pestaña se enciende con
cada ruta. **Una ruta nueva se apunta ahí**, si no la barra se apaga al entrar.

## Los colores

`app/m/movil.css` redefine **los mismos tokens** de `globals.css` con los
valores de iOS, dentro de `.movil`. Como los nombres no cambian, todo lo que ya
existe en `components/ui/` (botones, insignias, interruptores) se ve de iOS aquí
sin tocar una línea.

Ojo al cambio que sorprende: en el escritorio `--bg` es blanco y `--surface` el
gris; **en iOS es al revés** — el lienzo es gris (`#F2F2F7`) y las tarjetas son
blancas. Ese archivo y `globals.css` son los únicos con hex literales.

## El kit

Todo en `components/movil/ui/`. **Si dudas de cómo pintar algo, es una `Seccion`
con `Fila`s.** No inventes tarjetas nuevas: es la regla que hace que la app se
sienta de una pieza.

| Archivo | Qué trae |
|---|---|
| `lista.tsx` | `Seccion` (encabezado en mayúsculas, tarjeta con sangría de 16, pie), `Fila`, `FilaEnlace`, `FilaBoton`, `IconoFila` (el cuadrito de color de Ajustes) |
| `pantalla.tsx` | `Pantalla` (título grande que se encoge al rodar + barra con chevron y acción), `PantallaPlana` (sin título grande: hilos y herramientas), `AccionBarra` |
| `tabs.tsx` | `BarraTabs`, `PESTANAS`, `raizDe()` |
| `controles.tsx` | `Segmentado`, `Busqueda`, `BotonGrande`, `Vacio`, `Cargando`, `Globo` |
| `hoja.tsx` | `Hoja` (formulario que sube desde abajo, con Cancelar/Guardar), `HojaAcciones` (el menú de «…») |

Detalles que hacen que se vea de Apple y que es fácil romper:

- **La sangría del separador.** `Fila` la calcula sola: 16 px sin icono, 57 con
  icono. Se pinta con la clase `sep-ios`, que dibuja media línea (`scaleY(.5)`)
  porque el separador de iOS es más fino que un píxel.
- **La última fila de una tarjeta lleva `ultima`**, si no queda una rayita
  suelta encima del borde redondeado.
- **44 px de alto mínimo** en todo lo que se toca. Ya lo trae `Fila`.
- **16 px de tamaño de letra mínimo en los campos de texto.** Con menos, Safari
  de iOS hace zoom al enfocarlos y la pantalla se descuadra.
- **El encabezado de sección va a `px-8`**, alineado con el texto de las filas,
  no con el borde de la tarjeta.

## Los datos

`lib/movil/datos.ts` tiene el formato que comparten las pantallas (`aFecha`,
`hace`). Los datos salen de donde ya salían: `lib/client/firestore-hooks.ts`
para Instagram y `lib/push/*` para los avisos.

**No se duplica lógica de negocio.** Si una pantalla de celular necesita algo
que el escritorio ya hace, se importa la función; lo que se escribe aquí es
solo la pintura.

## Las herramientas de escritorio

El constructor de flujos es un lienzo de nodos pensado para ratón: no se
reescribe para el dedo. Su fila lleva al panel grande y lo dice.
`components/movil/en-obra.tsx` es la pantalla de paso para cualquier cosa que
todavía no tenga versión de celular.

## Verlo sin celular

El modo de dispositivo de las herramientas de desarrollo del navegador, a
390×844 y con la sesión iniciada, basta para casi todo; para capturas que se
repitan igual, Chrome sin ventana manejado por CDP. Mira cada pantalla en claro
y en oscuro: **ninguna se da por buena sin haberla visto**.
