import type { Metadata } from 'next';
import { leerGuia } from '@/lib/guia/estado';
import { GRUPOS_DE_PASOS, MODULOS } from '@/lib/guia/pasos';
import { Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { Checklist } from '@/components/guia/checklist';
import { TarjetasModulos } from '@/components/guia/tarjetas-modulos';
import { resumen } from '@/components/guia/shell-guia';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Primeros pasos' };

/**
 * El checklist de todo: lo que falta para instalarlo, para empezar a usarlo y
 * lo opcional, y cómo va cada sección. En modo guía es lo primero que se abre.
 */
export default async function PrimerosPasosPage() {
  const guia = await leerGuia();
  const tarjetas = MODULOS.map((m) => ({
    id: m.id,
    titulo: m.titulo,
    que: m.que,
    href: guia.conectado ? `/primeros-pasos/${m.id}` : m.ruta,
    pasos: m.pasos.map((p) => resumen(guia.pasos[p])),
  }));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        title="Primeros pasos"
        description={
          guia.conectado
            ? 'Lo que falta para que cada sección funcione completa. Lo que el panel puede revisar se marca solo.'
            : 'Tu propio ManyChat para Instagram. Todavía no está conectado a nada: aquí está todo lo que hay que hacer, en orden.'
        }
      />
      <div className="px-pagina max-w-[920px] space-y-8 pb-12 xl:max-w-[940px]">
        {!guia.conectado && (
          <div className="tarjeta flex items-start gap-3.5 rounded-card p-4 md:p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-accent text-accent-fg">
              <Sparkles className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold tracking-[-0.012em]">Esto ya es el sistema.</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
                A la izquierda están sus secciones: entra a cualquiera para ver cómo se ve funcionando y qué le falta.
                Los pasos que el panel puede revisar se marcan solos en cuanto están; los demás los palomeas tú y se
                quedan guardados en este navegador. Cuando pongas las llaves de tu Firebase, aparece el login.
              </p>
            </div>
          </div>
        )}

        <section className="space-y-2.5">
          <h2 className="px-1 text-[15px] font-semibold tracking-[-0.012em]">Las secciones</h2>
          <TarjetasModulos modulos={tarjetas} />
        </section>

        {GRUPOS_DE_PASOS.map((grupo) => (
          <Checklist
            key={grupo.titulo}
            titulo={grupo.titulo}
            pasos={grupo.pasos.map((p) => guia.pasos[p])}
            appUrl={guia.appUrl}
          />
        ))}

        <p className="px-1 text-[12.5px] leading-relaxed text-faint">
          Cada paso tiene su guía larga en la carpeta <code className="font-mono text-txt">docs/</code> del repo (empieza
          por <code className="font-mono text-txt">docs/README.md</code>), y si algo falla,{' '}
          <code className="font-mono text-txt">docs/solucion-de-problemas.md</code>.
        </p>
      </div>
    </div>
  );
}
