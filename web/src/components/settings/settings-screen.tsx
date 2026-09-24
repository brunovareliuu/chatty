'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, Copy, ExternalLink, ListChecks, Plug, Server, TriangleAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/lib/client/accounts-context';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InstagramIcon } from '@/components/ui/instagram-icon';
import { PageHeader } from '@/components/shell/page-header';
import { NotificacionesSettings } from './notificaciones-settings';

export type SetupStatus = {
  metaAppId: boolean;
  metaAppSecret: boolean;
  verifyToken: boolean;
  encryptionKey: boolean;
  cronSecret: boolean;
  appUrl: string | null;
};

const CHECKS: { key: keyof SetupStatus; label: string; hint: string }[] = [
  { key: 'metaAppId', label: 'META_APP_ID', hint: 'ID de tu app en Meta for Developers' },
  { key: 'metaAppSecret', label: 'META_APP_SECRET', hint: 'Secreto de la app (firma los webhooks)' },
  { key: 'verifyToken', label: 'META_WEBHOOK_VERIFY_TOKEN', hint: 'Cadena que inventas tú; Meta la repite al verificar' },
  { key: 'encryptionKey', label: 'TOKEN_ENCRYPTION_KEY', hint: 'Cifra los tokens de Instagram en Firestore' },
  { key: 'cronSecret', label: 'CRON_SECRET', hint: 'Protege el endpoint que despierta los flujos' },
];

/** Ajustes crecía como una lista sola; ahora cada tema tiene su pestaña. */
const PESTANAS = [
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'instagram', label: 'Instagram', icon: InstagramIcon },
  { id: 'sistema', label: 'Sistema', icon: Server },
] as const;
type Pestana = (typeof PESTANAS)[number]['id'];

function esPestana(v: string | null): v is Pestana {
  return PESTANAS.some((p) => p.id === v);
}

