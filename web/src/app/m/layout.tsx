import type { Metadata, Viewport } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { firebaseListo } from '@/lib/instalacion';
import { AuthGuard } from '@/lib/client/auth-guard';
import { AccountsProvider } from '@/lib/client/accounts-context';
import { BarraTabs } from '@/components/movil/ui/tabs';
import { RegistraSw } from '@/components/movil/registra-sw';
import './movil.css';

/**
 * La app del celular. Es otra app dentro del mismo panel: su propio armazón,
 * su propia navegación y su propio juego de colores (los de iOS), pero el
 * mismo cerebro — las mismas consultas a Firestore, la misma sesión y los
 * mismos avisos push que el escritorio. Por eso aquí cabe TODO lo del panel
 * sin reescribirlo.
 *
 * Vive en `/m` y no en un grupo de rutas porque `(app)` y esto son hermanos:
 * lo que entra aquí no debe heredar la barra lateral ni el marco del panel.
 */

export const dynamic = 'force-dynamic';

// Sin título propio: hereda el nombre del panel (Ajustes › Marca) del layout raíz.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // La app no hace zoom: es una app, no una página.
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    // El color de la barra de estado: el gris de iOS arriba, negro en oscuro.
    { media: '(prefers-color-scheme: light)', color: '#f2f2f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default async function LayoutMovil({ children }: { children: React.ReactNode }) {
  // Sin Firebase, el modo guía (que también se ve bien en el teléfono).
  if (!firebaseListo()) redirect('/primeros-pasos');
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <AuthGuard>
      <AccountsProvider>
        <div className="movil flex h-dvh flex-col overflow-hidden">
          <RegistraSw />
          <main className="min-h-0 flex-1">{children}</main>
          <BarraTabs />
        </div>
      </AccountsProvider>
    </AuthGuard>
  );
}
