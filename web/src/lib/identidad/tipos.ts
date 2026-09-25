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
