import { AsistenteScreen } from '@/components/asistente/asistente-screen';
import { firebaseListo } from '@/lib/instalacion';
import { PantallaModulo } from '@/components/guia/pantalla-modulo';
import { AvisoModulo } from '@/components/guia/aviso-modulo';

export const dynamic = 'force-dynamic';

export default function AsistentePage() {
  if (!firebaseListo()) return <PantallaModulo id="asistente" />;
  return (
    <>
      <AvisoModulo id="asistente" />
      <AsistenteScreen />
    </>
  );
}
