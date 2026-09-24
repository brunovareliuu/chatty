'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CircleAlert, CircleDot, ExternalLink, Loader2, Lock, TrendingUp, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  cadencia,
  compacto,
  cuandoSePublico,
  decimal,
  diasEntre,
  diasSinPublicar,
  entero,
  fechaCorta,
  nombreGenero,
  nombrePais,
  ordenarEdades,
  porcentaje,
  porDiaSemana,
  porHorario,
  porTipo,
  totalDe,
  NOMBRE_ZONA_LOCAL,
  type Periodo,
} from '@/lib/estadisticas/calculos';
import { bandejaDelPeriodo } from '@/lib/estadisticas/cifras';
import type { Lectura } from '@/lib/estadisticas/lecturas';
import {
  DIAS_DE_HISTORIAL,
  NOMBRE_TIPO_PLURAL,
  type AudienciaIg,
  type HistoriaIg,
  type PerfilIg,
  type PostIg,
  type Reparto,
  type TableroIg,
} from '@/lib/estadisticas/tipos';
import { Avatar } from '@/components/ui/avatar';
import { InstagramIcon } from '@/components/ui/instagram-icon';
import { GraficaColumnas } from './graficas';
import { Miniatura, Ranking, Segmentos, Tarjeta } from './piezas';

/** A dónde regresa Meta después de reconectar: a este mismo tablero. */
export const RECONECTAR = '/api/ig/connect?volver=/instagram';

export function AvisoPermiso({ motivo }: { motivo: string | null }) {
  return (
    <section className="rounded-[18px] border border-accent/40 bg-accent-soft/40 p-4 md:p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg">
          <Lock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">Te falta el permiso de estadísticas de Instagram</p>
          <p className="mt-1 max-w-[680px] text-[13px] leading-relaxed text-muted">
            Sin él, Instagram solo deja ver likes y comentarios. Con él ves alcance, vistas,
            guardados y compartidos por día, quién te sigue y quién te deja, y de dónde es tu
            audiencia. Y el panel baja tus últimos {DIAS_DE_HISTORIAL} días de golpe.
          </p>
          <ol className="mt-3 max-w-[680px] space-y-1.5 text-[13px] leading-relaxed">
            <li>
              <span className="font-semibold">1.</span> Toca «Reconectar Instagram» y acepta. Tus DMs
              y automatizaciones siguen igual.
            </li>
            <li>
              <span className="font-semibold">2.</span> Solo si Instagram contesta que el permiso no
              es válido: en developers.facebook.com abre tu app › Casos de uso › Instagram ›
              Personalizar, agrega <code className="rounded bg-surface-2 px-1 py-0.5 text-[12px]">instagram_business_manage_insights</code> y vuelve a
              reconectar.
            </li>
          </ol>
          {motivo && <p className="mt-2 text-[12px] text-muted">{motivo}</p>}
        </div>
        <a
          href={RECONECTAR}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-accent px-4 text-[14px] font-semibold text-accent-fg transition-opacity hover:opacity-90"
        >
          <InstagramIcon className="h-4 w-4" />
          Reconectar Instagram
        </a>
      </div>
    </section>
  );
}

