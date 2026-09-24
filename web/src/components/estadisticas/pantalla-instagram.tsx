'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAccounts } from '@/lib/client/accounts-context';
import { useTableroIg } from '@/lib/estadisticas/cliente';
import {
  METRICAS_DIA,
  compacto,
  decimal,
  entero,
  esUnDia,
  fechaCorta,
  filasPorDia,
  hace,
  hayInsights,
  orientacionAltasBajas,
  ordenarPosts,
  periodoGrafica,
  postsEnPeriodo,
  resumen,
  serieAltasBajas,
  serieDiaria,
  textoRango,
  valorPost,
  type ClavePost,
  type ClaveSerie,
  type Resumen,
} from '@/lib/estadisticas/calculos';
import { cifrasPrincipales, desgloseInteracciones, metricasDisponibles } from '@/lib/estadisticas/cifras';
import { lecturas } from '@/lib/estadisticas/lecturas';
import { NOMBRE_TIPO_PLURAL, RANGOS, type Rango, type TableroIg, type TipoPost } from '@/lib/estadisticas/tipos';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { InstagramIcon } from '@/components/ui/instagram-icon';
import { PageHeader } from '@/components/shell/page-header';
import { GraficaAltasBajas, GraficaDia, GraficaPosts } from './graficas';
import { Cifra, Delta, Medidor, Segmentos, Tarjeta } from './piezas';
import {
  Audiencia,
  AvisoError,
  AvisoHistorial,
  AvisoPermiso,
  Bandeja,
  Historias,
  Identidad,
  LoImportante,
  QueTeFunciona,
  RECONECTAR,
} from './secciones';
import { TablaDias } from './tabla-dias';
import { TablaPosts } from './tabla-posts';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * /instagram — cómo va la cuenta: seguidores, vistas, alcance, qué post jala,
 * quién te ve y lo que llegó a la bandeja. Todo sale de lo que el cron fue
 * guardando (`lib/estadisticas/servidor.ts`); la pantalla solo hace cuentas.
 */
export function PantallaInstagram({
  conectada,
  error,
  rangoInicial,
}: {
  /** Meta nos regresó aquí después de reconectar. */
  conectada: string | null;
  error: string | null;
  /** `?rango=hoy` abre directo en ese periodo. */
  rangoInicial?: Rango;
}) {
  const { account, loading } = useAccounts();
  const datos = useTableroIg(account?.id ?? null);

  useEffect(() => {
    if (conectada) toast.success(`@${conectada} reconectada. Ya empecé a bajar tus estadísticas.`);
    if (error) toast.error(error);
    // Que un refresh no repita el aviso.
    if (conectada || error) window.history.replaceState({}, '', '/instagram');
  }, [conectada, error]);

  if (!loading && !account) {
    return (
      <>
        <PageHeader title="Instagram" description="Cómo va tu cuenta: seguidores, alcance, tus posts y quién te ve." />
        <Empty
          icon={InstagramIcon}
          title="Conecta tu cuenta primero"
          description="El tablero lee la cuenta de Instagram conectada al panel."
          action={
            <a
              href={RECONECTAR}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[14px] font-semibold text-accent-fg hover:opacity-90"
            >
              Conectar Instagram
            </a>
          }
        />
      </>
    );
  }

  return (
    <VistaInstagram
      tablero={datos.tablero}
      rangoInicial={rangoInicial}
      cargando={datos.cargando || loading}
      actualizando={datos.actualizando}
      error={datos.error}
      onActualizar={async () => {
        const r = await datos.actualizar();
        if (r && !r.ok) toast.error(r.error ?? 'No se pudo actualizar');
      }}
    />
  );
}

