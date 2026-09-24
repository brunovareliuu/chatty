import { PantallaInstagramMovil } from '@/components/movil/instagram/pantalla';
import { leerRango } from '@/lib/estadisticas/tipos';

/** `?rango=hoy|ayer|7|28|90` abre directo en ese periodo. */
export default async function Page({ searchParams }: { searchParams: Promise<{ rango?: string }> }) {
  const params = await searchParams;
  return <PantallaInstagramMovil rangoInicial={leerRango(params.rango)} />;
}
