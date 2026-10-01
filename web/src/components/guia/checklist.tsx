'use client';

import { useState } from 'react';
import { Check, ChevronDown, ExternalLink } from 'lucide-react';
import type { PasoResuelto } from '@/lib/guia/estado';
import type { PasoId } from '@/lib/guia/pasos';
import { cn } from '@/lib/utils';
import { botonClases } from '@/components/ui/button';
import { Codigo } from './codigo';
import { cuenta, estadoVisible, marcar, useHechos } from './hechos';

/**
 * Una lista de pasos que se palomea. Lo que el sistema revisa solo sale con
 * su palomita (o esperando); lo que no puede revisar, lo marca la persona con
 * un toque. El primer paso que falta viene abierto.
 */
export function Checklist({
  pasos,
  appUrl,
  titulo,
  className,
}: {
  pasos: PasoResuelto[];
  appUrl: string | null;
  titulo?: string;
  className?: string;
}) {
  const hechos = useHechos();
  const { listos, total } = cuenta(pasos, hechos);
  const primeroQueFalta = pasos.find((p) => estadoVisible(p.estado, p.id, hechos) !== 'hecho')?.id ?? null;
  // null = sigue el primero que falta; un id = lo abrió la persona.
  const [elegido, setElegido] = useState<PasoId | 'ninguno' | null>(null);
  const abierto = elegido === null ? primeroQueFalta : elegido === 'ninguno' ? null : elegido;

  return (
    <section className={cn('tarjeta overflow-hidden', className)}>
      <header className="flex items-center gap-4 px-5 pt-4 pb-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-semibold tracking-[-0.015em]">{titulo ?? 'Lo que falta'}</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {listos === total ? 'Todo listo.' : `${listos} de ${total} pasos listos`}
          </p>
        </div>
        <Anillo listos={listos} total={total} />
      </header>

      <ol className="border-t border-hairline">
        {pasos.map((paso, i) => (
          <FilaPaso
            key={paso.id}
            n={i + 1}
            paso={paso}
            appUrl={appUrl}
            visible={estadoVisible(paso.estado, paso.id, hechos)}
            abierto={abierto === paso.id}
            onAbrir={() => setElegido(abierto === paso.id ? 'ninguno' : paso.id)}
          />
        ))}
      </ol>
    </section>
  );
}

