'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
 * Las gráficas del tablero. Reglas: una sola tinta de datos (el acento),
 * líneas de 2 px, relleno al 10 %, barras de 24 px como máximo con la punta
 * redondeada y la base recta, rejilla de un pelo y sin punteado. Los colores
 * salen de los tokens, así el modo oscuro no necesita nada aparte.
 */

const EJE = { fontSize: 11, fill: 'var(--muted)' };
const PUNTO_ACTIVO = { r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 };

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
      <CartesianGrid vertical={false} stroke="var(--border)" />
      <XAxis dataKey="dia" tick={EJE} tickLine={false} axisLine={false} minTickGap={28} />
      <Tooltip cursor={{ stroke: 'var(--faint)', strokeWidth: 1 }} content={globo} />
    </>
  );

  return (
    <div style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        {desdeCero ? (
          <AreaChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
              fill="var(--accent)"
              fillOpacity={0.1}
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
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="dia" tick={EJE} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis
            tick={EJE}
            tickLine={false}
            axisLine={false}
            width={32}
            allowDecimals={false}
            tickFormatter={(v: number) => entero(Math.abs(v))}
          />
          <ReferenceLine y={0} stroke="var(--faint)" />
          <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={globo} />
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

type FilaPost = { id: string; valor: number | null; post: PostIg };

/**
 * Cada publicación, en orden de fecha, con la cifra elegida. Solo la mejor
 * lleva el número encima; las demás lo enseñan al pasar el cursor.
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
      <div className="w-[240px] rounded-xl border border-border bg-bg p-2.5 shadow-lg">
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
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="id"
            tick={EJE}
            tickLine={false}
            axisLine={false}
            minTickGap={20}
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
          <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={globo} />
          <Bar
            dataKey="valor"
            name={nombre}
            fill="var(--accent)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="valor"
              content={(props) => {
                const { x, y, width, value, index } = props as {
                  x?: number | string;
                  y?: number | string;
                  width?: number | string;
                  value?: number | string;
                  index?: number;
                };
                if (index !== mejor || value == null) return null;
                return (
                  <text
                    x={Number(x) + Number(width) / 2}
                    y={Number(y) - 6}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill="var(--txt)"
                  >
                    {formato(Number(value))}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type Columna = { clave: string; label: string; valor: number | null; titulo: string };

/**
 * Columnas cortas con etiqueta abajo: días de la semana, semanas. Una casilla
 * sin datos queda vacía, no en cero. Solo la más alta lleva su número encima.
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
          <XAxis dataKey="label" tick={EJE} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={4} />
          <YAxis hide />
          <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={globo} />
          <Bar dataKey="valor" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
            <LabelList
              dataKey="valor"
              content={(props) => {
                const { x, y, width, value, index } = props as {
                  x?: number | string;
                  y?: number | string;
                  width?: number | string;
                  value?: number | string;
                  index?: number;
                };
                if (index !== mejor || value == null || Number(value) <= 0) return null;
                return (
                  <text
                    x={Number(x) + Number(width) / 2}
                    y={Number(y) - 6}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill="var(--txt)"
                  >
                    {formato(Number(value))}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
