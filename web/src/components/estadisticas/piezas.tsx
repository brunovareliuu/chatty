'use client';

import { useId } from 'react';
import { ArrowDownRight, ArrowUpRight, Film, Image as ImageIcon, Images, Lock, Minus, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Cambio } from '@/lib/estadisticas/calculos';
import { NOMBRE_TIPO, type TipoPost } from '@/lib/estadisticas/tipos';

/**
 * Las piezas del tablero de Instagram. Look de Salud / Tiempo en pantalla:
 * tarjetas blancas sobre la página gris, cifras grandes con números tabulares
 * y gráficas suaves. Una sola tinta de datos, el acento; el gris es contexto.
 * Rojo y verde solo dicen «subió» o «bajó», chiquitos y siempre con flecha y
 * texto (nunca el color solo).
 */

export function Tarjeta({
  titulo,
  detalle,
  accion,
  children,
  className,
}: {
  titulo?: React.ReactNode;
  detalle?: React.ReactNode;
  accion?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('tarjeta min-w-0 p-5 md:p-6', className)}>
      {(titulo || accion) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2.5">
          {/* El texto cede antes que la acción: así el segmentado se queda a la derecha. */}
          <div className="min-w-0 flex-1 basis-40">
            {titulo && <h2 className="text-[16px] font-semibold tracking-[-0.014em]">{titulo}</h2>}
            {detalle && <p className="mt-1 max-w-[90ch] text-[13px] leading-snug text-muted">{detalle}</p>}
          </div>
          {accion}
        </header>
      )}
      {children}
    </section>
  );
}

/**
 * El control segmentado de Apple (la piel `.segmentado` de globals.css) para
 * el rango de fechas, la métrica de una gráfica… Acepta números como valor,
 * por eso no es el `<Segmentado>` de components/ui.
 */
