'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Share, X } from 'lucide-react';
import { toast } from 'sonner';
import { activarPush, estadoPush, registrarSw, type EstadoPush } from '@/lib/push/cliente';

const CLAVE_SILENCIO = 'chatty:push-aviso-silenciado';
const SILENCIO_MS = 7 * 24 * 60 * 60 * 1000;

function silenciado(): boolean {
  try {
    const hasta = Number(localStorage.getItem(CLAVE_SILENCIO) ?? 0);
    return hasta > Date.now();
  } catch {
    return false;
  }
}

function silenciar() {
  try {
    localStorage.setItem(CLAVE_SILENCIO, String(Date.now() + SILENCIO_MS));
  } catch {
    /* sin almacenamiento, vuelve a salir al recargar */
  }
}

/**
 * Lo que hace del panel una app: registra el service worker de los avisos y,
 * si este dispositivo todavía no recibe notificaciones, lo ofrece con un solo
 * toque. En iPhone primero hay que agregarlo a la pantalla de inicio, y eso
 * también se explica aquí porque nadie lo adivina.
 */
export function Pwa() {
  const pathname = usePathname();
  const [estado, setEstado] = useState<EstadoPush>('cargando');
  const [visible, setVisible] = useState(false);
  const [activando, setActivando] = useState(false);

  useEffect(() => {
    let vivo = true;
    registrarSw()
      .then(() => estadoPush())
      .then((e) => {
        if (!vivo) return;
        setEstado(e);
        setVisible((e === 'inactivo' || e === 'ios-sin-instalar') && !silenciado());
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // En Ajustes ya está la tarjeta completa: el aviso sobraría.
  if (!visible || pathname.startsWith('/settings')) return null;

  async function activar() {
    setActivando(true);
    try {
      await activarPush();
      setVisible(false);
      toast.success('Avisos activados en este dispositivo');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron activar');
    } finally {
      setActivando(false);
    }
  }

  function cerrar() {
    silenciar();
    setVisible(false);
  }

  if (estado === 'ios-sin-instalar') {
    return (
      <div className="flex items-start gap-3 border-b border-border bg-surface px-4 py-3 md:hidden">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Share className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 text-[13px] leading-snug">
          <p className="font-semibold">Agrega el panel a tu pantalla de inicio</p>
          <p className="text-muted">
            Toca <span className="font-medium text-txt">Compartir</span> y luego{' '}
            <span className="font-medium text-txt">Agregar a inicio</span>. Desde ahí sí llegan los avisos
            de comentarios y automatizaciones.
          </p>
        </div>
        <button
          onClick={cerrar}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-txt"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <Bell className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1 text-[13px] leading-snug">
        <p className="font-semibold">Recibe los avisos de Instagram aquí</p>
        <p className="hidden text-muted sm:block">
          Un aviso cada 10 comentarios y por cada automatización que marques.{' '}
          <Link href="/settings?tab=notificaciones" className="text-accent hover:underline">
            Ajustar
          </Link>
        </p>
      </div>
      <button
        onClick={activar}
        disabled={activando}
        className="h-9 shrink-0 rounded-xl bg-accent px-3.5 text-[13px] font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {activando ? 'Activando…' : 'Activar'}
      </button>
      <button
        onClick={cerrar}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-txt"
        aria-label="Ahora no"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
