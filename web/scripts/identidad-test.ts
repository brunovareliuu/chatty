/**
 * Pruebas de la identidad del panel: el color que se deriva de tu marca y lo
 * que se acepta guardar. Sin Firebase ni navegador.
 *
 *   npm run test
 */
import {
  COLORES,
  DE_FABRICA,
  LOGO_MAX,
  aLocal,
  coloresDe,
  contraste,
  cssDe,
  leeEntrada,
  leeLocal,
  paraOscuro,
  sePierdeEnClaro,
  svgBurbuja,
  textoSobre,
  usaLetrero,
} from '../src/lib/identidad/tipos.ts';

let pass = 0, fail = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++;
  else fail++;
  if (!ok) console.log(`  ✗ ${name}\n      esperado: ${JSON.stringify(expected)}\n      obtenido: ${JSON.stringify(actual)}`);
};
const cerca = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Contraste (los valores de referencia de WCAG) ---
check('negro contra blanco da 21', cerca(contraste('#000000', '#ffffff'), 21), true);
check('un color contra sí mismo da 1', contraste('#fa4c03', '#fa4c03'), 1);
check('el orden no importa', contraste('#2563eb', '#ffffff'), contraste('#ffffff', '#2563eb'));

// --- La de fábrica se queda exactamente como estaba ---
check('de fábrica: blanco sobre el naranja', coloresDe(DE_FABRICA.acento), {
  marca: '#fa4c03',
  marcaFg: '#ffffff',
  marcaOscuro: '#fa4c03',
  marcaFgOscuro: '#ffffff',
});
check(
  'css de fábrica',
  cssDe('#fa4c03'),
  'html:root{--marca:#fa4c03;--marca-fg:#ffffff;--marca-oscuro:#fa4c03;--marca-fg-oscuro:#ffffff}',
);

// --- El texto encima de tu color ---
check('sobre amarillo, negro', textoSobre('#facc15'), '#0a0a0b');
check('sobre azul, blanco', textoSobre('#2563eb'), '#ffffff');
check('sobre casi blanco, negro', textoSobre('#f4f4f5'), '#0a0a0b');

// --- El modo oscuro ---
check('un color que ya se ve en oscuro no cambia', paraOscuro('#DB2777'), '#db2777');
check('el negro se invierte a casi blanco', paraOscuro('#18181b'), '#f4f4f5');
check('un gris oscuro también', paraOscuro('#262626'), '#f4f4f5');
const marino = paraOscuro('#1e3a8a');
check('el azul marino se aclara', marino !== '#1e3a8a', true);
check('y ya se ve sobre la barra oscura', contraste(marino, '#161618') >= 3, true);
const azulPuro = paraOscuro('#0000ff');
check('el azul puro sigue siendo azul', parseInt(azulPuro.slice(5, 7), 16) > parseInt(azulPuro.slice(1, 3), 16), true);
for (const c of COLORES) {
  const { marca, marcaFg, marcaOscuro, marcaFgOscuro } = coloresDe(c.hex);
  check(`${c.nombre}: se ve en la barra oscura`, contraste(marcaOscuro, '#161618') >= 3, true);
  check(`${c.nombre}: su texto se lee en claro`, contraste(marca, marcaFg) >= 3, true);
  check(`${c.nombre}: su texto se lee en oscuro`, contraste(marcaOscuro, marcaFgOscuro) >= 3, true);
  check(`${c.nombre}: no se pierde sobre blanco`, sePierdeEnClaro(c.hex), false);
}
check('el amarillo se pierde sobre blanco', sePierdeEnClaro('#facc15'), true);
check('un hex roto usa el de fábrica', coloresDe('naranja').marca, '#fa4c03');

// --- Lo que se acepta guardar ---
const bien = { nombre: '  Café   Norte ', acento: '#2563EB', logoCompleto: false };
check('limpia el nombre y baja el hex', leeEntrada(bien), {
  ok: true,
  entrada: { nombre: 'Café Norte', acento: '#2563eb', logoCompleto: false },
});
check('sin logo en la entrada, no toca el que hay', 'logo' in (leeEntrada(bien) as { entrada: object }).entrada, false);
check('logo null lo quita', leeEntrada({ ...bien, logo: null }), {
  ok: true,
  entrada: { nombre: 'Café Norte', acento: '#2563eb', logoCompleto: false, logo: null },
});
check('nombre vacío', leeEntrada({ ...bien, nombre: '   ' }), { ok: false, error: 'Ponle un nombre al panel' });
check('nombre de más de 30', leeEntrada({ ...bien, nombre: 'x'.repeat(31) }).ok, false);
check('30 emojis sí caben', leeEntrada({ ...bien, nombre: '🙌'.repeat(30) }).ok, true);
check('sin caracteres de control', (leeEntrada({ ...bien, nombre: 'Hola\u0000\u0007 ya' }) as { entrada: { nombre: string } }).entrada.nombre, 'Hola ya');
check('color sin #', leeEntrada({ ...bien, acento: '2563eb' }).ok, false);
check('color de tres cifras', leeEntrada({ ...bien, acento: '#fff' }).ok, false);
check('color con inyección', leeEntrada({ ...bien, acento: '#fff;}body{display:none' }).ok, false);
check('logo que no es PNG', leeEntrada({ ...bien, logo: 'data:image/svg+xml;base64,PHN2Zz4=' }).ok, false);
check('logo que no es data URL', leeEntrada({ ...bien, logo: 'https://example.com/logo.png' }).ok, false);
check('logo demasiado grande', leeEntrada({ ...bien, logo: `data:image/png;base64,${'A'.repeat(LOGO_MAX)}` }).ok, false);
check('logo PNG bien formado', leeEntrada({ ...bien, logo: 'data:image/png;base64,iVBORw0KGgo=' }).ok, true);
check('cuerpo que no es objeto', leeEntrada('hola').ok, false);

// --- Lo del navegador (modo guía) ---
const local = aLocal({ nombre: 'Café Norte', acento: '#2563eb', logo: null, logoCompleto: false }, 1000);
check('guarda las variables para el script del <head>', JSON.parse(local).variables['--marca'], '#2563eb');
check('se vuelve a leer igual', leeLocal(local), {
  nombre: 'Café Norte',
  acento: '#2563eb',
  logo: null,
  logoCompleto: false,
  actualizadoEn: 1000,
});
check('basura en el navegador cuenta como nada', leeLocal('{no es json'), null);
check('un color roto en el navegador cuenta como nada', leeLocal(JSON.stringify({ nombre: 'x', acento: 'rojo', actualizadoEn: 1 })), null);
check('un logo raro en el navegador se ignora', leeLocal(JSON.stringify({ nombre: 'x', acento: '#000000', logo: 'javascript:alert(1)', actualizadoEn: 1 }))?.logo, null);

// --- La burbuja ---
const svg = svgBurbuja('#ffffff');
check('la burbuja se tiñe del color que le pidas', svg.includes('fill="#ffffff"'), true);
check('y trae sus tres puntos huecos', (svg.match(/<circle/g) ?? []).length, 3);

// --- El letrero ---
check('con la de fábrica va el letrero', usaLetrero(DE_FABRICA), true);
check('con otro nombre, el cuadro y el nombre', usaLetrero({ ...DE_FABRICA, nombre: 'Café Norte' }), false);
check('con logo propio, el cuadro aunque se llame Chatty', usaLetrero({ ...DE_FABRICA, logo: 'data:image/png;base64,AAAA' }), false);

console.log(fail ? `✗ ${fail} de ${pass + fail} fallaron` : `✓ ${pass} pruebas pasaron, 0 fallaron`);
if (fail) process.exit(1);
