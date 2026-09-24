import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { firebaseListo } from '@/lib/instalacion';

export const dynamic = 'force-dynamic';

/**
 * La raíz reparte según el aparato: en el celular abre la app (`/m`) y en la
 * computadora el panel de siempre. Importa porque la app instalada arranca en
 * `/` — es el `start_url` del manifest —, así que tocar el icono del iPhone
 * tiene que llevar a la app, no al panel de escritorio encogido.
 *
 * Desde el celular se puede entrar igual al panel completo: Más › Ver el panel
 * de escritorio. Esa dirección ya no pasa por aquí.
 *
 * Sin Firebase configurado el panel se abre en modo guía, en Primeros pasos.
 */
export default async function Home() {
  if (!firebaseListo()) redirect('/primeros-pasos');
  const ua = (await headers()).get('user-agent') ?? '';
  const esCelular = /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua);
  redirect(esCelular ? '/m' : '/inbox');
}
