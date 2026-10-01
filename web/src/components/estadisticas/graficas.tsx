'use client';

import { useId } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  compacto,
  cuandoSePublico,
  entero,
  fechaCorta,
  fechaLocal,
  type PuntoSerie,
} from '@/lib/estadisticas/calculos';
import type { PostIg } from '@/lib/estadisticas/tipos';
import { ChipTipo, GloboGrafica, Miniatura, type EntradaTooltip } from './piezas';

/**
 * Las gráficas del tablero, con la calma de Salud: una sola tinta de datos (el
 * acento), el gris para lo secundario, líneas de 2 px, relleno que se
 * desvanece hacia abajo, barras de 24 px como máximo con la punta redondeada,
 * rejilla de un pelo y sin punteado. Los colores salen de los tokens, así el
 * modo oscuro no necesita nada aparte.
 */

const EJE = { fontSize: 11, fill: 'var(--muted)' };
const REJILLA = 'var(--hairline)';
// El aro del punto es del color de la tarjeta: parece recortado sobre la línea.
const PUNTO_ACTIVO = { r: 4.5, fill: 'var(--accent)', stroke: 'var(--card)', strokeWidth: 2.5 };
const CURSOR_BARRA = { fill: 'var(--fill-soft)', radius: 6 };
// Como la batería o Tiempo en pantalla del iPhone: la barra que importa en el
// acento y las demás en gris. Un acento tenue se ensucia sobre el oscuro.
const DESTACADA = { fill: 'var(--accent)', fillOpacity: 1 };
const APAGADA = { fill: 'var(--faint)', fillOpacity: 0.55 };

type ConPayload = { active?: boolean; payload?: readonly (EntradaTooltip & { payload?: unknown })[] };

