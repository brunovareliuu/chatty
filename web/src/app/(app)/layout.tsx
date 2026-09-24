import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { firebaseListo } from '@/lib/instalacion';
import { leerGuia } from '@/lib/guia/estado';
import { GRUPOS_DE_PASOS } from '@/lib/guia/pasos';
import { ShellGuia, resumen } from '@/components/guia/shell-guia';
import { AuthGuard } from '@/lib/client/auth-guard';
import { AccountsProvider } from '@/lib/client/accounts-context';
import { Sidebar } from '@/components/shell/sidebar';
import { BarraMovil } from '@/components/shell/barra-movil';
import { Pwa } from '@/components/shell/pwa';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Sin Firebase no hay login posible: el panel se abre en modo guía, con sus
  // secciones y en cada una los pasos que le faltan.
  if (!firebaseListo()) return <ShellGuia>{children}</ShellGuia>;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const guia = await leerGuia();
  const pasos = GRUPOS_DE_PASOS.flatMap((g) => g.pasos).map((p) => resumen(guia.pasos[p]));

  return (
    <AuthGuard>
      <AccountsProvider>
        <div className="flex h-dvh overflow-hidden bg-bg">
          <Sidebar user={user} pasos={pasos} />
          {/* En celular la barra inferior es fija: el contenido le deja su alto y el área segura del iPhone. */}
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(60px+env(safe-area-inset-bottom))] md:pt-0 md:pb-0">
            <Pwa />
            {children}
          </main>
          <BarraMovil user={user} />
        </div>
      </AccountsProvider>
    </AuthGuard>
  );
}