export function AvisoHistorial({ desde, hoy }: { desde: string | null; hoy: string }) {
  const hechos = desde ? Math.min(DIAS_DE_HISTORIAL, Math.max(0, diasEntre(desde, hoy))) : 0;
  const pct = Math.round((hechos / DIAS_DE_HISTORIAL) * 100);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[18px] border border-border bg-surface px-4 py-3">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden />
      <p className="min-w-0 flex-1 text-[13px]">
        <span className="font-semibold">Bajando tu historial de Instagram:</span>{' '}
        <span className="text-muted">
          {hechos} de {DIAS_DE_HISTORIAL} días. Se llena solo en unos minutos, puedes irte.
        </span>
      </p>
      <div
        className="h-1.5 w-40 overflow-hidden rounded-full bg-accent-soft"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AvisoError({ error }: { error: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[18px] border border-border bg-surface px-4 py-3 text-[13px]">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-neg" aria-hidden />
      <p className="min-w-0">
        <span className="font-semibold">La última actualización falló.</span>{' '}
        <span className="text-muted">Se reintenta sola en unos minutos. Instagram dijo: {error}</span>
      </p>
    </div>
  );
}

export function Identidad({ perfil }: { perfil: PerfilIg }) {
  const datos: [string, number | null][] = [
    ['publicaciones', perfil.publicaciones],
    ['seguidores', perfil.seguidores],
    ['seguidos', perfil.siguiendo],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar src={perfil.foto} name={perfil.username} size={48} />
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold">{perfil.nombre ?? `@${perfil.username}`}</p>
          <a
            href={`https://www.instagram.com/${perfil.username}/`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-txt"
          >
            @{perfil.username} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <dl className="flex gap-6 sm:ml-auto">
        {datos.map(([label, n]) => (
          <div key={label} className="flex flex-col-reverse">
            <dt className="text-[12px] text-muted">{label}</dt>
            <dd className="text-[17px] font-bold">{entero(n)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function IconoLectura({ tono }: { tono: Lectura['tono'] }) {
  const clase = 'mt-0.5 h-4 w-4 shrink-0';
  if (tono === 'bien') return <TrendingUp className={cn(clase, 'text-pos')} aria-label="Va bien" />;
  if (tono === 'ojo') return <CircleAlert className={cn(clase, 'text-accent')} aria-label="Para atender" />;
  return <CircleDot className={cn(clase, 'text-faint')} aria-hidden />;
}

export function LoImportante({ lecturas, className }: { lecturas: Lectura[]; className?: string }) {
  return (
    <Tarjeta titulo="Lo importante" className={className}>
      {lecturas.length === 0 ? (
        <p className="text-[13px] text-muted">Todavía no hay suficiente para sacar conclusiones.</p>
      ) : (
        <ul className="space-y-3.5">
          {lecturas.map((l) => (
            <li key={l.id} className="flex gap-2.5 text-[14px] leading-snug">
              <IconoLectura tono={l.tono} />
              <span>{l.texto}</span>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function QueTeFunciona({ posts, ahora }: { posts: PostIg[]; ahora: number }) {
  if (!posts.length) return null;
  const tipos = porTipo(posts);
  const dias = porDiaSemana(posts);
  const franjas = porHorario(posts).filter((f) => f.n > 0);
  const semanas = cadencia(posts, ahora, 12);
  const enSemanas = semanas.reduce((s, x) => s + x.n, 0);
  const sinPublicar = diasSinPublicar(posts, ahora);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[17px] font-semibold tracking-[-0.2px]">Qué te funciona</h2>
        <p className="text-[12px] text-muted">
          Interacciones de un post típico (la mediana, para que un viral no infle todo), de todas tus
          publicaciones.{posts.length < 15 && ` Con ${posts.length} es una pista, no una regla.`}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Tarjeta titulo="Por tipo">
          <Ranking
            filas={tipos.map((t) => ({
              clave: t.tipo,
              label: (
                <>
                  {NOMBRE_TIPO_PLURAL[t.tipo]} <span className="text-muted">· {t.n}</span>
                </>
              ),
              valor: Math.round(t.interacciones),
            }))}
            formato={entero}
          />
        </Tarjeta>
        <Tarjeta titulo="Día en que publicas" detalle={cap(NOMBRE_ZONA_LOCAL)}>
          <GraficaColumnas
            filas={dias.map((d) => ({
              clave: d.clave,
              label: d.label,
              valor: d.tipico == null ? null : Math.round(d.tipico),
              titulo: `${cap(d.largo)} · ${d.n} ${d.n === 1 ? 'post' : 'posts'}`,
            }))}
            nombre="interacciones, post típico"
            alto={150}
          />
        </Tarjeta>
        <Tarjeta titulo="Hora en que publicas" detalle={cap(NOMBRE_ZONA_LOCAL)}>
          <Ranking
            filas={franjas.map((f) => ({
              clave: f.clave,
              label: (
                <>
                  {f.label} <span className="text-muted">· {f.n}</span>
                </>
              ),
              valor: Math.round(f.tipico ?? 0),
            }))}
            formato={entero}
          />
        </Tarjeta>
        <Tarjeta
          titulo="Constancia"
          detalle={
            sinPublicar == null
              ? 'Sin publicaciones'
              : sinPublicar === 0
                ? 'Publicaste hoy'
                : `Última publicación hace ${sinPublicar} ${sinPublicar === 1 ? 'día' : 'días'}`
          }
        >
          {enSemanas === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">
              Ninguna publicación en las últimas 12 semanas.
            </p>
          ) : (
            <>
              <GraficaColumnas
                filas={semanas.map((s) => ({
                  clave: s.inicio,
                  label: fechaCorta(s.inicio),
                  valor: s.n,
                  titulo: `Semana del ${fechaCorta(s.inicio)}`,
                }))}
                nombre="publicaciones"
                alto={130}
              />
              <p className="mt-2 text-[12px] text-muted">
                Por semana, últimas 12 · promedio {decimal(enSemanas / 12)}
              </p>
            </>
          )}
        </Tarjeta>
      </div>
    </section>
  );
}

const PERIODOS_AUDIENCIA: Record<string, string> = {
  last_90_days: 'últimos 90 días',
  last_30_days: 'últimos 30 días',
  last_14_days: 'últimos 14 días',
  this_month: 'este mes',
  this_week: 'esta semana',
};

function enPorcentaje(r: Reparto) {
  const total = totalDe(r);
  return (n: number) => porcentaje(total ? (n / total) * 100 : 0, 0);
}

export function Audiencia({ audiencia }: { audiencia: AudienciaIg }) {
  const opciones = [
    ...(audiencia.seguidores ? [{ valor: 'seguidores' as const, label: 'Te siguen' }] : []),
    ...(audiencia.interaccion ? [{ valor: 'interaccion' as const, label: 'Interactúan contigo' }] : []),
  ];
  const [quien, setQuien] = useState<'seguidores' | 'interaccion'>(opciones[0]?.valor ?? 'seguidores');
  const demo = audiencia[quien] ?? audiencia.seguidores ?? audiencia.interaccion;
  if (!demo) return null;
  const periodo = audiencia.periodo ? PERIODOS_AUDIENCIA[audiencia.periodo] ?? audiencia.periodo : null;

  return (
    <Tarjeta
      titulo="Tu audiencia"
      detalle={`Según Instagram${periodo ? `, ${periodo}` : ''}. Solo cuenta a quien tiene edad y lugar en su perfil.`}
      accion={
        opciones.length > 1 ? (
          <Segmentos etiqueta="Qué audiencia" valor={quien} opciones={opciones} onChange={setQuien} />
        ) : undefined
      }
    >
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
        <Bloque titulo="Edad">
          <Ranking
            filas={ordenarEdades(demo.edad).map((e) => ({ clave: e.clave, label: `${e.clave} años`, valor: e.valor }))}
            formato={enPorcentaje(demo.edad)}
          />
        </Bloque>
        <Bloque titulo="Género">
          <Ranking
            filas={demo.genero.map((g) => ({ clave: g.clave, label: nombreGenero(g.clave), valor: g.valor }))}
            formato={enPorcentaje(demo.genero)}
            tope={totalDe(demo.genero)}
          />
        </Bloque>
        <Bloque titulo="Ciudades">
          <Ranking
            filas={demo.ciudad.slice(0, 8).map((c) => ({ clave: c.clave, label: c.clave, valor: c.valor }))}
            formato={enPorcentaje(demo.ciudad)}
          />
        </Bloque>
        <Bloque titulo="Países">
          <Ranking
            filas={demo.pais.slice(0, 6).map((p) => ({ clave: p.clave, label: nombrePais(p.clave), valor: p.valor }))}
            formato={enPorcentaje(demo.pais)}
          />
        </Bloque>
      </div>
    </Tarjeta>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-3 text-[13px] font-medium text-muted">{titulo}</p>
      {children}
    </div>
  );
}

export function Historias({ historias }: { historias: HistoriaIg[] }) {
  if (!historias.length) return null;
  return (
    <Tarjeta
      titulo="Historias"
      detalle="Instagram borra estos números a las 24 horas; el panel los guarda mientras la historia vive."
    >
      <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {historias.slice(0, 30).map((h) => (
          <li key={h.id} className="w-[112px] shrink-0">
            <a href={h.permalink ?? undefined} target="_blank" rel="noreferrer" className="block">
              <Miniatura
                src={h.miniatura}
                tipo={h.esVideo ? 'video' : 'foto'}
                className="aspect-[9/16] w-full rounded-xl"
              />
            </a>
            <p className="mt-1.5 text-[11px] text-muted">{cuandoSePublico(h.fecha)}</p>
            {h.metricas ? (
              <dl className="mt-0.5 space-y-0.5 text-[12px]">
                <Par label="vistas" valor={h.metricas.vistas} />
                <Par label="alcance" valor={h.metricas.alcance} />
                <Par label="respuestas" valor={h.metricas.respuestas} />
              </dl>
            ) : (
              <p className="mt-0.5 text-[12px] text-muted">Sin números</p>
            )}
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

function Par({ label, valor }: { label: string; valor: number | undefined }) {
  if (valor == null) return null;
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{compacto(valor)}</dd>
    </div>
  );
}

/** `periodo` incluye hoy: los DMs y los leads se cuentan en vivo. `texto`: «hoy», «en 28 días». */
export function Bandeja({ tablero, periodo, texto }: { tablero: TableroIg; periodo: Periodo; texto: string }) {
  const b = bandejaDelPeriodo(tablero, periodo);
  const mini: { label: string; valor: number; detalle?: string; href: string }[] = [
    { label: 'Te escribieron por primera vez', valor: b.personasNuevas, href: '/contacts' },
    { label: 'Respuestas automáticas', valor: b.disparos, href: '/automations' },
    { label: 'Leads del cotizador', valor: b.leads, href: '/leads' },
    {
      label: 'Leads desde Instagram',
      valor: b.leadsIg,
      detalle: b.leads ? `${Math.round((b.leadsIg / b.leads) * 100)}% del total` : undefined,
      href: '/leads',
    },
  ];
  return (
    <Tarjeta
      titulo="Tu bandeja y tus leads"
      detalle={`Lo que pasó en tus DMs y en el cotizador ${texto}.`}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {mini.map((m) => (
            <Link
              key={m.label}
              href={m.href}
              className="rounded-2xl bg-bg p-3 ring-1 ring-border transition-colors hover:ring-accent/40"
            >
              <p className="text-[22px] leading-none font-bold">{entero(m.valor)}</p>
              <p className="mt-1.5 text-[12px] leading-snug text-muted">{m.label}</p>
              {m.detalle && <p className="mt-0.5 text-[11px] text-faint">{m.detalle}</p>}
            </Link>
          ))}
        </div>
        <div className="min-w-0">
          <p className="mb-3 text-[13px] font-medium text-muted">Automatizaciones que más contestan</p>
          <Ranking
            filas={tablero.automatizaciones.map((a) => ({
              clave: a.id,
              label: (
                <Link href={`/automations/${a.id}`} className="hover:text-accent">
                  {a.nombre}
                </Link>
              ),
              valor: a.disparos,
            }))}
            formato={entero}
            vacio="Ninguna ha contestado todavía"
          />
          {tablero.automatizaciones.length > 0 && (
            <p className="mt-2 text-[11px] text-faint">Desde que existen, no solo en este periodo.</p>
          )}
        </div>
      </div>
    </Tarjeta>
  );
}
