'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { signOut } from 'firebase/auth';
import { Bell, ListChecks, Monitor, MessageCircle, Moon, Palette, Settings, Sparkles, Sun, TrendingUp, Users, Zap } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { useAccounts } from '@/lib/client/accounts-context';
import { Avatar } from '@/components/ui/avatar';
import { Pantalla } from '@/components/movil/ui/pantalla';
import { Seccion, Fila, FilaBoton, FilaEnlace, IconoFila } from '@/components/movil/ui/lista';

/** Sol en oscuro, luna en claro: lo decide el CSS desde el primer pintado. */
function IconoTema({ className, strokeWidth }: { className?: string; strokeWidth?: number }) {
  return (
    <>
      <Sun className={cn(className, 'hidden dark:block')} strokeWidth={strokeWidth} />
      <Moon className={cn(className, 'dark:hidden')} strokeWidth={strokeWidth} />
    </>
  );
}

/**
 * Más — el cajón con lo que no cabe en las cuatro pestañas. La regla es que
 * desde aquí se llega a cualquier rincón del panel.
 */
export function PantallaMas() {
  const router = useRouter();
  const { account } = useAccounts();
  const { resolvedTheme, setTheme } = useTheme();

  async function salir() {
    await fetch('/api/auth/session', { method: 'DELETE' });
    await signOut(auth);
    router.replace('/login');
  }

  return (
    <Pantalla titulo="Más">
      {account && (
        <Seccion>
          <Fila
            izquierda={<Avatar src={account.profilePictureUrl} name={account.username} size={29} />}
            titulo={`@${account.username}`}
            subtitulo={account.needsReconnect ? 'Necesita reconexión' : 'Cuenta conectada'}
            ultima
          />
        </Seccion>
      )}

      <Seccion titulo="Instagram">
        <FilaEnlace href="/m/bandeja" izquierda={<IconoFila icon={MessageCircle} tono="bg-pos" />} titulo="Bandeja" />
        <FilaEnlace href="/m/asistente" izquierda={<IconoFila icon={Sparkles} tono="bg-accent text-accent-fg" />} titulo="Asistente" />
        <FilaEnlace href="/m/automatizaciones" izquierda={<IconoFila icon={Zap} tono="bg-warn" />} titulo="Automatizaciones" />
        <FilaEnlace href="/m/contactos" izquierda={<IconoFila icon={Users} tono="bg-muted" />} titulo="Contactos" />
        <FilaEnlace href="/m/instagram" izquierda={<IconoFila icon={TrendingUp} tono="bg-accent text-accent-fg" />} titulo="Estadísticas" subtitulo="Seguidores, alcance y tus posts" ultima />
      </Seccion>

      <Seccion titulo="Ajustes">
        <FilaEnlace href="/primeros-pasos" izquierda={<IconoFila icon={ListChecks} tono="bg-accent text-accent-fg" />} titulo="Primeros pasos" subtitulo="Lo que le falta a cada sección" />
        <FilaEnlace href="/m/ajustes" izquierda={<IconoFila icon={Bell} tono="bg-neg" />} titulo="Notificaciones" />
        <FilaEnlace href="/m/ajustes?tab=instagram" izquierda={<IconoFila icon={Settings} tono="bg-muted" />} titulo="Cuenta y sistema" />
        {/* La marca se elige en el panel: ahí está la vista previa en claro y en oscuro. */}
        <FilaEnlace
          href="/settings?tab=marca"
          izquierda={<IconoFila icon={Palette} tono="bg-accent text-accent-fg" />}
          titulo="Marca"
          subtitulo="Nombre, logo y color"
        />
        <FilaBoton
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          izquierda={<IconoFila icon={IconoTema} tono="bg-txt text-bg" />}
          titulo="Apariencia"
          valor={
            // Con clases `dark:`, no con `resolvedTheme`: el servidor no sabe el tema.
            <>
              <span className="dark:hidden">Claro</span>
              <span className="hidden dark:inline">Oscuro</span>
            </>
          }
          ultima
        />
      </Seccion>

      <Seccion
        titulo="El panel completo"
        pie="El constructor de flujos pide pantalla grande: vive allá. Se abre en la misma sesión."
      >
        <FilaEnlace
          href="/inbox"
          izquierda={<IconoFila icon={Monitor} tono="bg-muted" />}
          titulo="Ver el panel de escritorio"
          ultima
        />
      </Seccion>

      <Seccion>
        <FilaBoton onClick={salir} titulo="Cerrar sesión" peligro ultima className="justify-center" />
      </Seccion>
    </Pantalla>
  );
}
