// Regenera los iconos del panel (favicon, app del celular) desde el logo de
// scripts/logo/marca.svg: fondo negro #0a0a0b y el logo en blanco. Si cambias
// ese SVG por el tuyo (un solo color, `currentColor`), corre esto y la app
// instalada lo usa.
//
//   node scripts/iconos.mjs
//
// favicon-32, icono-192, icono-512 y src/app/icon.png: cuadro negro con
// esquinas redondeadas. apple-touch-icon e icono-maskable: a sangre, porque iOS y
// Android les ponen su propia máscara; el maskable deja el logo dentro de la zona
// segura (círculo del 80 %).
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const WEB = join(import.meta.dirname, '..');
const LOGO = join(WEB, 'scripts/logo/marca.svg');
const SALIDA = join(WEB, 'public/iconos');
const NEGRO = '#0a0a0b';

// El SVG se pinta de blanco y se recorta su margen para medirlo de verdad.
const svg = (await readFile(LOGO, 'utf8')).replaceAll('currentColor', '#ffffff');
const logo = await sharp(Buffer.from(svg), { density: 1200 }).trim().png().toBuffer();

async function icono(nombre, lado, { redondo, logoFraccion, destino = SALIDA }) {
  const radio = redondo ? Math.round(lado * 0.2237) : 0;
  const fondo = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}"><rect width="${lado}" height="${lado}" rx="${radio}" ry="${radio}" fill="${NEGRO}"/></svg>`,
  );
  const tam = Math.round(lado * logoFraccion);
  const marca = await sharp(logo).resize(tam, tam, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp(fondo)
    .composite([{ input: marca, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(join(destino, nombre));
  console.log('✓', nombre, `${lado}×${lado}`);
}

await icono('favicon-32.png', 32, { redondo: true, logoFraccion: 0.76 });
await icono('icono-192.png', 192, { redondo: true, logoFraccion: 0.74 });
await icono('icono-512.png', 512, { redondo: true, logoFraccion: 0.74 });
await icono('apple-touch-icon.png', 180, { redondo: false, logoFraccion: 0.7 });
await icono('icono-maskable-512.png', 512, { redondo: false, logoFraccion: 0.54 });
await icono('icon.png', 256, { redondo: true, logoFraccion: 0.74, destino: join(WEB, 'src/app') });
