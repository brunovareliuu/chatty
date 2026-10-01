import { cn } from '@/lib/utils';

// Pastillas de Apple: relleno tenue y texto del mismo tono. La del acento lleva
// su tinta (`accent-ink`, la marca con otra luz) para leerse sobre el relleno.
const tones = {
  neutral: 'bg-fill-soft text-muted',
  accent: 'bg-accent-soft text-accent-ink',
  pos: 'bg-pos/12 text-pos',
  neg: 'bg-neg/12 text-neg',
  warn: 'bg-warn/15 text-warn',
  // Negra y sólida, para lo que ya se cerró («Ya es cliente»).
  solid: 'bg-txt text-bg',
} as const;

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex min-h-[22px] items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const puntos = {
  pos: 'bg-pos',
  neg: 'bg-neg',
  warn: 'bg-warn',
  accent: 'bg-accent',
  neutral: 'bg-faint',
} as const;

/**
 * Punto de estado de 6 px («● Conectada»). Es la forma preferida de usar rojo
 * y verde: pequeño, junto a un texto gris que dice lo que significa.
 */
export function Punto({ tone = 'neutral', className }: { tone?: keyof typeof puntos; className?: string }) {
  return <span aria-hidden className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', puntos[tone], className)} />;
}
