'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  BellRing,
  ChevronRight,
  MessageCircle,
  Share,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/lib/client/accounts-context';
import { useAutomations, useContacts, useConversations } from '@/lib/client/firestore-hooks';
import { activarPush, esIos, estadoPush, type EstadoPush } from '@/lib/push/cliente';
import { aFecha, hace } from '@/lib/movil/datos';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Pantalla } from '@/components/movil/ui/pantalla';
import { Seccion, Fila, FilaEnlace, IconoFila } from '@/components/movil/ui/lista';
import { Cargando, Globo } from '@/components/movil/ui/controles';

/**
 * Hoy — lo primero que ves al abrir la app. No es un panel de métricas: es lo
 * que hay que atender ahora en Instagram. Cuatro números arriba, y debajo quién
 * te escribió.
 */
export function PantallaHoy() {
  const { account } = useAccounts();
  const cuenta = account?.id ?? null;
  const { data: conversaciones, loading: cargando } = useConversations(cuenta, 'open');
  const { data: automatizaciones } = useAutomations(cuenta);
  const { data: contactos } = useContacts(cuenta);

  // «Hoy» se fija al abrir: recalcularlo en cada render haría impuro el render.
  const [medianoche] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });
  const [fecha] = useState(() =>
    new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }),
  );

  const sinLeer = conversaciones.reduce((n, c) => n + (c.unreadCount ?? 0), 0);
  const activas = automatizaciones.filter((a) => a.enabled);
  const disparadasHoy = activas.filter((a) => (a.stats?.lastTriggeredAt ?? 0) >= medianoche);
  const nuevosHoy = contactos.filter((c) => (c.firstSeenAt ?? 0) >= medianoche);
  const recientes = [...conversaciones]
    .sort((x, y) => (y.lastMessageAt ?? 0) - (x.lastMessageAt ?? 0))
    .slice(0, 5);

  return (
    <Pantalla titulo="Hoy" descripcion={fecha[0].toUpperCase() + fecha.slice(1)}>
      <AvisoPush />

      <div className="mb-8 grid grid-cols-2 gap-3 px-4">
        <Cifra
          href="/m/bandeja"
          icon={MessageCircle}
          tono="bg-accent"
          n={sinLeer}
          label="Sin leer"
          detalle={`${conversaciones.length} abiertas`}
        />
        <Cifra
          href="/m/automatizaciones"
          icon={Zap}
          tono="bg-warn"
          n={disparadasHoy.length}
          label="Automatizaciones hoy"
          detalle={`${activas.length} activas`}
        />
        <Cifra
          href="/m/contactos"
          icon={Users}
          tono="bg-pos"
          n={nuevosHoy.length}
          label="Contactos nuevos"
          detalle={`${contactos.length} en total`}
        />
        <Cifra
          href="/m/asistente"
          icon={Sparkles}
          tono="bg-txt text-bg"
          n={automatizaciones.length}
          label="Automatizaciones"
          detalle="Pídele una al asistente"
        />
      </div>

      <Seccion
        titulo="Te escribieron"
        accion={
          <Link href="/m/bandeja" className="text-[15px] text-accent active:opacity-50">
            Ver bandeja
          </Link>
        }
      >
        {cargando && <Cargando className="py-8" />}
        {!cargando && recientes.length === 0 && (
          <Fila titulo="Todavía no te escribe nadie" subtitulo="Los DMs y comentarios llegan aquí en cuanto conectas tu Instagram" ultima />
        )}
        {recientes.map((c, i) => (
          <FilaEnlace
            key={c.id}
            href={`/m/bandeja/${c.id}`}
            izquierda={<Avatar src={c.contactPic} name={c.contactUsername ?? c.contactName ?? '?'} size={29} />}
            titulo={c.contactName || (c.contactUsername ? `@${c.contactUsername}` : 'Alguien')}
            subtitulo={c.lastMessagePreview}
            derecha={(c.unreadCount ?? 0) > 0 ? <Globo n={c.unreadCount ?? 0} /> : undefined}
            valor={(c.unreadCount ?? 0) > 0 ? undefined : hace(aFecha(c.lastMessageAt))}
            chevron={false}
            ultima={i === recientes.length - 1}
          />
        ))}
      </Seccion>

      <Seccion titulo="Hacer algo">
        <FilaEnlace href="/m/automatizaciones" izquierda={<IconoFila icon={Zap} tono="bg-warn" />} titulo="Automatizaciones" />
        <FilaEnlace href="/m/asistente" izquierda={<IconoFila icon={Sparkles} tono="bg-accent" />} titulo="Pedírselo al asistente" ultima />
      </Seccion>
    </Pantalla>
  );
}

