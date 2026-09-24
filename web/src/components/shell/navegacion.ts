import { MessageCircle, Settings, Sparkles, TrendingUp, Users, Zap, type LucideIcon } from 'lucide-react';

export type Destino = { href: string; label: string; icon: LucideIcon };

/** El menú completo: la barra lateral en escritorio y la hoja «Más» en celular. */
export const NAV: { titulo: string; items: Destino[] }[] = [
  {
    titulo: 'Instagram',
    items: [
      { href: '/inbox', label: 'Bandeja', icon: MessageCircle },
      { href: '/automations', label: 'Automatizaciones', icon: Zap },
      { href: '/contacts', label: 'Contactos', icon: Users },
      { href: '/instagram', label: 'Estadísticas', icon: TrendingUp },
      { href: '/asistente', label: 'Asistente', icon: Sparkles },
    ],
  },
  {
    titulo: 'Panel',
    items: [{ href: '/settings', label: 'Ajustes', icon: Settings }],
  },
];

/** Lo que cabe en la barra inferior cuando el panel de escritorio se abre en un teléfono. */
export const NAV_MOVIL: Destino[] = [
  { href: '/inbox', label: 'Bandeja', icon: MessageCircle },
  { href: '/automations', label: 'Automatizar', icon: Zap },
  { href: '/contacts', label: 'Contactos', icon: Users },
  { href: '/asistente', label: 'Asistente', icon: Sparkles },
];

export function estaActivo(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
