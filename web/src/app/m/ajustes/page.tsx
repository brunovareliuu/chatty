import { PantallaAjustes } from '@/components/movil/ajustes/pantalla';

export const dynamic = 'force-dynamic';

/**
 * El estado de la configuración se calcula en el servidor, igual que en
 * `/settings`: al celular solo viaja SI cada variable está puesta, nunca su
 * valor.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  const sistema = {
    metaAppId: Boolean(process.env.META_APP_ID),
    metaAppSecret: Boolean(process.env.META_APP_SECRET),
    verifyToken: Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN),
    encryptionKey: Boolean(process.env.TOKEN_ENCRYPTION_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
    appUrl: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? null,
  };

  return <PantallaAjustes sistema={sistema} tab={tab ?? null} />;
}