function FilaPaso({
  n,
  paso,
  appUrl,
  visible,
  abierto,
  onAbrir,
}: {
  n: number;
  paso: PasoResuelto;
  appUrl: string | null;
  visible: 'hecho' | 'pendiente' | 'manual';
  abierto: boolean;
  onAbrir: () => void;
}) {
  const url = appUrl ?? 'https://TU-URL';
  const conUrl = (t: string) => t.replaceAll('{APP_URL}', url);
  const marcable = paso.estado === 'manual';

  return (
    <li className="border-b border-hairline last:border-b-0">
      <div className="flex items-start gap-3 px-5 py-3.5">
        <Marca
          visible={visible}
          n={n}
          marcable={marcable}
          onMarcar={() => marcar(paso.id, visible !== 'hecho')}
          titulo={paso.titulo}
        />
        <button type="button" onClick={onAbrir} className="flex min-w-0 flex-1 items-start gap-2 text-left">
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                'block text-[15px] leading-snug font-semibold tracking-[-0.01em]',
                visible === 'hecho' && 'text-muted line-through decoration-faint',
              )}
            >
              {paso.titulo}
              {paso.opcional && (
                <span className="ml-2 inline-block rounded-full bg-fill-soft px-2 py-px align-middle text-[11px] font-medium text-muted no-underline">
                  opcional
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-[13px] leading-snug text-muted">{paso.resumen}</span>
          </span>
          <ChevronDown
            className={cn('mt-0.5 h-4 w-4 shrink-0 text-faint transition-transform', abierto && 'rotate-180')}
          />
        </button>
      </div>

      {abierto && (
        <div className="space-y-3 px-5 pb-5 pl-[60px]">
          <ul className="space-y-2">
            {paso.como.map((t) => (
              <li key={t} className="flex gap-2.5 text-[14px] leading-relaxed">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{conUrl(t)}</span>
              </li>
            ))}
          </ul>

          {paso.comandos?.map((c) => <Codigo key={c}>{conUrl(c)}</Codigo>)}

          {paso.variablesListas && (
            <ul className="divide-y divide-hairline overflow-hidden rounded-[12px] bg-surface">
              {paso.variablesListas.map((v) => (
                <li key={v.nombre} className="flex items-center gap-2.5 px-3.5 py-2">
                  {v.lista ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-pos" strokeWidth={3} />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] border-accent" />
                  )}
                  <span className="font-mono text-[12.5px] break-all">{v.nombre}</span>
                </li>
              ))}
            </ul>
          )}

          {paso.enlaces && (
            <div className="flex flex-wrap gap-2">
              {paso.enlaces.map((e) => (
                <a
                  key={e.href}
                  href={e.href}
                  target="_blank"
                  rel="noreferrer"
                  className={botonClases({ variant: 'secondary', size: 'sm' })}
                >
                  {e.texto}
                  <ExternalLink className="h-3.5 w-3.5 text-muted" />
                </a>
              ))}
            </div>
          )}

          <p className="text-[12.5px] leading-relaxed text-faint">
            {marcable
              ? visible === 'hecho'
                ? 'Lo marcaste tú. Toca el círculo si todavía no está.'
                : `Esto no se puede revisar desde aquí: márcalo tú cuando lo tengas.${paso.seMarca ? ` ${paso.seMarca}` : ''}`
              : visible === 'hecho'
                ? 'Listo: el panel lo revisó solo.'
                : `Se marca solo. ${paso.seMarca ?? ''}`}{' '}
            Con más detalle: <code className="font-mono">{paso.doc}</code>
          </p>
        </div>
      )}
    </li>
  );
}

function Marca({
  visible,
  n,
  marcable,
  onMarcar,
  titulo,
}: {
  visible: 'hecho' | 'pendiente' | 'manual';
  n: number;
  marcable: boolean;
  onMarcar: () => void;
  titulo: string;
}) {
  const circulo = 'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12.5px] font-semibold tabular';
  const contenido =
    visible === 'hecho' ? (
      <span className={cn(circulo, 'bg-pos text-white')}>
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    ) : (
      <span
        className={cn(
          circulo,
          marcable
            ? 'border-[1.5px] border-faint/60 text-muted transition-colors hover:border-accent hover:text-accent-ink'
            : 'border-[1.5px] border-dashed border-accent/50 text-accent-ink',
        )}
      >
        {n}
      </span>
    );

  if (!marcable) {
    return (
      <span title={visible === 'hecho' ? 'Listo' : 'Se marca solo'} className="mt-0.5">
        {contenido}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onMarcar}
      className="mt-0.5 rounded-full transition-transform active:scale-90"
      aria-label={visible === 'hecho' ? `Desmarcar: ${titulo}` : `Marcar como hecho: ${titulo}`}
      title={visible === 'hecho' ? 'Desmarcar' : 'Marcar como hecho'}
    >
      {contenido}
    </button>
  );
}

/** El avance en un anillo: se lee de un vistazo en la esquina. */
export function Anillo({ listos, total, tam = 44 }: { listos: number; total: number; tam?: number }) {
  const r = (tam - 6) / 2;
  const c = 2 * Math.PI * r;
  const frac = total ? listos / total : 0;
  return (
    <div className="relative shrink-0" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} className="-rotate-90">
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" strokeWidth={4} className="stroke-fill-strong" />
        <circle
          cx={tam / 2}
          cy={tam / 2}
          r={r}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          className={cn('transition-[stroke-dashoffset] duration-500', frac === 1 ? 'stroke-pos' : 'stroke-accent')}
        />
      </svg>
      <span className="tabular absolute inset-0 grid place-items-center text-[11.5px] font-semibold">
        {frac === 1 ? <Check className="h-4 w-4 text-pos" strokeWidth={3} /> : `${listos}/${total}`}
      </span>
    </div>
  );
}
