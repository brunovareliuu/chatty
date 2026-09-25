'use client';

import { useEffect, useState } from 'react';
import { Check, Plug, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/lib/client/accounts-context';
import { Avatar } from '@/components/ui/avatar';
import { Pantalla } from '@/components/movil/ui/pantalla';
import { Seccion, Fila, FilaBoton, IconoFila } from '@/components/movil/ui/lista';
import { HojaAcciones } from '@/components/movil/ui/hoja';
import { AjustesNotificaciones } from './notificaciones';

/**
 * Ajustes — las tres pestañas del escritorio (notificaciones, Instagram y
 * sistema) en **una sola lista larga**, que es como las hace iOS:
 * no hay pestañas, se rueda.
 *
 * Quien llega desde un aviso o desde «Más» trae `?tab=…` y la pantalla abre
 * desplazada en esa sección.
 */

export type EstadoSistema = {
  metaAppId: boolean;
  metaAppSecret: boolean;
  verifyToken: boolean;
  encryptionKey: boolean;
  cronSecret: boolean;
  appUrl: string | null;
};

const VARIABLES: { clave: keyof EstadoSistema; nombre: string; para: string }[] = [
  { clave: 'metaAppId', nombre: 'META_APP_ID', para: 'El ID de tu app en Meta for Developers' },
  { clave: 'metaAppSecret', nombre: 'META_APP_SECRET', para: 'Firma los webhooks' },
  {
    clave: 'verifyToken',
    nombre: 'META_WEBHOOK_VERIFY_TOKEN',
    para: 'La cadena que inventas tú y Meta repite',
  },
  { clave: 'encryptionKey', nombre: 'TOKEN_ENCRYPTION_KEY', para: 'Cifra los tokens de Instagram' },
  { clave: 'cronSecret', nombre: 'CRON_SECRET', para: 'Protege el cron que despierta los flujos' },
];

const GRUPOS = ['notificaciones', 'instagram', 'sistema'] as const;

export function PantallaAjustes({
  sistema,
  tab,
}: {
  sistema: EstadoSistema;
  /** `?tab=instagram` y sus hermanas: la pantalla abre en esa sección. */
  tab?: string | null;
}) {
  const destino = tab && (GRUPOS as readonly string[]).includes(tab) ? `ajustes-${tab}` : null;

  // El contenido de arriba (los avisos) llega tarde y empuja la
  // sección hacia abajo: se vuelve a anclar durante un segundo y se para en
  // cuanto el usuario toca la pantalla.
  useEffect(() => {
    if (!destino) return;
    let vivo = true;
    let vueltas = 0;
    const parar = () => {
      vivo = false;
    };
    const anclar = () => {
      if (!vivo) return;
      document.getElementById(destino)?.scrollIntoView({ block: 'start' });
      if (++vueltas < 8) setTimeout(anclar, 140);
    };
    const primero = setTimeout(anclar, 80);
    window.addEventListener('touchstart', parar, { passive: true });
    window.addEventListener('wheel', parar, { passive: true });
    return () => {
      vivo = false;
      clearTimeout(primero);
      window.removeEventListener('touchstart', parar);
      window.removeEventListener('wheel', parar);
    };
  }, [destino]);

  return (
    <Pantalla
      titulo="Ajustes"
      descripcion="Avisos al celular, tu cuenta de Instagram y el estado del despliegue."
      atras={{ etiqueta: 'Atrás' }}
    >
      <div id="ajustes-notificaciones" className="scroll-mt-2">
        <Grupo titulo="Notificaciones" />
        <AjustesNotificaciones />
      </div>

      <div id="ajustes-instagram" className="scroll-mt-2">
        <Grupo titulo="Instagram" />
        <SeccionInstagram listo={Boolean(sistema.appUrl)} />
      </div>

      <div id="ajustes-sistema" className="scroll-mt-2">
        <Grupo titulo="Sistema" />
        <SeccionSistema sistema={sistema} />
      </div>
    </Pantalla>
  );
}

/** El rótulo que parte la lista en cuatro temas. */
function Grupo({ titulo }: { titulo: string }) {
  return (
    <h2 className="px-4 pt-1 pb-3 text-[22px] leading-none font-bold tracking-[-0.02em]">
      {titulo}
    </h2>
  );
}

function SeccionInstagram({ listo }: { listo: boolean }) {
  const { accounts } = useAccounts();
  const [porDesconectar, setPorDesconectar] = useState<{ id: string; username: string } | null>(
    null,
  );
  const [desconectando, setDesconectando] = useState<string | null>(null);
  // El render tiene que ser puro: «ahora» se fija una vez al montar.
  const [ahora] = useState(() => Date.now());

  async function desconectar(accountId: string, username: string) {
    setDesconectando(accountId);
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
      setDesconectando(null);
    }
  }

  return (
    <>
      <Seccion
        titulo="Cuenta conectada"
        pie={
          accounts.length === 0
            ? 'Tiene que ser una cuenta profesional (Empresa o Creador) con los mensajes habilitados para herramientas externas.'
            : 'El token se renueva solo mientras el cron corra. «Reconectar» solo hace falta si Instagram lo caduca.'
        }
      >
        {accounts.length === 0 && (
          <Fila
            izquierda={<IconoFila icon={Plug} tono="bg-muted" />}
            titulo="Ninguna cuenta conectada"
            subtitulo={listo ? 'Conéctala abajo' : 'Falta la configuración del sistema'}
            ultima
          />
        )}

        {accounts.map((a) => {
          const dias = Math.floor((a.tokenExpiresAt - ahora) / 86400000);
          return (
            <Fila
              key={a.id}
              izquierda={<Avatar src={a.profilePictureUrl} name={a.username} size={29} />}
              titulo={
                <span className="flex items-center gap-2">
                  <span className="min-w-0 truncate text-[17px] leading-[1.35]">
                    @{a.username}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                      a.needsReconnect ? 'bg-neg/15 text-neg' : 'bg-pos/15 text-pos'
                    }`}
                  >
                    {a.needsReconnect ? 'Reconectar' : 'Activa'}
                  </span>
                </span>
              }
              subtitulo={
                a.lastError ??
                `Token válido ${dias > 0 ? `${dias} días más` : 'vencido'} · se renueva solo`
              }
            />
          );
        })}

        <FilaAncla
          href="/api/ig/connect"
          titulo={accounts.length === 0 ? 'Conectar Instagram' : 'Reconectar la cuenta'}
          ultima={accounts.length === 0}
        />

        {accounts.map((a) => (
          <FilaBoton
            key={a.id}
            onClick={() => setPorDesconectar({ id: a.id, username: a.username })}
            disabled={desconectando === a.id}
            titulo={desconectando === a.id ? 'Desconectando…' : `Desconectar @${a.username}`}
            peligro
            ultima
            className="justify-center"
          />
        ))}
      </Seccion>

      <HojaAcciones
        abierta={Boolean(porDesconectar)}
        onCerrar={() => setPorDesconectar(null)}
        titulo={porDesconectar ? `@${porDesconectar.username}` : undefined}
        mensaje="Dejarán de llegar los mensajes y los comentarios de esta cuenta."
        acciones={[
          {
            label: 'Desconectar',
            peligro: true,
            onClick: () => {
              if (porDesconectar) void desconectar(porDesconectar.id, porDesconectar.username);
            },
          },
        ]}
      />
    </>
  );
}

function SeccionSistema({ sistema }: { sistema: EstadoSistema }) {
  return (
    <Seccion
      titulo="Variables de entorno"
      pie="Se calculan en el servidor: aquí solo viaja si están puestas, nunca su valor."
    >
      {VARIABLES.map((v) => (
        <FilaVariable
          key={v.clave}
          ok={Boolean(sistema[v.clave])}
          nombre={v.nombre}
          para={v.para}
        />
      ))}
      <FilaVariable
        ok={Boolean(sistema.appUrl)}
        nombre="APP_URL"
        para={sistema.appUrl ?? 'La dirección pública del despliegue'}
        ultima
      />
    </Seccion>
  );
}

function FilaVariable({
  ok,
  nombre,
  para,
  ultima,
}: {
  ok: boolean;
  nombre: string;
  para: string;
  ultima?: boolean;
}) {
  return (
    <Fila
      izquierda={
        <span
          className={`grid h-[22px] w-[22px] place-items-center rounded-full ${
            ok ? 'bg-pos/15 text-pos' : 'bg-neg/15 text-neg'
          }`}
        >
          {ok ? (
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          ) : (
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          )}
        </span>
      }
      titulo={
        <span className="block truncate font-mono text-[15px] leading-[1.35]">{nombre}</span>
      }
      subtitulo={para}
      ultima={ultima}
    />
  );
}

/**
 * Una fila que va a una ruta del servidor (el OAuth de Meta). Tiene que ser un
 * ancla de verdad: `next/link` la haría navegación del cliente y el redirect a
 * Instagram no saldría.
 */
function FilaAncla({ href, titulo, ultima }: { href: string; titulo: string; ultima?: boolean }) {
  return (
    <a
      href={href}
      style={{ ['--sangria' as string]: '57px' }}
      className={`relative flex min-h-[44px] w-full items-center gap-3 px-4 py-[11px] active:bg-surface-2 ${
        ultima ? '' : 'sep-ios'
      }`}
    >
      <IconoFila icon={Plug} tono="bg-accent text-accent-fg" />
      <span className="min-w-0 flex-1 truncate text-[17px] text-accent">{titulo}</span>
    </a>
  );
}
