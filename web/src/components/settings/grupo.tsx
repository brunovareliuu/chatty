import { cn } from '@/lib/utils';

/**
 * Las piezas de Ajustes, como en Ajustes del Mac: cada tema lleva un título
 * chico arriba y debajo una tarjeta blanca con sus renglones separados por un
 * filo que no llega a las orillas.
 */

export function Seccion({
  titulo,
  descripcion,
  children,
  className,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-2.5', className)}>
      <div className="px-1">
        <h2 className="text-[15px] font-semibold tracking-[-0.012em]">{titulo}</h2>
        {descripcion && <p className="mt-0.5 max-w-xl text-[13px] leading-snug text-muted">{descripcion}</p>}
      </div>
      {children}
    </section>
  );
}

/** La tarjeta de renglones. Cada hijo directo es un renglón; el filo entre ellos lo pone el grupo. */
export function Grupo({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('tarjeta divide-y divide-hairline overflow-hidden rounded-card px-4', className)}>{children}</div>;
}

/** Una nota gris debajo de un grupo, como las de Ajustes. */
export function Nota({ children }: { children: React.ReactNode }) {
  return <p className="px-1 text-[12px] leading-relaxed text-faint">{children}</p>;
}

/** El cuadrito del icono al inicio de un renglón (Ajustes del Mac pone uno en cada fila). */
export function IconoFila({
  children,
  tono = 'neutro',
  className,
}: {
  children: React.ReactNode;
  tono?: 'neutro' | 'acento' | 'neg';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid h-9 w-9 shrink-0 place-items-center rounded-[10px] [&_svg]:h-[18px] [&_svg]:w-[18px]',
        tono === 'acento' && 'bg-accent-soft text-accent',
        tono === 'neutro' && 'bg-fill-soft text-muted',
        tono === 'neg' && 'bg-neg/10 text-neg',
        className,
      )}
    >
      {children}
    </div>
  );
}
