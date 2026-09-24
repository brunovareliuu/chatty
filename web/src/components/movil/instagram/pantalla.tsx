'use client';

import { useMemo, useState } from 'react';
import { BarChart3, CircleAlert, CircleDot, Loader2, Lock, RefreshCw, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAccounts } from '@/lib/client/accounts-context';
import { useTableroIg } from '@/lib/estadisticas/cliente';
import {
  METRICAS_DIA,
  cadencia,
  compacto,
  cuandoSePublico,
  decimal,
  diasEntre,
  diasSinPublicar,
  entero,
  hayInsights,
  interaccionesDe,
  nombreGenero,
  nombrePais,
  orientacionAltasBajas,
  ordenarEdades,
  porcentaje,
  porDiaSemana,
  porTipo,
  resumen,
  serieDiaria,
  totalDe,
  type ClaveSerie,
  type Orientacion,
  type Resumen,
  esUnDia,
  fechaCorta,
  filasPorDia,
  periodoGrafica,
  textoRango,
  NOMBRE_ZONA_LOCAL,
} from '@/lib/estadisticas/calculos';
import {
  bandejaDelPeriodo,
  cifrasPrincipales,
  desgloseInteracciones,
  metricasDisponibles,
  type CifraIg,
} from '@/lib/estadisticas/cifras';
import { lecturas, type Lectura } from '@/lib/estadisticas/lecturas';
import {
  DIAS_DE_HISTORIAL,
  NOMBRE_TIPO,
  NOMBRE_TIPO_PLURAL,
  RANGOS,
  type PostIg,
  type Rango,
  type RangoLargo,
  type Reparto,
  type TableroIg,
} from '@/lib/estadisticas/tipos';
import { Pantalla, AccionBarra } from '@/components/movil/ui/pantalla';
import { Seccion, Fila, FilaEnlace } from '@/components/movil/ui/lista';
import { Cargando, Segmentado, Vacio } from '@/components/movil/ui/controles';
import { Chispa, Delta, Medidor, Miniatura } from '@/components/estadisticas/piezas';
import { GraficaDia } from '@/components/estadisticas/graficas';
import { RECONECTAR } from '@/components/estadisticas/secciones';

/**
 * Instagram — el tablero de /instagram en el celular. Los números salen de las
 * mismas funciones que el escritorio (`lib/estadisticas`); aquí solo cambia
 * la pintura: cifras arriba, una sola gráfica y lo demás en listas de iOS.
 */
export function PantallaInstagramMovil({ rangoInicial }: { rangoInicial?: Rango }) {
  const { account, loading } = useAccounts();
  const { tablero, cargando, error, actualizando, actualizar } = useTableroIg(account?.id ?? null);

  return (
    <VistaInstagramMovil
      tablero={tablero}
      rangoInicial={rangoInicial}
      sinCuenta={!loading && !account}
      cargando={cargando || loading}
      error={error}
      actualizando={actualizando}
      onActualizar={async () => {
        const r = await actualizar();
        if (r && !r.ok) toast.error(r.error ?? 'No se pudo actualizar');
      }}
    />
  );
}

/** La pintura, sin datos: la usan la pantalla y el arnés de capturas. */
export function VistaInstagramMovil({
  tablero,
  rangoInicial,
  sinCuenta,
  cargando,
  error,
  actualizando,
  onActualizar,
}: {
  tablero: TableroIg | null;
  rangoInicial?: Rango;
  sinCuenta: boolean;
  cargando: boolean;
  error: string | null;
  actualizando: boolean;
  onActualizar: () => void;
}) {
  const [rango, setRango] = useState<string>(String(rangoInicial ?? 28));
  const rangoReal: Rango = rango === 'hoy' || rango === 'ayer' ? rango : (Number(rango) as RangoLargo);

  return (
    <Pantalla
      titulo="Instagram"
      descripcion={tablero?.perfil ? `Cómo va @${tablero.perfil.username}.` : 'Cómo va tu cuenta.'}
      atras={{ etiqueta: 'Más' }}
      accion={
        <AccionBarra onClick={onActualizar} disabled={actualizando} aria-label="Actualizar">
          <RefreshCw className={cn('h-[19px] w-[19px]', actualizando && 'animate-spin')} />
        </AccionBarra>
      }
      bajoBarra={
        <Segmentado
          valor={rango}
          onChange={setRango}
          opciones={RANGOS.map((r) => ({ valor: String(r.valor), label: r.label }))}
        />
      }
    >
      {sinCuenta && (
        <Vacio
          icon={BarChart3}
          titulo="Conecta tu cuenta primero"
          detalle="El tablero lee la cuenta de Instagram conectada al panel."
        />
      )}
      {!tablero && cargando && <Cargando />}
      {!tablero && !cargando && error && <Vacio icon={BarChart3} titulo="No se pudo cargar" detalle={error} />}
      {tablero && (
        <div className={cn('transition-opacity', actualizando && 'opacity-60')}>
          <Contenido t={tablero} rango={rangoReal} />
        </div>
      )}
    </Pantalla>
  );
}

