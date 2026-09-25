'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  CLAVE_LOCAL,
  DE_FABRICA,
  VARIABLES,
  aLocal,
  leeLocal,
  variablesDe,
  type Identidad,
} from '@/lib/identidad/tipos';

/**
 * La identidad del panel en el navegador: cómo se llama, su logo y su color.
 *
 * Ya conectado, la manda el servidor (y su color ya viene pintado en el
 * `<head>`). En el modo guía vive en este navegador: el script del `<head>`
 * pone el color antes de pintar y aquí se lee el resto. Encima de las dos va
 * la vista previa de Ajustes › Marca, que tiñe todo el panel mientras eliges.
 */

type Contexto = {
  /** Lo que se ve: la vista previa si hay una, si no lo guardado. */
  identidad: Identidad;
  /** Lo último que se guardó. */
  guardada: Identidad;
  /** Modo guía: se guarda en este navegador, no en Firestore. */
  local: boolean;
  vistaPrevia: (i: Identidad | null) => void;
  /** Lo que acaba de guardarse, mientras el servidor se entera (hasta un minuto). */
  seGuardo: (i: Identidad) => void;
};

const Ctx = createContext<Contexto | null>(null);

// --- Lo guardado en el navegador --------------------------------------------

const EVENTO = 'chatty:marca';
let cache: { crudo: string | null; valor: Identidad | null } = { crudo: null, valor: null };

function lee(): Identidad | null {
  let crudo: string | null = null;
  try {
    crudo = localStorage.getItem(CLAVE_LOCAL);
  } catch {
    // Incógnito o almacenamiento bloqueado: nada guardado.
  }
  if (crudo !== cache.crudo) cache = { crudo, valor: leeLocal(crudo) };
  return cache.valor;
}

function suscribe(avisa: () => void) {
  window.addEventListener(EVENTO, avisa);
  window.addEventListener('storage', avisa);
  return () => {
    window.removeEventListener(EVENTO, avisa);
    window.removeEventListener('storage', avisa);
  };
}

/** Lo que se eligió en este navegador (en el modo guía). */
export function useIdentidadLocal(): Identidad | null {
  return useSyncExternalStore(suscribe, lee, () => null);
}

export function guardarLocal(i: Omit<Identidad, 'actualizadoEn'>): Identidad {
  const actualizadoEn = Date.now();
  try {
    localStorage.setItem(CLAVE_LOCAL, aLocal(i, actualizadoEn));
  } catch {
    throw new Error('Tu navegador no dejó guardarla. Prueba con un logo más ligero.');
  }
  window.dispatchEvent(new Event(EVENTO));
  return { ...i, actualizadoEn };
}

export function borrarLocal() {
  try {
    localStorage.removeItem(CLAVE_LOCAL);
  } catch {
    // Nada que borrar.
  }
  window.dispatchEvent(new Event(EVENTO));
}

// --- El proveedor -------------------------------------------------------------

export function IdentidadProvider({
  servidor,
  local,
  children,
}: {
  servidor: Identidad;
  local: boolean;
  children: React.ReactNode;
}) {
  const enNavegador = useIdentidadLocal();
  const [recien, setRecien] = useState<Identidad | null>(null);
  const [borrador, setBorrador] = useState<Identidad | null>(null);

  // Lo recién guardado vale mientras sea más nuevo que lo que manda el servidor.
  const vigente = recien && (recien.actualizadoEn ?? 0) > (servidor.actualizadoEn ?? 0) ? recien : null;
  const guardada = local ? (enNavegador ?? servidor) : (vigente ?? servidor);
  const identidad = borrador ?? guardada;

  // Qué color hay que poner a mano en <html>: el del servidor ya viene en el
  // <head>; la vista previa, lo del navegador y lo recién guardado, no.
  const aMano = borrador ?? (local ? enNavegador : vigente);
  const acentoAMano = aMano?.acento ?? null;
  const puse = useRef(false);

  useEffect(() => {
    const estilo = document.documentElement.style;
    if (acentoAMano) {
      for (const [k, v] of Object.entries(variablesDe(acentoAMano))) estilo.setProperty(k, v);
      puse.current = true;
    } else if (puse.current) {
      // Solo se quita lo que se puso aquí: al hidratar, el color que dejó el
      // script del <head> se respeta aunque todavía no se lea el navegador.
      for (const k of VARIABLES) estilo.removeProperty(k);
      puse.current = false;
    }
  }, [acentoAMano]);

  const valor = useMemo<Contexto>(
    () => ({ identidad, guardada, local, vistaPrevia: setBorrador, seGuardo: setRecien }),
    [identidad, guardada, local],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

/** Cómo se llama el panel, su logo y su color, para pintarlos. */
export function useIdentidad(): Identidad {
  return useContext(Ctx)?.identidad ?? DE_FABRICA;
}

/** Para Ajustes › Marca: lo guardado, el modo y la vista previa. */
export function useEditorIdentidad(): Contexto {
  const c = useContext(Ctx);
  if (!c) throw new Error('useEditorIdentidad va dentro de IdentidadProvider');
  return c;
}