/** Un valor por día. Área si se cuenta desde cero; línea si no (los seguidores). */
export function GraficaDia({
  puntos,
  nombre,
  desdeCero = true,
  alto = 240,
}: {
  puntos: PuntoSerie[];
  nombre: string;
  desdeCero?: boolean;
  alto?: number;
}) {
  const datos = puntos.map((p) => ({ ...p, dia: fechaCorta(p.fecha) }));
  const degradado = `dia-${useId().replace(/:/g, '')}`;
  const globo = (p: ConPayload) => {
    const punto = p.payload?.[0]?.payload as (PuntoSerie & { dia: string }) | undefined;
    return (
      <GloboGrafica
        active={p.active}
        payload={p.payload}
        titulo={punto?.dia}
        formato={entero}
        nota={punto?.estimado ? 'Calculado con las altas y bajas de Instagram' : undefined}
      />
    );
  };
  const comunes = (
    <>
      <CartesianGrid vertical={false} stroke={REJILLA} />
      <XAxis dataKey="dia" tick={EJE} tickLine={false} axisLine={false} minTickGap={28} dy={4} />
      <Tooltip cursor={{ stroke: 'var(--faint)', strokeWidth: 1 }} content={globo} />
    </>
  );

  return (
    <div style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        {desdeCero ? (
          <AreaChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={degradado} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.24} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {comunes}
            <YAxis
              tick={EJE}
              tickLine={false}
              axisLine={false}
              width={58}
              allowDecimals={false}
              tickFormatter={(v: number) => compacto(v)}
            />
            <Area
              type="monotone"
              dataKey="valor"
              name={nombre}
              stroke="var(--accent)"
              strokeWidth={2}
              fill={`url(#${degradado})`}
              fillOpacity={1}
              dot={false}
              activeDot={PUNTO_ACTIVO}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <LineChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {comunes}
            <YAxis
              tick={EJE}
              tickLine={false}
              axisLine={false}
              width={58}
              allowDecimals={false}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => compacto(v)}
            />
            <Line
              type="monotone"
              dataKey="valor"
              name={nombre}
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
              activeDot={PUNTO_ACTIVO}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/** Te siguieron (arriba, en el acento) y dejaron de seguirte (abajo, gris), por día. */
export function GraficaAltasBajas({
  datos,
  alto = 180,
}: {
  datos: { fecha: string; altas: number | null; bajas: number | null }[];
  alto?: number;
}) {
  const filas = datos.map((d) => ({ ...d, dia: fechaCorta(d.fecha) }));
  const globo = (p: ConPayload) => {
    const fila = p.payload?.[0]?.payload as { dia: string } | undefined;
    return (
      <GloboGrafica
        active={p.active}
        payload={p.payload}
        titulo={fila?.dia}
        formato={(v) => entero(Math.abs(v))}
      />
    );
  };
  return (
    <div style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filas} stackOffset="sign" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={REJILLA} />
          <XAxis dataKey="dia" tick={EJE} tickLine={false} axisLine={false} minTickGap={28} dy={4} />
          <YAxis
            tick={EJE}
            tickLine={false}
            axisLine={false}
            width={32}
            allowDecimals={false}
            tickFormatter={(v: number) => entero(Math.abs(v))}
          />
          <ReferenceLine y={0} stroke="var(--border)" />
          <Tooltip cursor={CURSOR_BARRA} content={globo} />
          <Bar
            dataKey="altas"
            name="Te siguieron"
            stackId="ab"
            fill="var(--accent)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          />
          <Bar
            dataKey="bajas"
            name="Dejaron de seguirte"
            stackId="ab"
            fill="var(--faint)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * El número encima de la barra más alta. Se busca por su clave y no por el
 * índice que da recharts, que se salta las barras vacías (con un lunes sin
 * posts, la etiqueta caía en la barra de al lado).
 */
function soloLaMejor<T extends { valor: number | null }>(
  clave: string | undefined,
  claveDe: (f: T) => string,
  formato: (v: number) => string,
) {
  return (entrada: { payload?: unknown }) => {
    const f = entrada.payload as T | undefined;
    if (!f || clave === undefined || claveDe(f) !== clave || f.valor == null || f.valor <= 0) return null;
    return formato(f.valor);
  };
}

function Etiqueta(props: { x?: number | string; y?: number | string; width?: number | string; value?: unknown }) {
  if (props.value == null) return null;
  return (
    <text
      x={Number(props.x) + Number(props.width) / 2}
      y={Number(props.y) - 7}
      textAnchor="middle"
      fontSize={11}
      fontWeight={600}
      fill="var(--txt)"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {String(props.value)}
    </text>
  );
}

type FilaPost = { id: string; valor: number | null; post: PostIg };

/**
 * Cada publicación, en orden de fecha, con la cifra elegida. Solo la mejor va
 * en el acento y lleva el número encima; las demás, en gris, lo enseñan al pasar
 * el cursor.
 */
export function GraficaPosts({
  filas,
  nombre,
  formato = entero,
  alto = 220,
}: {
  filas: FilaPost[];
  nombre: string;
  formato?: (v: number) => string;
  alto?: number;
}) {
  const mejor = filas.reduce<number>(
    (m, f, i) => ((f.valor ?? -1) > (filas[m]?.valor ?? -1) ? i : m),
    0,
  );
  const fechaDe = new Map(filas.map((f) => [f.id, fechaCorta(fechaLocal(f.post.fecha))]));
  const globo = (p: ConPayload) => {
    const f = p.payload?.[0]?.payload as FilaPost | undefined;
    if (!p.active || !f) return null;
    return (
      <div className="flotante w-[240px] rounded-[12px] p-2.5">
        <div className="flex gap-2.5">
          <Miniatura src={f.post.miniatura} tipo={f.post.tipo} className="h-14 w-11 rounded-md" />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold tabular-nums">
              {f.valor == null ? '—' : formato(f.valor)}{' '}
              <span className="text-[12px] font-normal text-muted">{nombre.toLowerCase()}</span>
            </p>
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted">
              {f.post.caption || 'Sin texto'}
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <ChipTipo tipo={f.post.tipo} />
          <span className="text-[11px] text-muted">{cuandoSePublico(f.post.fecha)}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filas} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={REJILLA} />
          <XAxis
            dataKey="id"
            tick={EJE}
            tickLine={false}
            axisLine={false}
            minTickGap={20}
            dy={4}
            tickFormatter={(id: string) => fechaDe.get(id) ?? ''}
          />
          <YAxis
            tick={EJE}
            tickLine={false}
            axisLine={false}
            width={48}
            allowDecimals={false}
            tickFormatter={(v: number) => compacto(v)}
          />
          <Tooltip cursor={CURSOR_BARRA} content={globo} />
          <Bar
            dataKey="valor"
            name={nombre}
            fill="var(--accent)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          >
            {filas.map((f, i) => (
              <Cell key={f.id} {...(i === mejor ? DESTACADA : APAGADA)} />
            ))}
            <LabelList valueAccessor={soloLaMejor(filas[mejor]?.id, (f: FilaPost) => f.id, formato)} content={Etiqueta} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type Columna = { clave: string; label: string; valor: number | null; titulo: string };

/**
 * Columnas cortas con etiqueta abajo: días de la semana, semanas. Una casilla
 * sin datos queda vacía, no en cero. Como en Tiempo en pantalla, la más alta
 * va en el acento y con su número encima; las demás, en gris.
 */
export function GraficaColumnas({
  filas,
  nombre,
  formato = entero,
  alto = 160,
}: {
  filas: Columna[];
  nombre: string;
  formato?: (v: number) => string;
  alto?: number;
}) {
  const mejor = filas.reduce<number>(
    (m, f, i) => ((f.valor ?? -1) > (filas[m]?.valor ?? -1) ? i : m),
    0,
  );
  const globo = (p: ConPayload) => {
    const f = p.payload?.[0]?.payload as Columna | undefined;
    if (!p.active || !f) return null;
    return (
      <GloboGrafica
        active
        payload={f.valor == null ? [] : [{ value: f.valor, name: nombre, color: 'var(--accent)', dataKey: 'valor' }]}
        titulo={f.titulo}
        formato={formato}
        nota={f.valor == null ? 'Sin publicaciones' : undefined}
      />
    );
  };
  return (
    <div style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filas} margin={{ top: 22, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="label" tick={EJE} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={4} dy={4} />
          <YAxis hide />
          <Tooltip cursor={CURSOR_BARRA} content={globo} />
          <Bar dataKey="valor" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
            {filas.map((f, i) => (
              <Cell key={f.clave} {...(i === mejor ? DESTACADA : APAGADA)} />
            ))}
            <LabelList valueAccessor={soloLaMejor(filas[mejor]?.clave, (f: Columna) => f.clave, formato)} content={Etiqueta} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
