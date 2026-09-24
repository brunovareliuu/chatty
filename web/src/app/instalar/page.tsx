import { redirect } from 'next/navigation';

/** La guía de instalación ahora vive dentro del panel, en Primeros pasos. */
export default function InstalarPage() {
  redirect('/primeros-pasos');
}
