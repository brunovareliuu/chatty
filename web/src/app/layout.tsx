import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { firebaseListo } from '@/lib/instalacion';
import { leerIdentidad } from '@/lib/identidad/servidor';
import { SCRIPT_LOCAL, cssDe } from '@/lib/identidad/tipos';

/**
 * El nombre y los iconos salen de la identidad del panel (Ajustes › Marca). El
 * `?v=` cambia cada vez que se guarda, así el navegador no se queda con el
 * ícono de antes. Los iconos los pinta `app/iconos/[archivo]/route.tsx`.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { nombre, actualizadoEn } = await leerIdentidad();
  const v = actualizadoEn ? `?v=${actualizadoEn}` : '';
  return {
    title: { default: nombre, template: `%s · ${nombre}` },
    applicationName: nombre,
    description: `${nombre}: la bandeja y las automatizaciones de tus DMs de Instagram.`,
    robots: { index: false, follow: false },
    // Instalable como app en el celular: Next enlaza solo el manifest de
    // app/manifest.ts (sus iconos llevan el mismo `?v=`).
    // `black-translucent`: el contenido llega hasta arriba y la hora se pinta
    // encima. Cada pantalla se aparta sola con env(safe-area-inset-top).
    appleWebApp: { capable: true, title: nombre, statusBarStyle: 'black-translucent' },
    icons: {
      icon: [
        { url: `/iconos/favicon-32.png${v}`, sizes: '32x32', type: 'image/png' },
        { url: `/iconos/icono-192.png${v}`, sizes: '192x192', type: 'image/png' },
      ],
      apple: `/iconos/apple-touch-icon.png${v}`,
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Deja que el contenido llegue hasta los bordes del iPhone; la barra
  // inferior se aparta sola con env(safe-area-inset-bottom).
  viewportFit: 'cover',
  // Con el teclado abierto, el contenido se encoge en vez de quedar tapado (Android; iOS lo ignora).
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0b' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const identidad = await leerIdentidad();
  // Sin Firebase (modo guía) la marca vive en el navegador: la pone un script
  // antes de pintar. Ya conectado, el servidor la sabe y la manda en el <head>.
  const local = !firebaseListo();

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {local ? (
          <script dangerouslySetInnerHTML={{ __html: SCRIPT_LOCAL }} />
        ) : (
          <style id="marca" dangerouslySetInnerHTML={{ __html: cssDe(identidad.acento) }} />
        )}
      </head>
      <body className="antialiased">
        <Providers identidad={identidad} local={local}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
