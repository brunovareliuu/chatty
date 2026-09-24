'use client';

import { useState } from 'react';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Los campos de formulario que le faltan al kit: en iOS la fila ES el campo —
 * etiqueta a la izquierda, lo que se escribe a la derecha, sin recuadro — como
 * cuando editas un contacto.
 *
 * Viven aquí y no en `movil/ui/` porque solo los usan Ajustes y la hoja de
 * «nueva automatización».
 *
 * Regla que no se rompe: **17 px de tamaño de letra**. Con menos de 16, Safari
 * de iOS hace zoom al enfocar el campo y la pantalla se descuadra.
 */

const FILA = 'relative flex min-h-[44px] w-full items-center gap-3 px-4';
const ENTRADA =
  'min-w-0 flex-1 bg-transparent py-[11px] text-[17px] text-txt outline-none placeholder:text-faint';

/** Un campo de una línea. Con `apilado`, la etiqueta va arriba (valores largos). */
export function FilaCampo({
  etiqueta,
  valor,
  onChange,
  placeholder,
  tipo = 'text',
  inputMode,
  apilado = false,
  mono = false,
  ancho = 104,
  derecha,
  autoFocus,
  maxLength,
  ultima,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tipo?: 'text' | 'email' | 'url' | 'password';
  inputMode?: 'text' | 'url' | 'email' | 'numeric';
  /** Etiqueta chiquita arriba: para correos y direcciones, que no caben al lado. */
  apilado?: boolean;
  mono?: boolean;
  /** Ancho de la etiqueta cuando va al lado. */
  ancho?: number;
  /** Algo pegado a la derecha del campo (un botón de quitar). */
  derecha?: React.ReactNode;
  autoFocus?: boolean;
  maxLength?: number;
  ultima?: boolean;
}) {
  const entrada = (
    <input
      type={tipo}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      autoFocus={autoFocus}
      maxLength={maxLength}
      autoComplete="off"
      autoCapitalize={tipo === 'email' || tipo === 'url' ? 'none' : undefined}
      spellCheck={false}
      className={cn(ENTRADA, mono && 'font-mono text-[16px]')}
    />
  );

  if (apilado) {
    return (
      <div className={cn('relative px-4 pt-2 pb-1.5', !ultima && 'sep-ios')}>
        <p className="text-[13px] leading-[1.35] text-muted">{etiqueta}</p>
        <div className="flex items-center gap-2">
          {entrada}
          {derecha}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(FILA, !ultima && 'sep-ios')}>
      <span className="shrink-0 text-[17px]" style={{ width: ancho }}>
        {etiqueta}
      </span>
      {entrada}
      {derecha}
    </div>
  );
}

/** Un campo de varias líneas: el primer mensaje de una automatización. */
export function FilaTextoLargo({
  etiqueta,
  valor,
  onChange,
  placeholder,
  filas = 3,
  ultima,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  filas?: number;
  ultima?: boolean;
}) {
  return (
    <div className={cn('relative px-4 pt-2 pb-2.5', !ultima && 'sep-ios')}>
      <p className="text-[13px] leading-[1.35] text-muted">{etiqueta}</p>
      <textarea
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={filas}
        className="mt-1 w-full resize-none bg-transparent text-[17px] leading-[1.35] text-txt outline-none placeholder:text-faint"
      />
    </div>
  );
}

/**
 * Una clave que no se enseña. El ojo la destapa, igual que en el escritorio,
 * pero aquí la fila entera es el campo.
 */
export function FilaSecreto({
  etiqueta,
  valor,
  onChange,
  placeholder,
  ultima,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ultima?: boolean;
}) {
  const [ver, setVer] = useState(false);
  return (
    <FilaCampo
      etiqueta={etiqueta}
      valor={valor}
      onChange={onChange}
      placeholder={placeholder}
      tipo={ver ? 'text' : 'password'}
      mono
      apilado
      ultima={ultima}
      derecha={
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          className="grid h-9 w-9 shrink-0 place-items-center text-muted active:opacity-50"
          aria-label={ver ? 'Ocultar la clave' : 'Ver la clave'}
        >
          {ver ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      }
    />
  );
}

/**
 * Elegir una opción de una lista corta. Es un `<select>` nativo a propósito: en
 * el iPhone abre la rueda del sistema, que gana a cualquier hoja que hagamos.
 */
export function FilaSelector<T extends string>({
  etiqueta,
  valor,
  onChange,
  opciones,
  ultima,
}: {
  etiqueta: string;
  valor: T;
  onChange: (v: T) => void;
  opciones: { valor: T; label: string }[];
  ultima?: boolean;
}) {
  return (
    <div className={cn(FILA, !ultima && 'sep-ios')}>
      <span className="min-w-0 flex-1 truncate text-[17px]">{etiqueta}</span>
      <div className="relative flex min-w-0 shrink items-center">
        <select
          value={valor}
          onChange={(e) => onChange(e.target.value as T)}
          className="min-w-0 max-w-[62vw] appearance-none truncate bg-transparent py-[11px] pr-5 text-right text-[17px] text-muted outline-none"
        >
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-0 h-[15px] w-[15px] text-faint"
          strokeWidth={2.6}
        />
      </div>
    </div>
  );
}

/** El pie de una sección cuando hace falta explicarla dentro del formulario. */
export function Nota({ children }: { children: React.ReactNode }) {
  return <p className="px-8 pt-2 text-[13px] leading-[1.35] text-muted">{children}</p>;
}
