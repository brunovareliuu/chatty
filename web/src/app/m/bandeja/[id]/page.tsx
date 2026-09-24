import { PantallaHilo } from '@/components/movil/bandeja/hilo';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PantallaHilo conversacionId={id} />;
}