export function SettingsScreen({
  setup,
  connected,
  error,
  tabInicial = null,
}: {
  setup: SetupStatus;
  connected: string | null;
  error: string | null;
  /** `?tab=notificaciones`: los avisos del celular abren directo aquí. */
  tabInicial?: string | null;
}) {
  const { accounts } = useAccounts();
  // Si Meta acaba de devolvernos aquí, la pestaña útil es Instagram.
  const [tab, setTab] = useState<Pestana>(
    connected || error ? 'instagram' : esPestana(tabInicial) ? tabInicial : 'notificaciones',
  );
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  // El render debe ser puro: fijamos "ahora" una vez al montar.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (connected) toast.success(`@${connected} conectada`);
    if (error) toast.error(error);
    if (connected || error) {
      // Limpiamos la query para que un refresh no repita el aviso.
      window.history.replaceState({}, '', '/settings');
    }
  }, [connected, error]);

  const webhookUrl = setup.appUrl ? `${setup.appUrl}/api/webhooks/instagram` : null;
  const redirectUri = setup.appUrl ? `${setup.appUrl}/api/ig/callback` : null;
  const ready = CHECKS.every((c) => setup[c.key]) && Boolean(setup.appUrl);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiada`);
    } catch {
      toast.error('Tu navegador bloqueó el portapapeles');
    }
  }

  async function disconnect(accountId: string, username: string) {
    if (!confirm(`¿Desconectar @${username}? Dejarán de llegar mensajes de esta cuenta.`)) return;
    setDisconnecting(accountId);
    try {
      const res = await fetch('/api/ig/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      if (!res.ok) throw new Error('No se pudo desconectar');
      toast.success(`@${username} desconectada`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al desconectar');
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <>
      <PageHeader title="Ajustes" description="Avisos al celular, correo, conexión con Meta y estado del despliegue." />

      <div className="border-b border-border px-4 md:px-6">
        <div className="flex gap-1 overflow-x-auto">
          {PESTANAS.map((p) => {
            const activa = tab === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setTab(p.id)}
                className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[14px] font-semibold whitespace-nowrap transition-colors ${
                  activa
                    ? 'border-accent text-txt'
                    : 'border-transparent text-muted hover:text-txt'
                }`}
              >
                <p.icon className="h-4 w-4" />
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 md:px-6">
        {tab === 'notificaciones' && <NotificacionesSettings />}

        {tab === 'instagram' && (
          <>
        {/* --- Cuentas conectadas --- */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-bold tracking-[0.4px] text-muted uppercase">
            Cuentas de Instagram
          </h2>

          {accounts.length === 0 && (
            <div className="rounded-card border border-dashed border-border px-5 py-8 text-center">
              <InstagramIcon className="mx-auto h-8 w-8 text-faint" />
              <p className="mt-3 text-[15px] font-semibold">Ninguna cuenta conectada</p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
                Necesitas una cuenta profesional (Empresa o Creador) con los mensajes habilitados
                para herramientas externas.
              </p>
              <a
                href="/api/ig/connect"
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[14px] font-semibold text-accent-fg transition-opacity hover:opacity-90 aria-disabled:pointer-events-none aria-disabled:opacity-40"
                aria-disabled={!ready}
              >
                <Plug className="h-4 w-4" />
                Conectar Instagram
              </a>
              {!ready && (
                <p className="mt-2 text-[12px] text-warn">
                  Completa primero la configuración de abajo.
                </p>
              )}
            </div>
          )}

          {accounts.map((a) => {
            const daysLeft = Math.floor((a.tokenExpiresAt - now) / 86400000);
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3"
              >
                <Avatar src={a.profilePictureUrl} name={a.username} size={42} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[15px] font-semibold">@{a.username}</p>
                    {a.needsReconnect ? (
                      <Badge tone="neg">
                        <TriangleAlert className="h-3 w-3" />
                        Reconectar
                      </Badge>
                    ) : (
                      <Badge tone="pos">Activa</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted">
                    Token válido {daysLeft > 0 ? `${daysLeft} días más` : 'vencido'} · se renueva solo
                  </p>
                  {a.lastError && (
                    <p className="mt-1 text-[12px] leading-snug text-warn">{a.lastError}</p>
                  )}
                </div>

                <a
                  href="/api/ig/connect"
                  className="rounded-xl px-3 py-2 text-[13px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-txt"
                >
                  Reconectar
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-neg hover:bg-neg/10 hover:text-neg"
                  loading={disconnecting === a.id}
                  onClick={() => disconnect(a.id, a.username)}
                >
                  Desconectar
                </Button>
              </div>
            );
          })}

          {accounts.length > 0 && (
            <a
              href="/api/ig/connect"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-surface-2 px-4 text-[14px] font-semibold transition-colors hover:bg-border"
            >
              <Plug className="h-4 w-4" />
              Conectar otra cuenta
            </a>
          )}
        </section>

        {/* --- Datos para el panel de Meta --- */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-bold tracking-[0.4px] text-muted uppercase">
            Datos para el panel de Meta
          </h2>

          <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            <CopyRow
              label="URL de devolución de llamada (webhook)"
              value={webhookUrl}
              onCopy={copy}
            />
            <CopyRow label="URI de redireccionamiento OAuth" value={redirectUri} onCopy={copy} />
          </div>

          <a
            href="https://developers.facebook.com/apps"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
          >
            Abrir Meta for Developers
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>
          </>
        )}

        {/* --- Estado de la configuración --- */}
        {tab === 'sistema' && (
        <section className="space-y-3 pb-6">
          <h2 className="text-[13px] font-bold tracking-[0.4px] text-muted uppercase">
            Variables de entorno
          </h2>

          <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            {CHECKS.map((check) => {
              const ok = Boolean(setup[check.key]);
              return (
                <div key={check.key} className="flex items-center gap-3 px-4 py-2.5">
                  <div
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                      ok ? 'bg-pos/15 text-pos' : 'bg-neg/15 text-neg'
                    }`}
                  >
                    {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[13px] font-medium">{check.label}</p>
                    <p className="text-[12px] text-muted">{check.hint}</p>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center gap-3 px-4 py-2.5">
              <div
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                  setup.appUrl ? 'bg-pos/15 text-pos' : 'bg-neg/15 text-neg'
                }`}
              >
                {setup.appUrl ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[13px] font-medium">APP_URL</p>
                <p className="truncate text-[12px] text-muted">
                  {setup.appUrl ?? 'La URL pública del despliegue'}
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/primeros-pasos"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-surface-2 px-4 text-[14px] font-semibold transition-colors hover:bg-border"
          >
            <ListChecks className="h-4 w-4" />
            Ver los primeros pasos
          </Link>
        </section>
        )}
      </div>
    </>
  );
}

function CopyRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string | null;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-muted">{label}</p>
        <p className="mt-0.5 truncate font-mono text-[13px]">
          {value ?? <span className="text-faint">Define APP_URL para verla</span>}
        </p>
      </div>
      {value && (
        <button
          onClick={() => onCopy(value, label)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-txt"
          aria-label={`Copiar ${label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
