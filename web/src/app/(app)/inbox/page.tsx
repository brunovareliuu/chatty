import { InboxScreen } from '@/components/inbox/inbox-screen';
import { firebaseListo } from '@/lib/instalacion';
import { PantallaModulo } from '@/components/guia/pantalla-modulo';
import { AvisoModulo } from '@/components/guia/aviso-modulo';

export const dynamic = 'force-dynamic';

export default function InboxPage() {
  if (!firebaseListo()) return <PantallaModulo id="bandeja" />;
  return (
    <>
      <AvisoModulo id="bandeja" />
      <InboxScreen />
    </>
  );
}