function Contenido({ t, rango }: { t: TableroIg; rango: Rango }) {
  const orientacion = useMemo(() => orientacionAltasBajas(t.dias), [t.dias]);
  const r = useMemo(() => resumen(t, rango, orientacion), [t, rango, orientacion]);
  const conInsights = hayInsights(t, r.actual);
  const { principales, secundarias } = cifrasPrincipales(t, r, orientacion);
  const importantes = lecturas(t, r);

  return (
    <>
      {!t.estado.conPermiso && (
        <Seccion
          titulo="Falta un permiso"
          pie="Sin él, Instagram solo deja ver likes y comentarios. Con él ves alcance, vistas, guardados, quién te sigue y quién te deja, y tu audiencia. Tus DMs siguen igual."
        >
          <FilaAncla href={RECONECTAR} titulo="Reconectar Instagram" />
        </Seccion>
      )}

      {t.estado.conPermiso && !t.estado.historialCompleto && (
        <Seccion>
          <Fila
            titulo="Bajando tu historial"
            subtitulo={`${t.estado.historialDesde ? Math.min(DIAS_DE_HISTORIAL, diasEntre(t.estado.historialDesde, t.hoy)) : 0} de ${DIAS_DE_HISTORIAL} días · se llena solo`}
            derecha={<Loader2 className="h-5 w-5 animate-spin text-accent" />}
            ultima
          />
        </Seccion>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 px-4">
        {principales.map((c) => (
          <CifraMovil key={c.id} cifra={c} />
        ))}
        {secundarias.map((c) => (
          <CifraMovil key={c.id} cifra={c} chica />
        ))}
      </div>

      {importantes.length > 0 && (
        <Seccion titulo="Lo importante">
          {importantes.map((l, i) => (
            <Fila
              key={l.id}
              izquierda={<IconoLectura tono={l.tono} />}
              titulo={<span className="block text-[15px] leading-[1.35]">{l.texto}</span>}
              ultima={i === importantes.length - 1}
            />
          ))}
        </Seccion>
      )}

      <SerieMovil t={t} r={r} orientacion={orientacion} />

      <DiasMovil t={t} r={r} orientacion={orientacion} />

      {conInsights && <SeccionesConInsights r={r} />}

      <Posts t={t} seguidores={r.seguidores.ahora} />

      <QueFunciona posts={t.posts} ahora={t.generadoEn} />

      {t.audiencia && <AudienciaMovil t={t} />}

      {t.historias.length > 0 && (
        <Seccion titulo="Historias" pie="Instagram borra estos números a las 24 h; aquí se quedan.">
          {t.historias.slice(0, 8).map((h, i, lista) => (
            <Fila
              key={h.id}
              izquierda={
                <Miniatura
                  src={h.miniatura}
                  tipo={h.esVideo ? 'video' : 'foto'}
                  className="h-[38px] w-[29px] rounded-[6px]"
                />
              }
              titulo={cuandoSePublico(h.fecha)}
              subtitulo={
                h.metricas
                  ? `${compacto(h.metricas.alcance)} alcance · ${compacto(h.metricas.respuestas ?? 0)} respuestas`
                  : 'Sin números'
              }
              valor={h.metricas?.vistas != null ? compacto(h.metricas.vistas) : undefined}
              ultima={i === lista.length - 1}
            />
          ))}
        </Seccion>
      )}

      <BandejaMovil t={t} r={r} />

      <p className="px-8 text-[13px] leading-[1.35] text-muted">
        Fuente: API de Instagram. Los periodos terminan ayer porque Meta tarda hasta 48 h en cerrar cada
        día; los días se cuentan en hora del Pacífico, como en Instagram.
      </p>
    </>
  );
}

/** La misma caja de cifra que Hoy, con su mini-gráfica. */
function CifraMovil({ cifra, chica }: { cifra: CifraIg; chica?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-card bg-surface p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-[13px] leading-tight font-medium">{cifra.label}</p>
        <Delta cambio={cifra.cambio} className="shrink-0" />
      </div>
      <div>
        {cifra.bloqueada ? (
          <Lock className="h-6 w-6 text-faint" aria-label="Sin permiso" />
        ) : (
          <p
            className={cn(
              'leading-none font-bold tracking-[-0.02em]',
              chica ? 'text-[22px]' : 'text-[28px]',
            )}
          >
            {cifra.valor}
          </p>
        )}
        <p className="mt-1 line-clamp-2 text-[12px] leading-tight text-muted">{cifra.detalle}</p>
      </div>
      {cifra.serie && cifra.serie.filter((v) => v != null).length > 1 && <Chispa valores={cifra.serie} />}
    </div>
  );
}

const DIA_SEMANA = (fecha: string) => {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-MX', { weekday: 'short', timeZone: 'UTC' });
};

/** Día por día en números: una fila por día, con lo que se sabe de él. */
function DiasMovil({ t, r, orientacion }: { t: TableroIg; r: Resumen; orientacion: Orientacion }) {
  const filas = filasPorDia(t, { desde: periodoGrafica(t.hoy, r.rango).desde, hasta: t.hoy }, orientacion)
    .filter(
      (f) =>
        f.parcial ||
        f.posts > 0 ||
        [f.vistas, f.likes, f.comentarios, f.neto, f.seguidores].some((v) => v != null),
    )
    .slice(0, 14);
  if (filas.length < 2) return null;
  return (
    <Seccion
      titulo="Cada día, en números"
      pie="Hoy va a medias hasta que Meta lo cierra. A la derecha, cuántos seguidores ganaste o perdiste."
    >
      {filas.map((f, i) => {
        const partes = [
          f.vistas != null && `${entero(f.vistas)} vistas`,
          f.likes != null && `${entero(f.likes)} likes`,
          f.comentarios != null && `${entero(f.comentarios)} coment.`,
          f.posts > 0 && `${f.posts} ${f.posts === 1 ? 'post' : 'posts'}`,
        ].filter(Boolean);
        const marcado = esUnDia(r.rango) && f.fecha === r.actual.desde;
        return (
          <Fila
            key={f.fecha}
            titulo={
              <span className={cn('block truncate text-[17px] leading-[1.35]', marcado && 'font-semibold')}>
                {f.parcial ? 'Hoy' : `${DIA_SEMANA(f.fecha)} ${fechaCorta(f.fecha)}`}
              </span>
            }
            subtitulo={partes.length ? partes.join(' · ') : f.seguidores != null ? `${entero(f.seguidores)} seguidores` : 'Sin datos'}
            valor={
              f.neto == null ? (
                <span className="shrink-0 text-[17px] text-faint">—</span>
              ) : (
                <span
                  className={cn(
                    'shrink-0 text-[17px] tabular-nums',
                    f.neto > 0 ? 'text-pos' : f.neto < 0 ? 'text-neg' : 'text-muted',
                  )}
                >
                  {f.neto > 0 ? '+' : f.neto < 0 ? '−' : ''}
                  {entero(Math.abs(f.neto))}
                </span>
              )
            }
            ultima={i === filas.length - 1}
          />
        );
      })}
    </Seccion>
  );
}

function IconoLectura({ tono }: { tono: Lectura['tono'] }) {
  if (tono === 'bien') return <TrendingUp className="h-[19px] w-[19px] text-pos" aria-label="Va bien" />;
  if (tono === 'ojo') return <CircleAlert className="h-[19px] w-[19px] text-accent" aria-label="Para atender" />;
  return <CircleDot className="h-[19px] w-[19px] text-faint" aria-hidden />;
}

/**
 * Una ancla de verdad, no `next/link`: la navegación del cliente no seguiría
 * el redirect a Instagram.
 */
function FilaAncla({ href, titulo }: { href: string; titulo: string }) {
  return (
    <a
      href={href}
      className="relative flex min-h-[44px] w-full items-center gap-3 px-4 py-[11px] active:bg-surface-2"
    >
      <span className="min-w-0 flex-1 truncate text-[17px] text-accent">{titulo}</span>
    </a>
  );
}

function SerieMovil({ t, r, orientacion }: { t: TableroIg; r: Resumen; orientacion: Orientacion }) {
  const disponibles = metricasDisponibles(t);
  const [elegida, setElegida] = useState<ClaveSerie>(disponibles[0]);
  const metrica = disponibles.includes(elegida) ? elegida : disponibles[0];
  const puntos = serieDiaria(t, periodoGrafica(t.hoy, r.rango), metrica, orientacion);
  if (puntos.filter((p) => p.valor != null).length < 2) return null;

  return (
    <section className="mb-8">
      <div className="px-8 pb-1.5">
        <h2 className="text-[13px] font-normal tracking-[0.03em] text-muted uppercase">Día por día</h2>
      </div>
      {disponibles.length > 1 && (
        <div className="px-4 pb-2">
          <Segmentado
            valor={metrica}
            onChange={setElegida}
            opciones={disponibles.slice(0, 4).map((m) => ({ valor: m, label: METRICAS_DIA[m].label }))}
          />
        </div>
      )}
      <div className="mx-4 rounded-card bg-surface px-1 pt-3 pb-1">
        <GraficaDia
          puntos={puntos}
          nombre={METRICAS_DIA[metrica].label}
          desdeCero={metrica !== 'seguidores'}
          alto={150}
        />
      </div>
      <p className="px-8 pt-2 text-[13px] leading-[1.35] text-muted">{METRICAS_DIA[metrica].ayuda}</p>
    </section>
  );
}

function SeccionesConInsights({ r }: { r: Resumen }) {
  const { altas, bajas } = r.seguidores;
  const vistas = r.vistasPorSeguidor;
  const desglose = desgloseInteracciones(r);
  return (
    <>
      {altas != null && bajas != null && (
        <Seccion titulo={`Seguidores ${textoRango(r.rango)}`}>
          <Fila titulo="Te siguieron" valor={entero(altas)} />
          <Fila titulo="Dejaron de seguirte" valor={entero(bajas)} />
          <Fila
            titulo="Neto"
            valor={
              <span className={cn('text-[17px] font-semibold', altas - bajas >= 0 ? 'text-pos' : 'text-neg')}>
                {altas - bajas >= 0 ? '+' : '−'}
                {entero(Math.abs(altas - bajas))}
              </span>
            }
            ultima
          />
        </Seccion>
      )}

      {vistas && vistas.seguidores + vistas.noSeguidores > 0 && (
        <Seccion titulo="Quién te ve" pie="Cuánto de lo que ven llega a gente que todavía no te sigue.">
          <div className="px-4 py-3.5">
            <Medidor
              label="Vistas"
              parte={vistas.noSeguidores}
              total={vistas.seguidores + vistas.noSeguidores}
              nombreParte="No te siguen"
              nombreResto="Te siguen"
            />
          </div>
        </Seccion>
      )}

      {desglose.length > 0 && (
        <Seccion titulo="Tus interacciones">
          {desglose.map((d, i) => (
            <Fila
              key={d.id}
              titulo={d.label}
              valor={
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="text-[17px] text-muted tabular-nums">{entero(d.actual)}</span>
                  <Delta cambio={d.cambio} />
                </span>
              }
              ultima={i === desglose.length - 1}
            />
          ))}
        </Seccion>
      )}
    </>
  );
}

function FilaPost({ post, valor, ultima }: { post: PostIg; valor: string; ultima?: boolean }) {
  const contenido = (
    <>
      <Miniatura src={post.miniatura} tipo={post.tipo} className="h-[46px] w-[36px] rounded-[7px]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] leading-[1.35]">{post.caption || 'Sin texto'}</span>
        <span className="mt-0.5 block truncate text-[13px] leading-[1.35] text-muted">
          {NOMBRE_TIPO[post.tipo]} · {cuandoSePublico(post.fecha)}
        </span>
      </span>
      <span className="shrink-0 text-[17px] text-muted tabular-nums">{valor}</span>
    </>
  );
  const clases = cn(
    'relative flex w-full min-h-[44px] items-center gap-3 px-4 py-2 text-left active:bg-surface-2',
    !ultima && 'sep-ios',
  );
  return post.permalink ? (
    <a
      href={post.permalink}
      target="_blank"
      rel="noreferrer"
      className={clases}
      style={{ ['--sangria' as string]: '64px' }}
    >
      {contenido}
    </a>
  ) : (
    <div className={clases} style={{ ['--sangria' as string]: '64px' }}>
      {contenido}
    </div>
  );
}

function Posts({ t, seguidores }: { t: TableroIg; seguidores: number | null }) {
  const [vista, setVista] = useState<'mejores' | 'recientes'>('mejores');
  if (!t.posts.length) return null;
  const lista =
    vista === 'mejores'
      ? [...t.posts].sort((a, b) => interaccionesDe(b) - interaccionesDe(a)).slice(0, 8)
      : t.posts.slice(0, 8);
  return (
    <section className="mb-8">
      <div className="flex items-end justify-between gap-3 px-8 pb-1.5">
        <h2 className="text-[13px] font-normal tracking-[0.03em] text-muted uppercase">
          Tus publicaciones · {t.posts.length}
        </h2>
        <span className="text-[13px] text-muted">interacciones</span>
      </div>
      <div className="px-4 pb-2">
        <Segmentado
          valor={vista}
          onChange={setVista}
          opciones={[
            { valor: 'mejores', label: 'Las que más jalaron' },
            { valor: 'recientes', label: 'Recientes' },
          ]}
        />
      </div>
      <div className="mx-4 overflow-hidden rounded-card bg-surface">
        {lista.map((p, i) => (
          <FilaPost key={p.id} post={p} valor={entero(interaccionesDe(p))} ultima={i === lista.length - 1} />
        ))}
      </div>
      {seguidores != null && (
        <p className="px-8 pt-2 text-[13px] leading-[1.35] text-muted">
          {t.posts.some((p) => p.metricas)
            ? 'Likes, comentarios, guardados y compartidos de cada una.'
            : 'Likes y comentarios de cada una. Toca para abrirla en Instagram.'}
        </p>
      )}
    </section>
  );
}

/** Un ranking en filas: el número a la derecha y la barrita debajo. */
function FilasConBarra({
  filas,
  formato,
  pie,
  titulo,
  tope,
}: {
  titulo: string;
  filas: { clave: string; label: string; valor: number; detalle?: string }[];
  formato: (n: number) => string;
  pie?: string;
  tope?: number;
}) {
  if (!filas.length) return null;
  const max = tope ?? Math.max(1, ...filas.map((f) => f.valor));
  return (
    <Seccion titulo={titulo} pie={pie}>
      {filas.map((f, i) => (
        <Fila
          key={f.clave}
          titulo={
            <span className="block truncate text-[17px] leading-[1.35]">
              {f.label}
              {f.detalle && <span className="text-muted"> · {f.detalle}</span>}
            </span>
          }
          subtitulo={
            <span className="mt-2 block h-[3px] w-full overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${Math.max(2, (f.valor / max) * 100)}%` }}
              />
            </span>
          }
          valor={<span className="w-[64px] shrink-0 text-right text-[17px] text-muted tabular-nums">{formato(f.valor)}</span>}
          ultima={i === filas.length - 1}
        />
      ))}
    </Seccion>
  );
}

function QueFunciona({ posts, ahora }: { posts: PostIg[]; ahora: number }) {
  if (!posts.length) return null;
  const tipos = porTipo(posts);
  const dias = porDiaSemana(posts)
    .filter((d) => d.n > 0 && d.tipico != null)
    .sort((a, b) => (b.tipico ?? 0) - (a.tipico ?? 0));
  const semanas = cadencia(posts, ahora, 12);
  const enSemanas = semanas.reduce((s, x) => s + x.n, 0);
  const sinPublicar = diasSinPublicar(posts, ahora);
  const muestra = posts.length < 15 ? `Con ${posts.length} publicaciones es una pista, no una regla.` : undefined;

  return (
    <>
      <FilasConBarra
        titulo="Por tipo · un post típico"
        filas={tipos.map((g) => ({
          clave: g.tipo,
          label: NOMBRE_TIPO_PLURAL[g.tipo],
          detalle: `${g.n}`,
          valor: Math.round(g.interacciones),
        }))}
        formato={entero}
      />
      <FilasConBarra
        titulo="Día en que publicas"
        filas={dias.map((d) => ({
          clave: d.clave,
          label: d.largo.charAt(0).toUpperCase() + d.largo.slice(1),
          detalle: `${d.n} ${d.n === 1 ? 'post' : 'posts'}`,
          valor: Math.round(d.tipico ?? 0),
        }))}
        formato={entero}
        pie={`Interacciones de un post típico (la mediana), ${NOMBRE_ZONA_LOCAL}.${muestra ? ` ${muestra}` : ''}`}
      />
      <Seccion titulo="Constancia">
        <Fila
          titulo="Última publicación"
          valor={
            sinPublicar == null ? '—' : sinPublicar === 0 ? 'hoy' : `hace ${sinPublicar} ${sinPublicar === 1 ? 'día' : 'días'}`
          }
        />
        <Fila titulo="Por semana (últimas 12)" valor={decimal(enSemanas / 12)} ultima />
      </Seccion>
    </>
  );
}

function AudienciaMovil({ t }: { t: TableroIg }) {
  const demo = t.audiencia?.seguidores ?? t.audiencia?.interaccion;
  if (!demo) return null;
  const pct = (r: Reparto) => {
    const total = totalDe(r);
    return (n: number) => porcentaje(total ? (n / total) * 100 : 0, 0);
  };
  const quien = t.audiencia?.seguidores ? 'Te siguen' : 'Interactúan contigo';
  return (
    <>
      <FilasConBarra
        titulo={`Tu audiencia · edad`}
        filas={ordenarEdades(demo.edad).map((e) => ({ clave: e.clave, label: `${e.clave} años`, valor: e.valor }))}
        formato={pct(demo.edad)}
        pie={`${quien}, según Instagram.`}
      />
      <FilasConBarra
        titulo="Género"
        filas={demo.genero.map((g) => ({ clave: g.clave, label: nombreGenero(g.clave), valor: g.valor }))}
        formato={pct(demo.genero)}
        tope={totalDe(demo.genero)}
      />
      <FilasConBarra
        titulo="Ciudades"
        filas={demo.ciudad.slice(0, 6).map((c) => ({ clave: c.clave, label: c.clave, valor: c.valor }))}
        formato={pct(demo.ciudad)}
      />
      <FilasConBarra
        titulo="Países"
        filas={demo.pais.slice(0, 5).map((p) => ({ clave: p.clave, label: nombrePais(p.clave), valor: p.valor }))}
        formato={pct(demo.pais)}
      />
    </>
  );
}

function BandejaMovil({ t, r }: { t: TableroIg; r: Resumen }) {
  const b = bandejaDelPeriodo(t, r.enVivo);
  return (
    <Seccion titulo={`Bandeja y leads ${textoRango(r.rango)}`}>
      <FilaEnlace href="/m/contactos" titulo="Te escribieron por primera vez" valor={entero(b.personasNuevas)} />
      <FilaEnlace href="/m/automatizaciones" titulo="Respuestas automáticas" valor={entero(b.disparos)} />
      <FilaEnlace
        href="/m/leads"
        titulo="Leads del cotizador"
        subtitulo={b.leads ? `${entero(b.leadsIg)} llegaron desde Instagram` : undefined}
        valor={entero(b.leads)}
        ultima
      />
    </Seccion>
  );
}
