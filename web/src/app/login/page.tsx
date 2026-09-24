import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { firebaseListo } from '@/lib/instalacion';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // El formulario usa el SDK de Firebase del navegador: sin sus llaves truena.
  if (!firebaseListo()) redirect('/instalar');
  if (await getCurrentUser()) redirect('/inbox');
  return <LoginForm />;
}
