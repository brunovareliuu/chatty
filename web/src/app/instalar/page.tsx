import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Check, Circle } from 'lucide-react';
import { estadoInstalacion, firebaseListo, type Variable } from '@/lib/instalacion';
import { getCurrentUser } from '@/lib/session';
import { cn } from '@/lib/utils';
import { Codigo } from './codigo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Instalar Chatty',
  description: 'Los pasos para dejar Chatty funcionando con tu Firebase y tu Instagram.',
  robots: { index: false, follow: false },
};

/**
 * La guía de instalación, dentro del panel. Mientras falten las llaves de
 * Firebase es lo único que se abre y no pide sesión: no hay nada que proteger.
 * Ya configurado, solo la ve quien entró (Ajustes › Sistema la enlaza).
 */
export default async function InstalarPage() {
  if (firebaseListo() && !(await getCurrentUser())) redirect('/login');

  const e = estadoInstalacion();
  const url = e.appUrl ?? 'https://TU-URL';
  const completo = (vars: Variable[]) => vars.every((v) => v.lista || v.opcional);

  return (
    <main className="min-h-dvh bg-bg px-5 py-12 text-txt md:py-16">
      <div className="mx-auto w-full max-w-[720px] animate-rise">
        <header className="mb-10">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-[18px] bg-accent">
            <span className="text-[26px] font-black tracking-tight text-white">C</span>
          </div>
          <h1 className="text-[32px] leading-tight font-bold tracking-[-0.8px] md:text-[38px]">
            Tu propio ManyChat para Instagram
          </h1>
          <p className="mt-3 max-w-[560px] text-[16px] leading-relaxed text-muted">
            Este panel todavía no está conectado a nada, por eso no te pide cuenta. Estos son los
            pasos para dejarlo funcionando con tu Firebase y tu Instagram, en orden. Cuando estén
            las llaves de Firebase, esta página se cambia sola por el login.
          </p>

          <div className="mt-7 rounded-panel border border-border bg-surface p-5">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[15px] font-semibold">Variables obligatorias</p>
              <p className="text-[15px] tabular-nums text-muted">
                <span className="font-semibold text-txt">{e.listas}</span> de {e.total}
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{ width: `${Math.round((e.listas / e.total) * 100)}%` }}
              />
            </div>
            <p className="mt-3 text-[13px] leading-snug text-muted">
              Se leen de <code className="font-mono text-txt">web/.env.local</code> en tu máquina y de{' '}
              <code className="font-mono text-txt">web/apphosting.yaml</code> en producción. Aquí solo se dice si
              existen, nunca su valor.
            </p>
          </div>
        </header>

        <ol className="space-y-5">
          <Paso n={1} titulo="Lo que necesitas" detalle="docs/01-requisitos.md">
            <Puntos
              items={[
                'Una cuenta de Google con tarjeta: el proyecto de Firebase va en plan Blaze. Con poco uso cuesta centavos al mes.',
                'Tu Instagram como cuenta profesional (Empresa o Creador).',
                'Una cuenta en developers.facebook.com, para crear la app que conecta tu Instagram.',
                'Node 20 o más nuevo y la CLI de Firebase.',
                'Opcional: una llave de Claude (console.anthropic.com) para el asistente.',
              ]}
            />
            <Codigo>npm i -g firebase-tools</Codigo>
          </Paso>

          <Paso n={2} titulo="Firebase: la base de datos y el login" detalle="docs/02-firebase.md" listo={completo(e.firebase)}>
            <Puntos
              items={[
                'En console.firebase.google.com: Agregar proyecto, y cámbialo a plan Blaze.',
                'Firestore Database → Crear base de datos: edición Standard, modo producción.',
                'Authentication → Método de acceso: activa Google y Correo electrónico/contraseña.',
                'Configuración del proyecto → Tus apps → Web (</>). Los seis valores que te enseña van en web/.env.local.',
                'Desde la raíz del repo, liga tu proyecto y sube las reglas de seguridad:',
              ]}
            />
            <Codigo>{`firebase login
firebase use --add
firebase deploy --only firestore`}</Codigo>
            <Variables vars={e.firebase} />
          </Paso>

          <Paso n={3} titulo="Meta e Instagram" detalle="docs/03-meta-instagram.md" listo={completo(e.meta)}>
            <Puntos
              items={[
                'En el teléfono: Instagram → Configuración → Mensajes y respuestas a historias → Herramientas conectadas → Permitir el acceso a los mensajes.',
                'En developers.facebook.com/apps: Crear app, con el caso de uso «Administrar mensajes y contenido en Instagram».',
                'En «Configuración de la API con inicio de sesión de Instagram», agrega los permisos instagram_business_basic, instagram_business_manage_messages, instagram_business_manage_comments e instagram_business_manage_insights.',
                'Copia el ID y la clave secreta de la app de Instagram. Ojo: no son los de la app de Meta que salen arriba.',
                'Inventa una cadena larga para verificar el webhook.',
                'Roles de la app → agrega tu cuenta como Tester de Instagram y acepta la invitación desde Instagram.',
              ]}
            />
            <p className="text-[14px] leading-relaxed text-muted">
              {e.appUrl
                ? 'En Meta, pega estas dos direcciones (URL de redireccionamiento y webhook):'
                : 'Cuando tengas APP_URL, en Meta van la URL de redireccionamiento y la del webhook:'}
            </p>
            <Codigo>{`${url}/api/ig/callback`}</Codigo>
            <Codigo>{`${url}/api/webhooks/instagram`}</Codigo>
            <p className="text-[14px] leading-relaxed text-muted">
              Campos del webhook: messages, messaging_postbacks, messaging_seen, message_reactions,
              messaging_referral y comments.
            </p>
            <Variables vars={e.meta} />
          </Paso>

          <Paso n={4} titulo="Las llaves del panel" detalle="docs/04-variables-de-entorno.md" listo={completo(e.panel)}>
            <p className="text-[15px] leading-relaxed">
              En <code className="font-mono">web/</code>, copia el ejemplo y llénalo. Las dos llaves propias se
              generan así, una vez cada una:
            </p>
            <Codigo>{`cp .env.example .env.local
openssl rand -hex 32`}</Codigo>
            <Variables vars={e.panel} />
          </Paso>

          <Paso n={5} titulo="Correrlo en tu máquina" detalle="docs/05-correr-en-local.md">
            <p className="text-[15px] leading-relaxed">
              El servidor necesita una identidad de Google Cloud para hablar con tu Firestore. Con la tuya basta:
            </p>
            <Codigo>{`gcloud auth application-default login
gcloud auth application-default set-quota-project TU-PROYECTO
npm run dev`}</Codigo>
            <p className="text-[14px] leading-relaxed text-muted">
              Meta no llama a localhost: para recibir DMs en tu máquina usa un túnel (ngrok o cloudflared) y
              pon su URL en APP_URL. O salta al paso 6 y prueba directo en internet.
            </p>
          </Paso>

          <Paso n={6} titulo="Ponerlo en internet" detalle="docs/06-desplegar.md">
            <Puntos
              items={[
                'Sube tu copia a GitHub y llena los REEMPLAZA de web/apphosting.yaml.',
                'Crea los secretos (te pide cada valor):',
              ]}
            />
            <Codigo>{`firebase apphosting:secrets:set META_APP_SECRET
firebase apphosting:secrets:set META_WEBHOOK_VERIFY_TOKEN
firebase apphosting:secrets:set TOKEN_ENCRYPTION_KEY
firebase apphosting:secrets:set CRON_SECRET
firebase apphosting:secrets:set CLAUDE_API_KEY`}</Codigo>
            <Puntos
              items={[
                'Crea el backend y conecta tu repo. El directorio raíz es web.',
              ]}
            />
            <Codigo>firebase apphosting:backends:create</Codigo>
            <Puntos
              items={[
                'Agrega tu dominio en Firebase → Authentication → Configuración → Dominios autorizados.',
                'En Meta, cambia la URL de redireccionamiento y el webhook a tu URL nueva.',
                '¿No vas a usar el asistente? Borra el bloque de CLAUDE_API_KEY de apphosting.yaml en vez de crear el secreto.',
              ]}
            />
          </Paso>

          <Paso n={7} titulo="El cron: el latido de cada minuto" detalle="docs/07-cron.md">
            <p className="text-[15px] leading-relaxed">
              Despierta los flujos que esperan y renueva los tokens de Instagram antes de que venzan.
            </p>
            <Codigo>{`gcloud services enable cloudscheduler.googleapis.com
gcloud scheduler jobs create http chatty-tick \\
  --schedule="* * * * *" \\
  --uri="${url}/api/cron/tick" \\
  --http-method=GET \\
  --headers="x-cron-secret=TU_CRON_SECRET" \\
  --location=us-central1`}</Codigo>
          </Paso>

          <Paso n={8} titulo="Tu primer DM automático" detalle="docs/08-primer-uso.md">
            <Puntos
              items={[
                'Entra con tu cuenta. La primera que entra queda como dueña.',
                'Ajustes → Instagram → Conectar, con tu cuenta profesional.',
                'Automatizaciones → Nueva → «Alguien comenta una palabra clave en una publicación», la palabra GUÍA y el enlace que quieres mandar.',
                'Desde otra cuenta, comenta GUÍA en ese post: llega la respuesta pública y el DM.',
              ]}
            />
          </Paso>
        </ol>

        <footer className="mt-10 rounded-panel border border-border bg-surface p-5 text-[14px] leading-relaxed text-muted">
          Cada paso tiene su guía completa en la carpeta <code className="font-mono text-txt">docs/</code> del
          repo (empieza por <code className="font-mono text-txt">docs/README.md</code>), con qué hacer si algo
          falla en <code className="font-mono text-txt">docs/solucion-de-problemas.md</code>.
        </footer>
      </div>
    </main>
  );
}

