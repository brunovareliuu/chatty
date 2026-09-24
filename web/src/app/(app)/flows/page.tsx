import { redirect } from 'next/navigation';

/** Flujos y automatizaciones son una sola pantalla; la ruta vieja sigue viva por los enlaces guardados. */
export default function FlowsPage() {
  redirect('/automations');
}