export function Segmentos<T extends string | number>({
  valor,
  opciones,
  onChange,
  className,
  etiqueta,
}: {
  valor: T;
  opciones: { valor: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
  etiqueta?: string;
}) {
  return (
    <div role="tablist" aria-label={etiqueta} className={cn('segmentado max-w-full overflow-x-auto', className)}>
      {opciones.map((o) => (
        <button
          key={String(o.valor)}
          type="button"
          role="tab"
          aria-selected={o.valor === valor}
          onClick={() => onChange(o.valor)}
          className="shrink-0"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Subió o bajó contra el periodo anterior. */
export function Delta({ cambio, className }: { cambio: Cambio | null | undefined; className?: string }) {
  if (!cambio) return null;
  const Icono = cambio.sube === null ? Minus : cambio.sube ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'tabular inline-flex items-center gap-0.5 text-[12.5px] font-semibold whitespace-nowrap',
        cambio.sube === null ? 'text-muted' : cambio.sube ? 'text-pos' : 'text-neg',
        className,
      )}
    >
      <Icono className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      {cambio.texto}
    </span>
  );
}

/**
 * Una cifra con su tendencia, como las fichas de Salud: etiqueta gris, número
 * grande y tabular, cambio chiquito y, si hay, la mini-gráfica del periodo.
 * `chica` para el segundo renglón. `bloqueada` cuando la cifra solo existe con
 * el permiso de estadísticas.
 */
export function Cifra({
  label,
  valor,
  cambio,
  detalle,
  serie,
  chica,
  bloqueada,
}: {
  label: string;
  valor: string;
  cambio?: Cambio | null;
  detalle?: React.ReactNode;
  serie?: (number | null)[];
  chica?: boolean;
  bloqueada?: boolean;
}) {
  return (
    <div className={cn('tarjeta flex min-w-0 flex-col', chica ? 'px-4 pt-3.5 pb-3' : 'px-5 pt-4 pb-3.5')}>
      <p className="truncate text-[13px] font-medium text-muted">{label}</p>
      <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-1', chica ? 'mt-1' : 'mt-1.5')}>
        {bloqueada ? (
          <Lock className={cn('text-faint', chica ? 'h-5 w-5' : 'h-7 w-7')} aria-label="Sin permiso" />
        ) : (
          <p
            className={cn(
              'tabular leading-none font-bold tracking-[-0.03em]',
              chica ? 'text-[24px]' : 'text-[32px] md:text-[34px]',
            )}
          >
            {valor}
          </p>
        )}
        <Delta cambio={cambio} />
      </div>
      {detalle && <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-muted">{detalle}</p>}
      <div className={cn('mt-auto', chica ? 'pt-2.5' : 'pt-3.5')}>
        {serie && serie.filter((v) => v != null).length > 1 ? (
          <Chispa valores={serie} className={chica ? 'h-6' : 'h-8'} />
        ) : (
          <div className={chica ? 'h-6' : 'h-8'} aria-hidden />
        )}
      </div>
    </div>
  );
}

/**
 * Mini-gráfica sin ejes, con el relleno que se desvanece hacia abajo (como en
 * Bolsa). Donde falta un día la línea se corta en vez de inventar el valor.
 */
export function Chispa({ valores, className }: { valores: (number | null)[]; className?: string }) {
  const degradado = `chispa-${useId().replace(/:/g, '')}`;
  const nums = valores.filter((v): v is number => v != null);
  if (nums.length < 2) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const rango = max - min || 1;
  const n = valores.length;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => 26 - ((v - min) / rango) * 24;

  let linea = '';
  let area = '';
  let tramo: [number, number][] = [];
  const cierra = () => {
    if (tramo.length > 1) {
      const pts = tramo.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join('L');
      linea += `M${pts}`;
      area += `M${tramo[0][0].toFixed(2)},28L${pts}L${tramo[tramo.length - 1][0].toFixed(2)},28Z`;
    }
    tramo = [];
  };
  valores.forEach((v, i) => (v == null ? cierra() : tramo.push([x(i), y(v)])));
  cierra();

  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={cn('block h-7 w-full', className)} aria-hidden>
      <defs>
        <linearGradient id={degradado} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${degradado})`} />
      <path
        d={linea}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Una parte contra el todo (p. ej. vistas de quien no te sigue), como la barra
 * de almacenamiento del iPhone: la parte en el acento y el resto en gris, así
 * se lee como una sola cifra.
 */
export function Medidor({
  label,
  parte,
  total,
  nombreParte,
  nombreResto,
}: {
  label: string;
  parte: number;
  total: number;
  nombreParte: string;
  nombreResto: string;
}) {
  const pct = total > 0 ? Math.round((parte / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[20px] leading-none font-bold tracking-[-0.02em] tabular-nums">{pct}%</p>
      </div>
      <div
        className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-fill"
        role="img"
        aria-label={`${nombreParte}: ${pct}%, ${nombreResto}: ${100 - pct}%`}
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          {nombreParte} {pct}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-fill-strong" aria-hidden />
          {nombreResto} {100 - pct}%
        </span>
      </div>
    </div>
  );
}

/** Lista con barra: el nombre, cuánto y cuánto comparado con el primero. */
export function Ranking({
  filas,
  formato,
  vacio = 'Sin datos todavía',
  tope,
}: {
  filas: { clave: string; label: React.ReactNode; valor: number; detalle?: string }[];
  formato: (n: number) => string;
  vacio?: string;
  /** Contra qué se mide la barra; por omisión, el mayor de la lista. */
  tope?: number;
}) {
  if (!filas.length) return <p className="py-6 text-center text-[13px] text-muted">{vacio}</p>;
  const max = tope ?? Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul className="space-y-3.5">
      {filas.map((f) => (
        <li key={f.clave}>
          <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
            <span className="min-w-0 truncate">{f.label}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {formato(f.valor)}
              {f.detalle && <span className="ml-1.5 font-normal text-faint">{f.detalle}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fill">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max(1.5, (f.valor / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

const ICONO_TIPO: Record<TipoPost, React.ComponentType<{ className?: string }>> = {
  reel: Film,
  carrusel: Images,
  foto: ImageIcon,
  video: Video,
};

/** El tipo de publicación, en gris: el tipo es un dato, no una marca de color. */
export function ChipTipo({ tipo, className }: { tipo: TipoPost; className?: string }) {
  const Icono = ICONO_TIPO[tipo];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-fill-soft px-2 py-0.5 text-[11px] font-semibold text-muted',
        className,
      )}
    >
      <Icono className="h-3 w-3" />
      {NOMBRE_TIPO[tipo]}
    </span>
  );
}

/**
 * La portada de un post. Si la URL del CDN de Meta ya caducó, queda el icono
 * del tipo debajo en vez de una imagen rota.
 */
export function Miniatura({
  src,
  tipo,
  className,
}: {
  src: string | null;
  tipo: TipoPost;
  className?: string;
}) {
  const Icono = ICONO_TIPO[tipo];
  return (
    <div className={cn('relative grid shrink-0 place-items-center overflow-hidden bg-fill', className)}>
      <Icono className="h-4 w-4 text-faint" />
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
}

export type EntradaTooltip = { value?: unknown; name?: unknown; color?: string; dataKey?: unknown };

/**
 * El globo de las gráficas: primero el número, luego de qué es. La rayita del
 * color identifica la serie; el texto nunca va en color.
 */
export function GloboGrafica({
  active,
  payload,
  titulo,
  formato,
  nota,
}: {
  active?: boolean;
  payload?: readonly EntradaTooltip[];
  titulo: React.ReactNode;
  formato: (v: number) => string;
  nota?: React.ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="flotante max-w-[260px] rounded-[12px] px-3 py-2">
      <p className="text-[12px] text-muted">{titulo}</p>
      {payload.map((p) => {
        const v = typeof p.value === 'number' ? p.value : null;
        if (v == null) return null;
        return (
          <div key={String(p.dataKey)} className="mt-1 flex items-center gap-2">
            <span className="h-[3px] w-3 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden />
            <span className="text-[15px] font-semibold tabular-nums">{formato(v)}</span>
            <span className="truncate text-[12px] text-muted">{String(p.name ?? '')}</span>
          </div>
        );
      })}
      {nota && <p className="mt-1 text-[11px] text-muted">{nota}</p>}
    </div>
  );
}