/** Una de las cuatro cifras de arriba. Toca y te lleva a lo que cuenta. */
function Cifra({
  href,
  icon: Icon,
  tono,
  n,
  label,
  detalle,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tono: string;
  n: number;
  label: string;
  detalle: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-card bg-surface p-3.5 active:bg-surface-2"
    >
      <div className="flex items-center justify-between">
        <span className={cn('grid h-[29px] w-[29px] place-items-center rounded-[7px] text-white', tono)}>
          <Icon className="h-[17px] w-[17px]" strokeWidth={2.1} />
        </span>
        <ChevronRight className="h-4 w-4 text-faint" strokeWidth={2.6} />
      </div>
      <div>
        <p className="text-[28px] leading-none font-bold tracking-[-0.02em] tabular-nums">{n}</p>
        <p className="mt-1 text-[13px] leading-tight font-medium">{label}</p>
        <p className="text-[12px] leading-tight text-muted">{detalle}</p>
      </div>
    </Link>
  );
}

/**
 * La invitación a prender los avisos. Solo sale si este aparato todavía no los
 * recibe; una vez prendidos desaparece para siempre de aquí y se maneja en
 * Ajustes.
 */
function AvisoPush() {
  const [estado, setEstado] = useState<EstadoPush>('cargando');
  const [activando, setActivando] = useState(false);

  useEffect(() => {
    let vivo = true;
    estadoPush().then((e) => {
      if (vivo) setEstado(e);
    });
    return () => {
      vivo = false;
    };
  }, []);

  if (estado === 'cargando' || estado === 'activo' || estado === 'sin-soporte') return null;

  if (estado === 'ios-sin-instalar') {
    return (
      <Seccion titulo="Avisos">
        <Fila
          izquierda={<IconoFila icon={Share} tono="bg-accent" />}
          titulo="Agrega la app a tu pantalla de inicio"
          subtitulo="Compartir › Agregar a inicio. Desde ahí sí llegan los avisos."
          ultima
        />
      </Seccion>
    );
  }

  if (estado === 'bloqueado') {
    return (
      <Seccion titulo="Avisos">
        <FilaEnlace
          href="/m/ajustes"
          izquierda={<IconoFila icon={Bell} tono="bg-neg" />}
          titulo="Los avisos están bloqueados"
          subtitulo={esIos() ? 'Ajustes del iPhone › Notificaciones › Chatty' : 'Permítelos en el navegador'}
          ultima
        />
      </Seccion>
    );
  }

  async function activar() {
    setActivando(true);
    try {
      await activarPush();
      setEstado('activo');
      toast.success('Listo, aquí te van a llegar');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron activar');
      setEstado(await estadoPush());
    } finally {
      setActivando(false);
    }
  }

  return (
    <Seccion titulo="Avisos" pie="Comentarios, automatizaciones y checkpoints. Se ajusta en Ajustes.">
      <button
        type="button"
        onClick={activar}
        disabled={activando}
        className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2 disabled:opacity-50"
      >
        <IconoFila icon={BellRing} tono="bg-accent" />
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] leading-tight">
            {activando ? 'Activando…' : 'Recibe los avisos aquí'}
          </span>
          <span className="block text-[13px] leading-tight text-muted">
            Un toque y te llega uno de bienvenida.
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[15px] font-semibold text-accent-fg">
          Activar
        </span>
      </button>
    </Seccion>
  );
}
