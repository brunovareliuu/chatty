import type { MetadataRoute } from 'next';

/**
 * Lo que hace que el panel se instale como app en el celular (Compartir →
 * «Agregar a inicio» en iPhone; «Instalar» en Android). Next lo sirve en
 * /manifest.webmanifest. Los iconos salen de public/iconos.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Chatty',
    short_name: 'Chatty',
    description: 'Tu propio ManyChat: la bandeja y las automatizaciones de tus DMs de Instagram.',
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
      { src: '/iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/iconos/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Mantener pulsado el icono abre estos atajos. Apuntan a la app del
    // celular: el manifest solo se instala desde un teléfono.
    shortcuts: [
      { name: 'Bandeja', url: '/m/bandeja', icons: [{ src: '/iconos/icono-192.png', sizes: '192x192' }] },
      { name: 'Automatizaciones', url: '/m/automatizaciones', icons: [{ src: '/iconos/icono-192.png', sizes: '192x192' }] },
    ],
  };
}
