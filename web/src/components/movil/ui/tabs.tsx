'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ellipsis, House, MessageCircle, Users, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * La barra de pestañas de iOS: 49 px, vidrio esmerilado, rayita arriba y el
 * área segura del iPhone debajo. Cinco pestañas, que es el máximo que iOS
 * enseña sin meterlas en «Más»; la quinta ES «Más», como manda Apple.
 */

export type Pestana = { href: string; label: string; icon: LucideIcon; raiz: string };

export const PESTANAS: Pestana[] = [
  { href: '/m', label: 'Hoy', icon: House, raiz: '/m' },
  { href: '/m/bandeja', label: 'Bandeja', icon: MessageCircle, raiz: '/m/bandeja' },
  { href: '/m/automatizaciones', label: 'Automatizar', icon: Zap, raiz: '/m/automatizaciones' },
  { href: '/m/contactos', label: 'Contactos', icon: Users, raiz: '/m/contactos' },
  { href: '/m/mas', label: 'Más', icon: Ellipsis, raiz: '/m/mas' },
];

/**
 * Qué pestaña se enciende con cada ruta. Las pantallas que cuelgan de una
 * pestaña la mantienen encendida aunque su dirección no empiece igual — por
 * ejemplo el asistente vive en /m/asistente pero pertenece a Más.
 */
const DE_QUIEN_ES: { prefijo: string; raiz: string }[] = [
  { prefijo: '/m/bandeja', raiz: '/m/bandeja' },
  { prefijo: '/m/automatizaciones', raiz: '/m/automatizaciones' },
  { prefijo: '/m/contactos', raiz: '/m/contactos' },
  { prefijo: '/m/asistente', raiz: '/m/mas' },
  { prefijo: '/m/mas', raiz: '/m/mas' },
  { prefijo: '/m/ajustes', raiz: '/m/mas' },
];

export function raizDe(pathname: string): string {
  const encontrada = DE_QUIEN_ES.find(
    (d) => pathname === d.prefijo || pathname.startsWith(`${d.prefijo}/`),
  );
  return encontrada?.raiz ?? '/m';
}

export function BarraTabs() {
  const pathname = usePathname();
  const activa = raizDe(pathname);

  return (
    <nav
      className="relative z-30 shrink-0 bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      aria-label="Pestañas"
    >
      <div className="absolute inset-x-0 top-0 h-px origin-top scale-y-50 bg-border" />
      <div className="flex h-[var(--tabs-alto)]">
        {PESTANAS.map(({ href, label, icon: Icon, raiz }) => {
          const on = activa === raiz;
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-[3px] pt-1 active:opacity-60',
                on ? 'text-accent' : 'text-muted',
              )}
            >
              <Icon className="h-[25px] w-[25px]" strokeWidth={on ? 2.3 : 1.8} />
              <span className="text-[10px] leading-none font-medium tracking-[0.01em]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
