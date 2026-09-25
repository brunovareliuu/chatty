/**
 * La identidad del panel: cómo se llama, su logo y su color. Se elige en
 * Ajustes › Marca y la ve todo el que entra: la barra, el login, la pestaña del
 * navegador, la app del celular y su ícono.
 *
 * Puro (sin Firestore ni DOM) y sin imports: lo usan el servidor, el navegador,
 * la ruta que pinta los iconos y las pruebas (`scripts/identidad-test.ts`), que
 * Node corre sin los alias de Next.
 *
 * El color entra a la interfaz por cuatro variables: `--marca`, `--marca-fg`,
 * `--marca-oscuro` y `--marca-fg-oscuro`. `globals.css` y `m/movil.css` sacan
 * de ahí el acento de cada modo; ninguna pantalla sabe cuál es el color.
 */

export type Identidad = {
  /** Cómo se llama el panel. */
  nombre: string;
  /** El color de la marca (`#rrggbb`): botones, enlaces, lo seleccionado. */
  acento: string;
  /**
   * El logo, listo para un `<img>`: su URL (`/iconos/logo.png?v=…`) o, en el
   * modo guía, su data URL. Sin logo va la burbuja de Chatty.
   */
  logo: string | null;
  /** El logo ya trae su fondo: ocupa todo el cuadro en vez de ir sobre tu color. */
  logoCompleto: boolean;
  /** Cuándo se guardó. `null`: nunca, es la de fábrica. */
  actualizadoEn: number | null;
};

export const DE_FABRICA: Identidad = {
  nombre: 'Chatty',
  acento: '#fa4c03',
  logo: null,
  logoCompleto: false,
  actualizadoEn: null,
};

/**
 * Los colores para elegir de un toque. Ni rojo ni verde: en el panel son los
 * de error y de listo, y un botón de tu marca no debe parecer una alerta.
 */
export const COLORES: { nombre: string; hex: string }[] = [
  { nombre: 'Naranja', hex: '#fa4c03' },
  { nombre: 'Rosa', hex: '#db2777' },
  { nombre: 'Morado', hex: '#7c3aed' },
  { nombre: 'Azul', hex: '#2563eb' },
  { nombre: 'Turquesa', hex: '#0891b2' },
  { nombre: 'Grafito', hex: '#18181b' },
];

export const NOMBRE_MAX = 30;
/** El logo se guarda como PNG cuadrado de este lado. */
export const LOGO_LADO = 256;
/** Tope del data URL del logo: unos 220 KB de PNG. */
export const LOGO_MAX = 300_000;

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------

const HEX = /^#[0-9a-f]{6}$/i;

export function esHex(v: unknown): v is string {
  return typeof v === 'string' && HEX.test(v);
}

function aRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function aHex(rgb: number[]): string {
  return `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
}

/** Luminancia relativa, como la define WCAG. */
export function luminancia(hex: string): number {
  const [r, g, b] = aRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** El contraste entre dos colores: de 1 (iguales) a 21 (negro y blanco). */
export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

function aHsl(hex: string): [number, number, number] {
  const [r, g, b] = aRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function deHsl(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return aHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

const BLANCO = '#ffffff';
const NEGRO = '#0a0a0b';
/** `--surface` del modo oscuro: la barra lateral, las tarjetas. Ahí es donde más se ve el acento. */
const SUPERFICIE_OSCURA = '#161618';
const CASI_BLANCO = '#f4f4f5';

/** El texto que va encima de tu color: blanco si se lee (3:1, lo de botones y letra gruesa); si no, negro. */
export function textoSobre(fondo: string): string {
  return contraste(fondo, BLANCO) >= 3 ? BLANCO : NEGRO;
}

/**
 * El acento del modo oscuro. Si tu color ya se ve sobre negro, es el mismo; si
 * no, se aclara sin cambiarle el tono. Los grises y el negro pasan a casi
 * blanco: una marca en blanco y negro se invierte.
 */
export function paraOscuro(color: string): string {
  if (contraste(color, SUPERFICIE_OSCURA) >= 3) return color.toLowerCase();
  const [h, s, l] = aHsl(color);
  if (s < 0.12) return CASI_BLANCO;
  for (let luz = l; luz < 0.95; luz += 0.01) {
    const aclarado = deHsl(h, s, luz);
    if (contraste(aclarado, SUPERFICIE_OSCURA) >= 3) return aclarado;
  }
  return CASI_BLANCO;
}

/** Sobre blanco se lee poco: los textos y los íconos en ese color van a costar trabajo. */
export function sePierdeEnClaro(color: string): boolean {
  return contraste(color, BLANCO) < 3;
}

export type Colores = { marca: string; marcaFg: string; marcaOscuro: string; marcaFgOscuro: string };

export function coloresDe(acento: string): Colores {
  const marca = esHex(acento) ? acento.toLowerCase() : DE_FABRICA.acento;
  const marcaOscuro = paraOscuro(marca);
  return { marca, marcaFg: textoSobre(marca), marcaOscuro, marcaFgOscuro: textoSobre(marcaOscuro) };
}

export const VARIABLES = ['--marca', '--marca-fg', '--marca-oscuro', '--marca-fg-oscuro'] as const;

export function variablesDe(acento: string): Record<(typeof VARIABLES)[number], string> {
  const c = coloresDe(acento);
  return {
    '--marca': c.marca,
    '--marca-fg': c.marcaFg,
    '--marca-oscuro': c.marcaOscuro,
    '--marca-fg-oscuro': c.marcaFgOscuro,
  };
}

/**
 * Lo que el servidor pone en el `<head>`. `html:root` pesa más que el `:root`
 * de `globals.css`, así gana sin importar en qué orden lleguen las hojas.
 */
export function cssDe(acento: string): string {
  const declaraciones = Object.entries(variablesDe(acento)).map(([k, v]) => `${k}:${v}`);
  return `html:root{${declaraciones.join(';')}}`;
}

// ---------------------------------------------------------------------------
// Lo que llega a guardarse
// ---------------------------------------------------------------------------

/** Lo que manda Ajustes › Marca. Sin `logo`, el que ya estaba se queda; `null` lo quita. */
export type Entrada = { nombre: string; acento: string; logo?: string | null; logoCompleto: boolean };

/** Sin caracteres de control ni espacios de más. No recorta: si es largo, se rechaza. */
export function limpiaNombre(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
}

const LOGO_PNG = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;

export function esLogo(v: unknown): v is string {
  return typeof v === 'string' && v.length <= LOGO_MAX && LOGO_PNG.test(v);
}

export function leeEntrada(cuerpo: unknown): { ok: true; entrada: Entrada } | { ok: false; error: string } {
  if (!cuerpo || typeof cuerpo !== 'object') return { ok: false, error: 'Cuerpo inválido' };
  const c = cuerpo as Record<string, unknown>;

  const nombre = limpiaNombre(c.nombre);
  if (!nombre) return { ok: false, error: 'Ponle un nombre al panel' };
  if (Array.from(nombre).length > NOMBRE_MAX) {
    return { ok: false, error: `El nombre va de 1 a ${NOMBRE_MAX} letras` };
  }
  if (!esHex(c.acento)) return { ok: false, error: 'El color tiene que ser un hex, como #fa4c03' };

  const entrada: Entrada = { nombre, acento: c.acento.toLowerCase(), logoCompleto: c.logoCompleto === true };
  if ('logo' in c && c.logo !== undefined) {
    if (c.logo === null) entrada.logo = null;
    else if (esLogo(c.logo)) entrada.logo = c.logo;
    else return { ok: false, error: 'El logo tiene que ser un PNG de hasta 220 KB' };
  }
  return { ok: true, entrada };
}

// ---------------------------------------------------------------------------
// El modo guía: la identidad vive en este navegador
// ---------------------------------------------------------------------------

export const CLAVE_LOCAL = 'chatty:marca';

/** Lee lo guardado en el navegador. Cualquier cosa rara vale como nada guardado. */
export function leeLocal(crudo: string | null): Identidad | null {
  if (!crudo) return null;
  try {
    const d = JSON.parse(crudo) as Record<string, unknown>;
    const nombre = limpiaNombre(d.nombre);
    if (!nombre || !esHex(d.acento) || typeof d.actualizadoEn !== 'number') return null;
    return {
      nombre: Array.from(nombre).slice(0, NOMBRE_MAX).join(''),
      acento: d.acento.toLowerCase(),
      logo: esLogo(d.logo) ? d.logo : null,
      logoCompleto: d.logoCompleto === true,
      actualizadoEn: d.actualizadoEn,
    };
  } catch {
    return null;
  }
}

/** Lo que se escribe en el navegador: la identidad y sus variables ya calculadas, para el script de abajo. */
export function aLocal(i: Omit<Identidad, 'actualizadoEn'>, actualizadoEn: number): string {
  return JSON.stringify({ ...i, actualizadoEn, variables: variablesDe(i.acento) });
}

/**
 * Corre en el `<head>` antes de pintar, solo en el modo guía: pone tu color
 * desde el primer cuadro, sin el parpadeo del naranja de fábrica.
 */
export const SCRIPT_LOCAL = `(function(){try{var m=JSON.parse(localStorage.getItem(${JSON.stringify(CLAVE_LOCAL)})||'null');var v=m&&m.variables;if(!v)return;var s=document.documentElement.style;for(var k in v){if(/^--marca(-fg)?(-oscuro)?$/.test(k)&&/^#[0-9a-f]{6}$/i.test(v[k]))s.setProperty(k,v[k])}}catch(e){}})();`;

// ---------------------------------------------------------------------------
// La burbuja: el logo de fábrica
// ---------------------------------------------------------------------------

/**
 * La burbuja de chat escribiendo, en una caja de 100×100. Un solo color, con
 * los tres puntos huecos para que se pueda teñir. `caja` la recorta a lo que
 * ocupa el dibujo, así se centra y se mide de verdad.
 */
export const BURBUJA = {
  caja: '8 12 84 82',
  cuerpo: { x: 8, y: 12, ancho: 84, alto: 66, radio: 24 },
  cola: 'M22 64 C22 80 19 88 12 94 C27 92 38 86 48 76 Z',
  puntos: [32, 50, 68].map((cx) => ({ cx, cy: 45, r: 6.5 })),
};

/** La burbuja como SVG suelto, para la ruta que pinta los iconos. */
export function svgBurbuja(color: string): string {
  const { caja, cuerpo: c, cola, puntos } = BURBUJA;
  const huecos = puntos.map((p) => `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="black"/>`).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${caja}" width="840" height="820">` +
    `<defs><mask id="p" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="white"/>${huecos}</mask></defs>` +
    `<g fill="${color}" mask="url(#p)"><rect x="${c.x}" y="${c.y}" width="${c.ancho}" height="${c.alto}" rx="${c.radio}"/><path d="${cola}"/></g>` +
    `</svg>`
  );
}

// ---------------------------------------------------------------------------
// El letrero: el logo de Chatty con su nombre
// ---------------------------------------------------------------------------

/**
 * «chatty» con la cola de la «y» en forma de burbuja, en una caja de
 * 1514×489. Las letras van en el color del texto y la cola en el de la
 * marca: así se tiñe con ella. La «a» trae su hueco (`evenodd`).
 */
export const LETRERO = {
  ancho: 1514,
  alto: 489,
  letras:
    'M122.3 88.4C196.8 78.8 253 130.8 267.9 201.2C237.3 201.3 206.8 201.1 176.3 200.7C157.9 170.6 121 163.7 99.7 194.9C76 229.8 98.7 291.7 147.5 278.2C162.8 274 170.4 265.2 177.8 252C187.9 252.1 265 251.4 268.7 253.1L268.7 256.2C249 355.9 134.6 402.2 54.2 340.4C24.7 317.4 5.6 283.6 1.1 246.5C-8.6 167.9 43 98 122.3 88.4ZM283.4 0L374.8 0.4C374.5 36.3 373.4 78.2 375 113.6L375.9 112.7C433.3 53.8 526.8 94.6 540.9 170.4C546.2 198.8 544.2 230 544.1 259L544 365.9L452.8 365.6L452.3 293.8C452.1 269.6 452.5 245.4 452.1 221.3C452 208.5 449.3 196 440.6 186.1C435.2 179.9 428 175.9 419.8 175.8C388.9 175.2 372 202 373 230.4C373.1 242.6 372.9 256.4 372.9 269L372.9 365.4C343.4 366.2 312.3 365.9 282.7 365.9L282.9 139.5C283 94 282.1 45.3 283.4 0ZM686.6 85.4C720 84.1 733.6 92.3 759.8 109.9L760 92L842.6 92L842.8 365.9L758 365.9L757.6 346.9C751.6 350.9 746.3 354.2 740 357.9C727.8 364.5 714.4 368.6 700.5 369.8C667.2 372.6 632.2 360.3 606.9 338.7C577.8 313.5 560 277.8 557.4 239.5C551.3 159.3 604.9 90.7 686.6 85.4ZM693.2 178.4C721 173.9 747.1 193 751.3 220.8C755.5 248.6 736.2 274.5 708.4 278.5C680.9 282.4 655.4 263.4 651.2 236C647.1 208.5 665.8 182.8 693.2 178.4ZM878 22.5C907.7 21.8 939 22.3 968.8 22.6L969 92.2L1033 92.1L1033.2 175C1012 174.8 990.8 174.8 969.6 174.9C969.8 191.6 969.7 208.4 969.7 225.1C969.8 243.3 969.7 265.2 986.3 276.8C1000.8 286.9 1018.2 284.3 1034.3 281.5L1034.5 301.2C1035.4 321.5 1035.2 344 1035.3 364.5C1025.7 366.1 1016 367 1006.3 367.1C972 367.3 940.3 356.9 915.2 332.9C871.5 291.1 879.4 230.3 878.7 174.8C878.1 124 877.9 73.2 878 22.5ZM1127.6 23.5L1157 23.7L1157.2 92L1217.8 92C1217.9 119.4 1217.8 146.9 1217.5 174.3C1200.3 175.3 1176.7 174.7 1158.9 174.8C1158.8 199 1157.5 224.6 1158.9 248.6C1161.1 285 1190.5 287.4 1218.1 284.9C1218.6 312.1 1219.2 339.2 1220.1 366.3C1140.4 380.7 1075.5 336.4 1070.8 253.8C1069 222.9 1069.3 192.4 1069.1 161.4L1068 23.6L1127.6 23.5ZM1226.1 92C1257.3 91.3 1291.3 92 1322.8 92L1354.6 196.2C1360.5 215.8 1367.2 240.7 1373.8 259.4C1388.4 204.6 1407.2 146 1424.7 92.2L1514 92.2C1505.3 118.9 1495.9 145.1 1487.2 171.8C1479.8 191.3 1470.9 220.6 1464.1 241.3C1450.5 282.7 1436.5 324 1422.3 365.1L1321.2 364.1L1251.9 164.7C1243.4 140.8 1235.3 115.4 1226.1 92Z',
  cola: 'M1322.6 375.8C1354.3 376.3 1387 376 1418.8 376C1413.3 396.1 1405.6 414.9 1395.6 433.1C1365.5 487.7 1309.7 500.5 1256.6 469.5C1249.6 465 1244 458.9 1235.7 460C1217.2 462.5 1202.1 475.7 1190.9 489.1C1199.8 453.6 1222.2 405.2 1265.4 402.3C1282.9 401.1 1296.8 412.3 1308.9 423.7C1314.5 408.5 1318.7 391.5 1322.6 375.8Z',
};

/**
 * Con el nombre de fábrica y sin logo propio, la barra y el login pintan el
 * letrero; con tu nombre o tu logo, el cuadro y el nombre en letra.
 */
export function usaLetrero(i: Pick<Identidad, 'nombre' | 'logo'>): boolean {
  return !i.logo && i.nombre === DE_FABRICA.nombre;
}
