import { notFound } from 'next/navigation';
import { PantallaModulo } from '@/components/guia/pantalla-modulo';
import { MODULOS, type ModuloId } from '@/lib/guia/pasos';

export const dynamic = 'force-dynamic';

/** Los pasos de una sección, también cuando el panel ya está conectado. */
export default async function PasosDeModuloPage({ params }: { params: Promise<{ modulo: string }> }) {
  const { modulo } = await params;
  if (!MODULOS.some((m) => m.id === modulo)) notFound();
  return <PantallaModulo id={modulo as ModuloId} volver />;
}
