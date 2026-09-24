import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Chatty',
  applicationName: 'Chatty',
  description: 'Chatty: tu propio ManyChat. La bandeja y las automatizaciones de tus DMs de Instagram, en tu Firebase.',
  robots: { index: false, follow: false },
  // Instalable como app en el celular: manifest en app/manifest.ts, iconos en public/iconos.
  manifest: '/manifest.webmanifest',
    // `black-translucent`: el contenido llega hasta arriba y la hora se pinta
  // encima. Cada pantalla se aparta sola con env(safe-area-inset-top).
  appleWebApp: { capable: true, title: 'Chatty', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/iconos/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/iconos/apple-touch-icon.png',
  },
  formatDetection: { telephone: false },
};

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
