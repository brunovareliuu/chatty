'use client';

import { usePathname } from 'next/navigation';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import type { Identidad } from '@/lib/identidad/tipos';
import { IdentidadProvider } from '@/components/identidad/proveedor';

export function Providers({
  children,
  identidad,
  local,
}: {
  children: React.ReactNode;
  identidad: Identidad;
  local: boolean;
}) {
  const pathname = usePathname();
  // En la app del celular los avisos van arriba: abajo los taparía la barra
  // de pestañas, que es lo que el dedo está a punto de tocar.
  const enMovil = pathname === '/m' || pathname.startsWith('/m/');

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <IdentidadProvider servidor={identidad} local={local}>
        {children}
      </IdentidadProvider>
      <Toaster
        position={enMovil ? 'top-center' : 'bottom-right'}
        toastOptions={{
          style: {
            background: 'var(--elevated)',
            color: 'var(--txt)',
            border: 'none',
            boxShadow: 'var(--shadow-float)',
            borderRadius: '14px',
          },
        }}
      />
    </ThemeProvider>
  );
}
