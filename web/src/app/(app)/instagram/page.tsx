import { PantallaInstagram } from '@/components/estadisticas/pantalla-instagram';
import { leerRango } from '@/lib/estadisticas/tipos';
import { firebaseListo } from '@/lib/instalacion';
import { PantallaModulo } from '@/components/guia/pantalla-modulo';
import { AvisoModulo } from '@/components/guia/aviso-modulo';

export const dynamic = 'force-dynamic';

/**
 * Meta regresa aquí con `?ig_connected=` o `?ig_error=` si se reconectó desde
 * el tablero. `?rango=hoy|ayer|7|28|90` abre directo en ese periodo.
 */
export default async function InstagramPage({
  searchParams,
}: {
  searchParams: Promise<{ ig_connected?: string; ig_error?: string; rango?: string }>;
}) {
  if (!firebaseListo()) return <PantallaModulo id="estadisticas" />;
  const params = await searchParams;
  return (
    <>
      <AvisoModulo id="estadisticas" />
      <PantallaInstagram
        conectada={params.ig_connected ?? null}
        error={params.ig_error ?? null}
        rangoInicial={leerRango(params.rango)}
      />
    </>
  );
}
