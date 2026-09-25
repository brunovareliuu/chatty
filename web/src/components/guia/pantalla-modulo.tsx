import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { leerGuia } from '@/lib/guia/estado';
import { moduloPorId, type ModuloId } from '@/lib/guia/pasos';
import { PageHeader } from '@/components/shell/page-header';
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
            <Link
              href={modulo.ruta}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-surface-2 px-3.5 text-[13.5px] font-semibold transition-colors hover:bg-border"
            >
              <ArrowLeft className="h-4 w-4" />
              Ir a {modulo.titulo}
            </Link>
          ) : undefined
        }
      />
      <div className="mx-auto w-full max-w-[880px] space-y-5 px-4 py-5 md:px-6 md:py-6">
        {!guia.conectado && (
          <p className="rounded-card border border-accent/30 bg-accent-soft px-4 py-3 text-[13.5px] leading-relaxed">
            <span className="font-semibold">Así se ve {modulo.titulo} cuando ya funciona.</span> Este panel todavía no
            está conectado a tu Firebase: abajo están los pasos, en orden. Los que el sistema puede revisar se marcan
            solos; los demás los palomeas tú.
          </p>
        )}
        {children}
        <VistaPrevia modulo={id} />
        <Checklist pasos={pasos} appUrl={guia.appUrl} titulo={`Para que ${modulo.titulo} funcione`} />
      </div>
    </div>
  );
}
