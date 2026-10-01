import Link from 'next/link';
import { ChevronLeft, Eye } from 'lucide-react';
import { leerGuia } from '@/lib/guia/estado';
import { moduloPorId, type ModuloId } from '@/lib/guia/pasos';
import { PageHeader } from '@/components/shell/page-header';
import { botonClases } from '@/components/ui/button';
import { Checklist } from './checklist';
import { VistaPrevia } from './vistas';

/**
 * Una sección del panel en modo guía: qué es, cómo se ve ya funcionando y la
 * lista de lo que le falta. En el modo guía es la pantalla de la sección misma
 * (`/inbox`, `/automations`…); ya conectado, vive en `/primeros-pasos/<id>`.
 *
 * `children`: lo de la sección que ya funciona sin Firebase (en Ajustes, la
 * marca). Va arriba de la vista previa y los pasos.
 */
export async function PantallaModulo({
  id,
  volver,
  children,
}: {
  id: ModuloId;
  volver?: boolean;
  children?: React.ReactNode;
}) {
  const guia = await leerGuia();
  const modulo = moduloPorId(id);
  const pasos = modulo.pasos.map((p) => guia.pasos[p]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        title={modulo.titulo}
        description={modulo.que}
        action={
          volver ? (
            <Link href={modulo.ruta} className={botonClases({ variant: 'secondary' })}>
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              Ir a {modulo.titulo}
            </Link>
          ) : undefined
        }
      />
      <div className="px-pagina max-w-[920px] space-y-6 pb-12 xl:max-w-[940px]">
        {!guia.conectado && (
          <div className="tarjeta flex items-start gap-3 rounded-card px-4 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent">
              <Eye className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </span>
            <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-muted">
              <span className="block font-semibold text-txt">Así se ve {modulo.titulo} cuando ya funciona.</span>
              Este panel todavía no está conectado a tu Firebase: abajo están los pasos, en orden. Los que el sistema
              puede revisar se marcan solos; los demás los palomeas tú.
            </p>
          </div>
        )}
        {children}
        <VistaPrevia modulo={id} />
        <Checklist pasos={pasos} appUrl={guia.appUrl} titulo={`Para que ${modulo.titulo} funcione`} />
      </div>
    </div>
  );
}