function Paso({
  n,
  titulo,
  detalle,
  listo,
  children,
}: {
  n: number;
  titulo: string;
  detalle: string;
  /** Solo los pasos que dependen de variables saben si ya están. */
  listo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-panel border border-border bg-surface p-5 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span
          className={cn(
            'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold',
            listo ? 'bg-pos text-white' : 'bg-accent-soft text-accent',
          )}
        >
          {listo ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
        </span>
        <h2 className="flex-1 text-[19px] leading-tight font-bold tracking-[-0.3px]">{titulo}</h2>
      </div>
      <div className="space-y-3">{children}</div>
      <p className="mt-4 text-[12.5px] text-faint">
        Con más detalle: <code className="font-mono">{detalle}</code>
      </p>
    </li>
  );
}

function Puntos({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t} className="flex gap-2.5 text-[15px] leading-relaxed">
          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Variables({ vars }: { vars: Variable[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-bg">
      {vars.map((v) => (
        <li key={v.nombre} className="flex items-start gap-3 px-4 py-2.5">
          {v.lista ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-pos" strokeWidth={3} />
          ) : (
            <Circle className={cn('mt-0.5 h-4 w-4 shrink-0', v.opcional ? 'text-faint' : 'text-accent')} />
          )}
          <div className="min-w-0">
            <p className="font-mono text-[12.5px] break-all">{v.nombre}</p>
            <p className="text-[12.5px] leading-snug text-muted">
              {v.para}
              {v.opcional ? ' · opcional' : ''}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