/** La pintura, sin datos: la usan la pantalla y el arnés de capturas. */
export function VistaInstagram({
  tablero,
  rangoInicial,
  cargando,
  actualizando,
  error,
  onActualizar,
}: {
  tablero: TableroIg | null;
  rangoInicial?: Rango;
  cargando: boolean;
  actualizando: boolean;
  error: string | null;
  onActualizar: () => void;
}) {
  const [rango, setRango] = useState<Rango>(rangoInicial ?? 28);

  return (
    <>
      <PageHeader
        title="Instagram"
        description={
          tablero?.perfil
            ? `Cómo va @${tablero.perfil.username}: seguidores, alcance, tus posts y quién te ve.`
            : 'Cómo va tu cuenta: seguidores, alcance, tus posts y quién te ve.'
        }
      />

      {/* Un solo renglón de filtros, arriba de todo lo que filtran. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
        <Segmentos
          etiqueta="Periodo"
          valor={rango}
          opciones={RANGOS.map((r) => ({ valor: r.valor, label: r.label }))}
          onChange={setRango}
        />
        <div className="flex items-center gap-3">
          {tablero && (
            <span className="text-[12px] text-muted" title="La foto del perfil se toma cada hora">
              Actualizado {hace(tablero.estado.perfilEn, tablero.generadoEn)}
            </span>
          )}
          <Button size="sm" variant="secondary" onClick={onActualizar} loading={actualizando}>
            {!actualizando && <RefreshCw className="h-3.5 w-3.5" />}
            Actualizar
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!tablero && cargando && (
          <div className="flex justify-center py-24">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        )}
        {!tablero && !cargando && error && (
          <Empty icon={BarChart3} title="No se pudo cargar el tablero" description={error} />
        )}
        {tablero && (
          <Tablero tablero={tablero} rango={rango} className={cn(actualizando && 'opacity-60')} />
        )}
      </div>
    </>
  );
}

function Tablero({ tablero: t, rango, className }: { tablero: TableroIg; rango: Rango; className?: string }) {
  const orientacion = useMemo(() => orientacionAltasBajas(t.dias), [t.dias]);
  const r = useMemo(() => resumen(t, rango, orientacion), [t, rango, orientacion]);
  const conInsights = hayInsights(t, r.actual);
  const { principales, secundarias } = cifrasPrincipales(t, r, orientacion);
  const importantes = lecturas(t, r);
  // La tabla de días: lo mismo que la gráfica, hasta hoy, sin días vacíos.
  const filas = filasPorDia(t, { desde: periodoGrafica(t.hoy, rango).desde, hasta: t.hoy }, orientacion).filter(
    (f) =>
      f.parcial ||
      f.posts > 0 ||
      [f.seguidores, f.neto, f.vistas, f.alcance, f.likes, f.comentarios, f.guardados, f.compartidos].some(
        (v) => v != null,
      ),
  );

  return (
    <div className={cn('mx-auto max-w-[1200px] space-y-5 px-4 py-5 transition-opacity md:px-6 md:py-6', className)}>
      {!t.estado.conPermiso && <AvisoPermiso motivo={t.estado.motivoSinPermiso} />}
      {t.estado.conPermiso && !t.estado.historialCompleto && (
        <AvisoHistorial desde={t.estado.historialDesde} hoy={t.hoy} />
      )}
      {t.estado.ultimoError && <AvisoError error={t.estado.ultimoError} />}

      {t.perfil && <Identidad perfil={t.perfil} />}

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {principales.map((c) => (
            <Cifra key={c.id} {...c} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {secundarias.map((c) => (
            <Cifra key={c.id} {...c} chica />
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <DiaPorDia tablero={t} r={r} orientacion={orientacion} className="lg:col-span-2" />
        <LoImportante lecturas={importantes} />
      </div>

      {filas.length > 1 && (
        <Tarjeta
          titulo="Día por día, en números"
          detalle={
            esUnDia(rango)
              ? `Los últimos 14 días; resaltado, ${rango === 'hoy' ? 'hoy' : 'ayer'}. Hoy va a medias hasta que Meta lo cierra.`
              : 'Cada día con sus cifras exactas, del más nuevo al más viejo. Hoy va a medias hasta que Meta lo cierra.'
          }
        >
          <TablaDias filas={filas} marcado={esUnDia(rango) ? r.actual : undefined} />
        </Tarjeta>
      )}

      {conInsights && (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <AltasBajas tablero={t} r={r} orientacion={orientacion} className="lg:col-span-2" />
            <QuienTeVe r={r} />
          </div>
          <Desglose r={r} />
        </>
      )}

      <Publicaciones tablero={t} r={r} conInsights={t.posts.some((p) => p.metricas)} />

      <QueTeFunciona posts={t.posts} ahora={t.generadoEn} />

      {t.audiencia && (t.audiencia.seguidores || t.audiencia.interaccion) && (
        <Audiencia audiencia={t.audiencia} />
      )}

      <Historias historias={t.historias} />

      <Bandeja tablero={t} periodo={r.enVivo} texto={textoRango(rango)} />

      <p className="pb-4 text-[11px] leading-relaxed text-faint">
        Fuente: API de Instagram. Meta tarda hasta 48 horas en cerrar cada día y los cuenta en hora del Pacífico,
        así que los periodos largos terminan ayer y «Hoy» va a medias.{' '}
        {esUnDia(rango)
          ? `Se ve el ${fechaCorta(r.actual.desde)}${rango === 'ayer' ? `, contra el ${fechaCorta(r.anterior.desde)}` : ''}.`
          : `Del ${fechaCorta(r.actual.desde)} al ${fechaCorta(r.actual.hasta)}, contra el ${fechaCorta(r.anterior.desde)} al ${fechaCorta(r.anterior.hasta)}.`}{' '}
        Publicaciones, DMs y leads se cuentan en vivo.
      </p>
    </div>
  );
}

function DiaPorDia({
  tablero: t,
  r,
  orientacion,
  className,
}: {
  tablero: TableroIg;
  r: Resumen;
  orientacion: ReturnType<typeof orientacionAltasBajas>;
  className?: string;
}) {
  const disponibles = metricasDisponibles(t);
  const [elegida, setElegida] = useState<ClaveSerie>(disponibles[0]);
  const metrica = disponibles.includes(elegida) ? elegida : disponibles[0];

  const puntos = serieDiaria(t, periodoGrafica(t.hoy, r.rango), metrica, orientacion);
  const conValor = puntos.filter((p) => p.valor != null);
  const primeraEstimada = puntos.find((p) => p.estimado && p.valor != null);
  const primeraMedida = puntos.find((p) => !p.estimado && p.valor != null);

  return (
    <Tarjeta
      className={className}
      titulo="Día por día"
      detalle={`${METRICAS_DIA[metrica].ayuda}${esUnDia(r.rango) ? ' Los últimos 14 días.' : ''}`}
      accion={
        disponibles.length > 4 ? (
          <select
            value={metrica}
            onChange={(e) => setElegida(e.target.value as ClaveSerie)}
            aria-label="Qué ver"
            className="h-9 rounded-xl border border-border bg-bg px-3 text-[13px] font-semibold text-txt focus:border-accent focus:outline-none"
          >
            {disponibles.map((m) => (
              <option key={m} value={m}>
                {METRICAS_DIA[m].label}
              </option>
            ))}
          </select>
        ) : disponibles.length > 1 ? (
          <Segmentos
            etiqueta="Qué ver"
            valor={metrica}
            opciones={disponibles.map((m) => ({ valor: m, label: METRICAS_DIA[m].label }))}
            onChange={setElegida}
          />
        ) : undefined
      }
    >
      {conValor.length < 2 ? (
        <div className="grid h-[240px] place-items-center rounded-2xl border border-dashed border-border px-6 text-center">
          <div className="max-w-[440px]">
            <p className="text-[14px] font-semibold">
              {metrica === 'seguidores' ? 'Tu historial de seguidores empieza hoy' : 'Todavía no hay días guardados'}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              {t.estado.conPermiso
                ? 'El panel está bajando tus días de Instagram; en unos minutos aparecen aquí.'
                : 'Cada hora el panel guarda tus seguidores y los likes y comentarios de cada post, así que desde mañana ves cuántos llegaron cada día. Con el permiso de estadísticas se llena al momento con tus últimos 90 días, vistas incluidas.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <GraficaDia puntos={puntos} nombre={METRICAS_DIA[metrica].label} desdeCero={metrica !== 'seguidores'} />
          {metrica === 'seguidores' && primeraEstimada && (
            <p className="mt-2 text-[11px] text-faint">
              {primeraMedida
                ? `Antes del ${fechaCorta(primeraMedida.fecha)}, los seguidores se calculan con las altas y bajas que reporta Instagram.`
                : 'Calculado con las altas y bajas que reporta Instagram.'}
            </p>
          )}
        </>
      )}
    </Tarjeta>
  );
}

function AltasBajas({
  tablero: t,
  r,
  orientacion,
  className,
}: {
  tablero: TableroIg;
  r: Resumen;
  orientacion: ReturnType<typeof orientacionAltasBajas>;
  className?: string;
}) {
  const datos = serieAltasBajas(t, periodoGrafica(t.hoy, r.rango), orientacion);
  const { altas, bajas } = r.seguidores;
  const prefijo = esUnDia(r.rango) ? `${cap(r.rango)}: ` : '';
  const hay = datos.some((d) => d.altas != null);
  const neto = altas != null && bajas != null ? altas - bajas : null;
  const conDatos = datos.filter((d) => d.altas != null).length;
  return (
    <Tarjeta
      className={className}
      titulo="Quién te sigue y quién te deja"
      detalle="Cuentas que te siguieron (arriba) y que dejaron de seguirte (abajo), cada día."
      accion={
        hay ? (
          <div className="flex gap-4 text-[12px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-accent" aria-hidden />
              Te siguieron
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-faint" aria-hidden />
              Se fueron
            </span>
          </div>
        ) : undefined
      }
    >
      {hay ? (
        <>
          <GraficaAltasBajas datos={datos} alto={200} />
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
            <Dato label={`${prefijo}te siguieron`} valor={entero(altas)} />
            <Dato label={`${prefijo}dejaron de seguirte`} valor={entero(bajas)} />
            <Dato
              label="Neto"
              valor={neto == null ? '—' : `${neto >= 0 ? '+' : '−'}${entero(Math.abs(neto))}`}
              tono={neto == null || neto === 0 ? undefined : neto > 0 ? 'text-pos' : 'text-neg'}
            />
            <Dato
              label="Por día"
              valor={neto == null || !conDatos ? '—' : `${neto >= 0 ? '+' : '−'}${decimal(Math.abs(neto) / conDatos)}`}
            />
          </dl>
        </>
      ) : (
        <p className="py-10 text-center text-[13px] text-muted">
          Instagram no da altas y bajas de este periodo (pide 100 seguidores o más).
        </p>
      )}
    </Tarjeta>
  );
}

function Dato({ label, valor, tono }: { label: string; valor: string; tono?: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className={cn('text-[20px] font-bold tracking-[-0.02em]', tono)}>{valor}</dd>
    </div>
  );
}

function QuienTeVe({ r }: { r: Resumen }) {
  const vistas = r.vistasPorSeguidor;
  const alcance = r.alcancePorSeguidor;
  return (
    <Tarjeta titulo="Quién te ve" detalle="Cuánto llega a gente que todavía no te sigue.">
      <div className="space-y-6">
        {vistas && vistas.seguidores + vistas.noSeguidores > 0 && (
          <Medidor
            label="Vistas"
            parte={vistas.noSeguidores}
            total={vistas.seguidores + vistas.noSeguidores}
            nombreParte="No te siguen"
            nombreResto="Te siguen"
          />
        )}
        {alcance && alcance.seguidores + alcance.noSeguidores > 0 && (
          <Medidor
            label="Alcance"
            parte={alcance.noSeguidores}
            total={alcance.seguidores + alcance.noSeguidores}
            nombreParte="No te siguen"
            nombreResto="Te siguen"
          />
        )}
        {!vistas && !alcance && (
          <p className="py-6 text-center text-[13px] text-muted">Instagram no dio el reparto de este periodo.</p>
        )}
        <p className="text-[12px] leading-relaxed text-muted">
          Si la barra naranja domina, tu contenido está llegando a gente nueva.
        </p>
      </div>
    </Tarjeta>
  );
}

/** Todo lo que suma a «Interacciones», en una tira: se lee de un vistazo. */
function Desglose({ r }: { r: Resumen }) {
  const filas = desgloseInteracciones(r);
  if (!filas.length) return null;
  return (
    <Tarjeta
      titulo="De qué están hechas tus interacciones"
      detalle={
        r.rango === 'hoy'
          ? 'Hoy, a medias.'
          : r.rango === 'ayer'
            ? 'Ayer, contra antier.'
            : `En ${r.rango} días, contra los ${r.rango} anteriores.`
      }
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 xl:grid-cols-7">
        {filas.map((d) => (
          <div key={d.id} className="min-w-0">
            <dt className="truncate text-[12px] text-muted">{d.label}</dt>
            <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="text-[20px] font-bold tracking-[-0.02em]">{compacto(d.actual)}</span>
              <Delta cambio={d.cambio} />
            </dd>
          </div>
        ))}
      </dl>
    </Tarjeta>
  );
}

type Filtro = TipoPost | 'todos';

function Publicaciones({ tablero: t, r, conInsights }: { tablero: TableroIg; r: Resumen; conInsights: boolean }) {
  const [tipo, setTipo] = useState<Filtro>('todos');
  const [cifra, setCifra] = useState<ClavePost>('interacciones');
  const [orden, setOrden] = useState<ClavePost>('fecha');
  const [todas, setTodas] = useState(false);

  const tipos = [...new Set(t.posts.map((p) => p.tipo))];
  const visibles = tipo === 'todos' ? t.posts : t.posts.filter((p) => p.tipo === tipo);
  const seguidores = r.seguidores.ahora;
  const enPeriodo = postsEnPeriodo(t.posts, r.enVivo).length;

  const opcionesCifra: { valor: ClavePost; label: string }[] = conInsights
    ? [
        { valor: 'interacciones', label: 'Interacciones' },
        { valor: 'vistas', label: 'Vistas' },
        { valor: 'alcance', label: 'Alcance' },
        { valor: 'guardados', label: 'Guardados' },
        { valor: 'compartidos', label: 'Compartidos' },
      ]
    : [
        { valor: 'interacciones', label: 'Interacciones' },
        { valor: 'likes', label: 'Likes' },
        { valor: 'comentarios', label: 'Comentarios' },
      ];
  const cifraVigente = opcionesCifra.some((o) => o.valor === cifra) ? cifra : 'interacciones';
  const nombreCifra = opcionesCifra.find((o) => o.valor === cifraVigente)?.label ?? 'Interacciones';

  // La gráfica va en orden de fecha y con las últimas 40, para que las barras se lean.
  const filas = [...visibles]
    .sort((a, b) => a.fecha - b.fecha)
    .slice(-40)
    .map((p) => ({ id: p.id, valor: valorPost(p, cifraVigente, seguidores), post: p }));
  const ordenados = orden === 'fecha' ? visibles : ordenarPosts(visibles, orden, seguidores);
  const enTabla = todas ? ordenados : ordenados.slice(0, 12);

  if (!t.posts.length) {
    return (
      <Tarjeta titulo="Tus publicaciones">
        <p className="py-10 text-center text-[13px] text-muted">
          Todavía no hay publicaciones guardadas. El panel las trae en la siguiente actualización.
        </p>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta
      titulo="Tus publicaciones"
      detalle={`${t.posts.length} en total · ${enPeriodo} ${esUnDia(r.rango) ? r.rango : `en ${r.rango} días`}`}
      accion={
        <div className="flex flex-wrap items-center gap-2">
          {tipos.length > 1 && (
            <Segmentos<Filtro>
              etiqueta="Tipo"
              valor={tipo}
              opciones={[
                { valor: 'todos', label: 'Todas' },
                ...tipos.map((x) => ({ valor: x, label: NOMBRE_TIPO_PLURAL[x] })),
              ]}
              onChange={setTipo}
            />
          )}
          <Segmentos etiqueta="Cifra" valor={cifraVigente} opciones={opcionesCifra} onChange={setCifra} />
        </div>
      }
    >
      <GraficaPosts filas={filas} nombre={nombreCifra} />
      <div className="mt-5 border-t border-border pt-2">
        <TablaPosts
          posts={enTabla}
          conInsights={conInsights}
          seguidores={seguidores}
          orden={orden}
          onOrden={setOrden}
        />
        {ordenados.length > 12 && (
          <button
            onClick={() => setTodas((v) => !v)}
            className="mt-3 text-[13px] font-semibold text-accent hover:underline"
          >
            {todas ? 'Ver menos' : `Ver las ${ordenados.length}`}
          </button>
        )}
      </div>
    </Tarjeta>
  );
}
