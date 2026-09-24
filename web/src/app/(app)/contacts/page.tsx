import { ContactsScreen } from '@/components/contacts/contacts-screen';
import { firebaseListo } from '@/lib/instalacion';
import { PantallaModulo } from '@/components/guia/pantalla-modulo';
import { AvisoModulo } from '@/components/guia/aviso-modulo';

export const dynamic = 'force-dynamic';

export default function ContactsPage() {
  if (!firebaseListo()) return <PantallaModulo id="contactos" />;
  return (
    <>
      <AvisoModulo id="contactos" />
      <ContactsScreen />
    </>
  );
}
