'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, Copy, ExternalLink, ListChecks, Palette, Plug, Server, TriangleAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/lib/client/accounts-context';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Badge, Punto } from '@/components/ui/badge';
import { Button, botonClases } from '@/components/ui/button';
import { InstagramIcon } from '@/components/ui/instagram-icon';
import { Segmentado } from '@/components/ui/segmented';
import { PageHeader } from '@/components/shell/page-header';
import { Grupo, Seccion } from './grupo';
import { NotificacionesSettings } from './notificaciones-settings';
import { MarcaSettings } from './marca-settings';

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
  { id: 'marca', label: 'Marca', icon: Palette },
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
      <PageHeader
        title="Ajustes"
        description="Avisos al celular, conexión con Meta, tu marca y el estado del despliegue."
        toolbar={
          // En celular los segmentos no caben: el riel se desliza de lado.
          <div className="-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 md:mx-0 md:max-w-full md:px-0">
            <Segmentado
              value={tab}
              onChange={setTab}
              opciones={PESTANAS.map((p) => ({ value: p.id, label: p.label, icon: p.icon }))}
            />
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-pagina max-w-[820px] space-y-8 pb-10 xl:max-w-[860px]">
          {tab === 'notificaciones' && <NotificacionesSettings />}
          {tab === 'marca' && <MarcaSettings />}

          {tab === 'instagram' && (
            <>
              {/* --- Cuentas conectadas --- */}
              <Seccion titulo="Cuentas de Instagram">
                {accounts.length === 0 && (
                  <div className="tarjeta rounded-card px-5 py-10 text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-fill-soft">
                      <InstagramIcon className="h-6 w-6 text-muted" />
                    </div>
                    <p className="mt-3.5 text-[17px] font-semibold tracking-[-0.012em]">Ninguna cuenta conectada</p>
                    <p className="mx-auto mt-1 max-w-sm text-[13.5px] leading-snug text-muted">
                      Necesitas una cuenta profesional (Empresa o Creador) con los mensajes habilitados
                      para herramientas externas.
                    </p>
                    <a
                      href="/api/ig/connect"
                      className={cn(
                        botonClases({ variant: 'primary' }),
                        'mt-5 aria-disabled:pointer-events-none aria-disabled:opacity-40',
                      )}
                      aria-disabled={!ready}
                    >
                      <Plug className="h-4 w-4" />
                      Conectar Instagram
                    </a>
                    {!ready && (
                      <p className="mt-2.5 text-[12px] text-accent-ink">Completa primero la configuración de abajo.</p>
                    )}
                  </div>
                )}

                {accounts.length > 0 && (
                  <Grupo>
                    {accounts.map((a) => {
                      const daysLeft = Math.floor((a.tokenExpiresAt - now) / 86400000);
                      return (
                        <div key={a.id} className="flex flex-wrap items-center gap-3 py-3.5">
                          <Avatar src={a.profilePictureUrl} name={a.username} size={40} />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-[15px] font-semibold tracking-[-0.012em]">@{a.username}</p>
                              {a.needsReconnect ? (
                                <Badge tone="neg">
                                  <TriangleAlert className="h-3 w-3" />
                                  Reconectar
                                </Badge>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted">
                                  <Punto tone="pos" />
                                  Activa
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[12.5px] text-muted">
                              Token válido {daysLeft > 0 ? `${daysLeft} días más` : 'vencido'} · se renueva solo
                            </p>
                            {a.lastError && (
                              <p className="mt-1 text-[12px] leading-snug text-accent-ink">{a.lastError}</p>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <a href="/api/ig/connect" className={botonClases({ variant: 'secondary', size: 'sm' })}>
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
                        </div>
                      );
                    })}

                    {/* El «Agregar cuenta» de Ajustes: un renglón más, en el color de la marca. */}
                    <a
                      href="/api/ig/connect"
                      className="-mx-4 flex items-center gap-3 px-4 py-3 text-[14px] font-medium text-accent transition-colors hover:bg-fill-soft"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center">
                        <Plug className="h-[18px] w-[18px]" />
                      </span>
                      Conectar otra cuenta
                    </a>
                  </Grupo>
                )}
              </Seccion>

              {/* --- Datos para el panel de Meta --- */}
              <Seccion titulo="Datos para el panel de Meta">
                <Grupo>
                  <CopyRow label="URL de devolución de llamada (webhook)" value={webhookUrl} onCopy={copy} />
                  <CopyRow label="URI de redireccionamiento OAuth" value={redirectUri} onCopy={copy} />
                </Grupo>

                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-1 text-[13px] font-medium text-accent hover:underline"
                >
                  Abrir Meta for Developers
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Seccion>
            </>
          )}

          {/* --- Estado de la configuración --- */}
          {tab === 'sistema' && (
            <Seccion titulo="Variables de entorno">
              <Grupo>
                {CHECKS.map((check) => (
                  <EstadoVariable key={check.key} ok={Boolean(setup[check.key])} nombre={check.label}>
                    {check.hint}
                  </EstadoVariable>
                ))}
                <EstadoVariable ok={Boolean(setup.appUrl)} nombre="APP_URL">
                  <span className="block truncate">{setup.appUrl ?? 'La URL pública del despliegue'}</span>
                </EstadoVariable>
              </Grupo>

              <Link href="/primeros-pasos" className={cn(botonClases({ variant: 'secondary' }), 'mt-1')}>
                <ListChecks className="h-4 w-4" />
                Ver los primeros pasos
              </Link>
            </Seccion>
          )}
        </div>
      </div>
    </>
  );
}

/** Un renglón de Sistema: la palomita verde o la tacha roja, el nombre de la variable y para qué sirve. */
function EstadoVariable({ ok, nombre, children }: { ok: boolean; nombre: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className={cn(
          'grid h-6 w-6 shrink-0 place-items-center rounded-full',
          ok ? 'bg-pos/15 text-pos' : 'bg-neg/15 text-neg',
        )}
      >
        {ok ? <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> : <X className="h-3.5 w-3.5" strokeWidth={2.6} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[13px] font-medium">{nombre}</p>
        <div className="mt-0.5 text-[12.5px] text-muted">{children}</div>
      </div>
    </div>
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
    <div className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium text-muted">{label}</p>
        <p className="mt-0.5 truncate font-mono text-[13px]">
          {value ?? <span className="text-faint">Define APP_URL para verla</span>}
        </p>
      </div>
      {value && (
        <button
          onClick={() => onCopy(value, label)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-fill-soft text-muted transition-colors hover:bg-fill hover:text-txt"
          aria-label={`Copiar ${label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
