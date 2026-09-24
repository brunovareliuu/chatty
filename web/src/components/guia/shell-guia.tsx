import { leerGuia, type PasoResuelto } from '@/lib/guia/estado';
import { GRUPOS_DE_PASOS, MODULOS } from '@/lib/guia/pasos';
import { BarraGuia } from './barra-guia';
import type { Resumen } from './hechos';

/** Lo mínimo que necesitan los contadores del navegador: sin textos. */
export const resumen = (p: PasoResuelto): Resumen => ({ id: p.id, estado: p.estado, opcional: p.opcional });

/**
 * El armazón del panel en modo guía: la barra con todas las secciones y, a la
 * derecha, la sección abierta con sus pasos. No toca Firebase: sin él, el SDK
 * del navegador ni siquiera arranca.
 */
export async function ShellGuia({ children }: { children: React.ReactNode }) {
  const guia = await leerGuia();
  const entradas = MODULOS.map((m) => ({
    id: m.id,
    titulo: m.titulo,
    ruta: m.ruta,
    pasos: m.pasos.map((p) => resumen(guia.pasos[p])),
  }));
  const todos = GRUPOS_DE_PASOS.flatMap((g) => g.pasos).map((p) => resumen(guia.pasos[p]));

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg md:flex-row">
      <BarraGuia entradas={entradas} todos={todos} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
