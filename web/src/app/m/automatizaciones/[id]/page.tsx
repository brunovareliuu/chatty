import { PantallaAutomatizacion } from '@/components/movil/automatizaciones/detalle';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PantallaAutomatizacion id={id} />;
}
