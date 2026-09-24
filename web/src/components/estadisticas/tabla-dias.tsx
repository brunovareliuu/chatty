'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { entero, fechaCorta, type FilaDia, type Periodo } from '@/lib/estadisticas/calculos';

type Columna = {
  id: keyof FilaDia;
  label: string;
  ayuda: string;
  /** Neto de seguidores: con signo y en verde o rojo. */
  conSigno?: boolean;
};

const COLUMNAS: Columna[] = [
  { id: 'seguidores', label: 'Seguidores', ayuda: 'Al cierre del día' },
  { id: 'neto', label: 'Neto', ayuda: 'Cuántos seguidores ganaste o perdiste ese día', conSigno: true },
  { id: 'vistas', label: 'Vistas', ayuda: 'Veces que se vio tu contenido' },
  { id: 'alcance', label: 'Alcance', ayuda: 'Cuentas distintas que te vieron ese día' },
  { id: 'likes', label: 'Likes', ayuda: 'Likes que recibieron tus publicaciones' },
  { id: 'comentarios', label: 'Coment.', ayuda: 'Comentarios que recibieron tus publicaciones' },
  { id: 'guardados', label: 'Guard.', ayuda: 'Veces que guardaron algo tuyo' },
  { id: 'compartidos', label: 'Compart.', ayuda: 'Veces que compartieron algo tuyo' },
  { id: 'posts', label: 'Posts', ayuda: 'Publicaciones de ese día' },
];

const diaSemana = (fecha: string) => {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-MX', { weekday: 'short', timeZone: 'UTC' });
};

/**
 * Cada día en números exactos, del más nuevo al más viejo. Solo salen las
 * columnas que tienen algún dato. `marcado` resalta el día que se eligió
 * arriba (Hoy / Ayer).
 */
export function TablaDias({ filas, marcado }: { filas: FilaDia[]; marcado?: Periodo }) {
  const [todas, setTodas] = useState(false);
  const columnas = COLUMNAS.filter((c) =>
    filas.some((f) => (c.id === 'posts' ? f.posts > 0 : f[c.id] != null)),
  );
  const visibles = todas ? filas : filas.slice(0, 14);

  return (
    <div>
      <div className="-mx-4 overflow-x-auto md:-mx-5">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border text-[12px] text-muted">
              <th className="py-2 pr-3 pl-4 text-left font-medium md:pl-5">Día</th>
              {columnas.map((c) => (
                <th key={c.id} className="px-3 py-2 text-right font-medium" title={c.ayuda}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => {
              const elegido = marcado && f.fecha >= marcado.desde && f.fecha <= marcado.hasta;
              return (
                <tr
                  key={f.fecha}
                  className={cn('border-b border-border last:border-b-0', elegido && 'bg-accent-soft/50')}
                >
                  <td className="py-2 pr-3 pl-4 whitespace-nowrap md:pl-5">
                    <span className="font-medium">{fechaCorta(f.fecha)}</span>{' '}
                    <span className="text-muted">{f.parcial ? 'hoy, va a medias' : diaSemana(f.fecha)}</span>
                  </td>
                  {columnas.map((c) => {
                    const v = c.id === 'posts' ? f.posts || null : (f[c.id] as number | null);
                    return (
                      <td
                        key={c.id}
                        className={cn(
                          'px-3 py-2 text-right tabular-nums',
                          v == null && 'text-faint',
                          c.conSigno && v != null && v > 0 && 'text-pos',
                          c.conSigno && v != null && v < 0 && 'text-neg',
                        )}
                        title={c.id === 'seguidores' && f.estimado ? 'Calculado con altas y bajas' : undefined}
                      >
                        {v == null
                          ? '—'
                          : c.conSigno
                            ? `${v > 0 ? '+' : v < 0 ? '−' : ''}${entero(Math.abs(v))}`
                            : entero(v)}
                        {c.id === 'seguidores' && f.estimado && v != null && <span className="text-faint">*</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {filas.length > 14 ? (
          <button onClick={() => setTodas((v) => !v)} className="text-[13px] font-semibold text-accent hover:underline">
            {todas ? 'Ver menos' : `Ver los ${filas.length} días`}
          </button>
        ) : (
          <span />
        )}
        {filas.some((f) => f.estimado) && (
          <p className="text-[11px] text-faint">* Calculado con las altas y bajas que reporta Instagram.</p>
        )}
      </div>
    </div>
  );
}
