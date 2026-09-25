import type { MetadataRoute } from 'next';
import { leerIdentidad } from '@/lib/identidad/servidor';

// El nombre y los iconos cambian cuando se guarda la marca, no al construir.
export const dynamic = 'force-dynamic';

/**
 * Lo que hace que el panel se instale como app en el celular (Compartir →
 * «Agregar a inicio» en iPhone; «Instalar» en Android). Next lo sirve en
 * /manifest.webmanifest. Nombre e iconos salen de Ajustes › Marca; los iconos
 * los pinta `app/iconos/[archivo]/route.tsx`.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { nombre, actualizadoEn } = await leerIdentidad();
  const v = actualizadoEn ? `?v=${actualizadoEn}` : '';
  const icono = (archivo: string) => `/iconos/${archivo}${v}`;
  return {
    id: '/',
    name: nombre,
    short_name: nombre,
    description: `${nombre}: la bandeja y las automatizaciones de tus DMs de Instagram.`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // El color de la pantalla de carga de la app instalada. Es el gris de iOS
    // porque lo que se instala en el celular es la app (`/m`), no el panel.
    background_color: '#f2f2f7',
    theme_color: '#f2f2f7',
    lang: 'es',
    icons: [
      { src: icono('icono-192.png'), sizes: '192x192', type: 'image/png' },
      { src: icono('icono-512.png'), sizes: '512x512', type: 'image/png' },
      { src: icono('icono-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Mantener pulsado el icono abre estos atajos. Apuntan a la app del
    // celular: el manifest solo se instala desde un teléfono.
    shortcuts: [
      { name: 'Bandeja', url: '/m/bandeja', icons: [{ src: icono('icono-192.png'), sizes: '192x192' }] },
      { name: 'Automatizaciones', url: '/m/automatizaciones', icons: [{ src: icono('icono-192.png'), sizes: '192x192' }] },
    ],
  };
}
