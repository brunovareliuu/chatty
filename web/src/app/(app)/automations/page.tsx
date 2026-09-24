import { AutomationsScreen } from '@/components/automations/automations-screen';
import { firebaseListo } from '@/lib/instalacion';
import { PantallaModulo } from '@/components/guia/pantalla-modulo';
import { AvisoModulo } from '@/components/guia/aviso-modulo';

export const dynamic = 'force-dynamic';

export default function AutomationsPage() {
  if (!firebaseListo()) return <PantallaModulo id="automatizaciones" />;
  return (
    <>
      <AvisoModulo id="automatizaciones" />
      <AutomationsScreen />
    </>
  );
}
