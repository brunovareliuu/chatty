'use client';

import { ArrowDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  cuandoSePublico,
  duracion,
  entero,
  porcentaje,
  valorPost,
  type ClavePost,
} from '@/lib/estadisticas/calculos';
import type { PostIg } from '@/lib/estadisticas/tipos';
import { ChipTipo, Miniatura } from './piezas';

type Columna = { clave: ClavePost; label: string; formato: (n: number | null) => string; ayuda: string };

const COLUMNAS_BASICAS: Columna[] = [
  { clave: 'likes', label: 'Likes', formato: entero, ayuda: 'Me gusta' },
  { clave: 'comentarios', label: 'Coment.', formato: entero, ayuda: 'Comentarios' },
];

const COLUMNAS_INSIGHTS: Columna[] = [
  { clave: 'vistas', label: 'Vistas', formato: entero, ayuda: 'Veces que se vio' },
  { clave: 'alcance', label: 'Alcance', formato: entero, ayuda: 'Cuentas distintas que lo vieron' },
  ...COLUMNAS_BASICAS,
  { clave: 'guardados', label: 'Guard.', formato: entero, ayuda: 'Veces que lo guardaron' },
  { clave: 'compartidos', label: 'Compart.', formato: entero, ayuda: 'Veces que lo compartieron' },
];

const TASA: Columna = {
  clave: 'tasa',
  label: 'Interacción',
  formato: (n) => porcentaje(n),
  ayuda: 'Interacciones por cada 100 seguidores',
};

/**
 * Todas las publicaciones con sus cifras. Es también la «vista de tabla» de la
 * gráfica de posts: cada número se puede leer sin pasar el cursor.
 */
export function TablaPosts({
  posts,
  conInsights,
  seguidores,
  orden,
  onOrden,
}: {
  posts: PostIg[];
  conInsights: boolean;
  seguidores: number | null;
  orden: ClavePost;
  onOrden: (c: ClavePost) => void;
}) {
  const columnas = [...(conInsights ? COLUMNAS_INSIGHTS : COLUMNAS_BASICAS), TASA];

  return (
    <div className="-mx-4 overflow-x-auto md:-mx-5">
      <table className="w-full min-w-[720px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border text-left text-[12px] text-muted">
            <th className="py-2 pr-3 pl-4 font-medium md:pl-5">
              <BotonOrden activo={orden === 'fecha'} onClick={() => onOrden('fecha')} titulo="Ordenar por fecha">
                Publicación
              </BotonOrden>
            </th>
            {columnas.map((c) => (
              <th
                key={c.clave}
                className="px-3 py-2 text-right font-medium"
                aria-sort={orden === c.clave ? 'descending' : 'none'}
              >
                <BotonOrden
                  activo={orden === c.clave}
                  onClick={() => onOrden(c.clave)}
                  titulo={`${c.ayuda}. Ordenar de mayor a menor`}
                  derecha
                >
                  {c.label}
                </BotonOrden>
              </th>
            ))}
            <th className="w-10 pr-4 md:pr-5" aria-label="Abrir en Instagram" />
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p.id} className="group border-b border-border last:border-b-0 hover:bg-surface-2/60">
              <td className="py-2.5 pr-3 pl-4 md:pl-5">
                <div className="flex min-w-0 items-center gap-3">
                  <Miniatura src={p.miniatura} tipo={p.tipo} className="h-12 w-10 rounded-md" />
                  <div className="min-w-0">
                    <p className="line-clamp-1 max-w-[300px] font-medium">{p.caption || 'Sin texto'}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <ChipTipo tipo={p.tipo} />
                      <span className="text-[12px] text-muted">{cuandoSePublico(p.fecha)}</span>
                      {p.tipo === 'reel' && p.metricas?.promedioVistoMs != null && (
                        <span className="hidden text-[12px] text-muted lg:inline">
                          · lo ven {duracion(p.metricas.promedioVistoMs)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              {columnas.map((c) => (
                <td
                  key={c.clave}
                  className={cn(
                    'px-3 py-2.5 text-right tabular-nums',
                    orden === c.clave ? 'font-semibold text-txt' : 'text-muted',
                  )}
                >
                  {c.formato(valorPost(p, c.clave, seguidores))}
                </td>
              ))}
              <td className="pr-4 text-right md:pr-5">
                {p.permalink && (
                  <a
                    href={p.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-txt"
                    aria-label="Abrir en Instagram"
                    title="Abrir en Instagram"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BotonOrden({
  activo,
  onClick,
  titulo,
  derecha,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  titulo: string;
  derecha?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={titulo}
      className={cn(
        'inline-flex items-center gap-1 transition-colors hover:text-txt',
        derecha && 'flex-row-reverse',
        activo && 'text-txt',
      )}
    >
      {children}
      <ArrowDown className={cn('h-3 w-3', activo ? 'opacity-100' : 'opacity-0')} aria-hidden />
    </button>
  );
}
