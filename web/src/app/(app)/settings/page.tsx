import { SettingsScreen } from '@/components/settings/settings-screen';

export const dynamic = 'force-dynamic';

/**
 * El estado de configuración se calcula en el servidor: solo viaja al cliente
 * si cada variable está puesta, nunca su valor.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ig_connected?: string; ig_error?: string; tab?: string }>;
}) {
  const params = await searchParams;

  const setup = {
    metaAppId: Boolean(process.env.META_APP_ID),
    metaAppSecret: Boolean(process.env.META_APP_SECRET),
    verifyToken: Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN),
    encryptionKey: Boolean(process.env.TOKEN_ENCRYPTION_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
    appUrl: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? null,
  };

  return (
    <SettingsScreen
      setup={setup}
      connected={params.ig_connected ?? null}
      error={params.ig_error ?? null}
      tabInicial={params.tab ?? null}
    />
  );
}
