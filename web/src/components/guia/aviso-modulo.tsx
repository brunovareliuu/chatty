import { leerGuia } from '@/lib/guia/estado';
import { moduloPorId, type ModuloId } from '@/lib/guia/pasos';
import { AvisoPasos } from './aviso-pasos';
import { resumen } from './shell-guia';

/** El aviso de pasos pendientes de una sección, ya con su estado del servidor. */
export async function AvisoModulo({ id }: { id: ModuloId }) {
  const guia = await leerGuia();
  const modulo = moduloPorId(id);
  return <AvisoPasos modulo={id} titulo={modulo.titulo} pasos={modulo.pasos.map((p) => resumen(guia.pasos[p]))} />;
}
