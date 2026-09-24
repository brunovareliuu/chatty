'use client';

import { useSyncExternalStore } from 'react';
import type { EstadoPaso } from '@/lib/guia/estado';
import type { PasoId } from '@/lib/guia/pasos';

/**
 * Los pasos que el sistema no puede revisar solo (activar Blaze, subir las
 * reglas…) los marca la persona. Se guardan en este navegador: son una ayuda
 * para no perderse, no un dato del panel. Todas las listas y contadores de la
 * pantalla leen de aquí, así una palomita se ve en todos lados a la vez.
 */

const CLAVE = 'chatty:guia:hechos';
const EVENTO = 'chatty:guia';
const VACIO: PasoId[] = [];

let cache: { crudo: string | null; lista: PasoId[] } = { crudo: null, lista: VACIO };

function lee(): PasoId[] {
  let crudo: string | null = null;
  try {
    crudo = localStorage.getItem(CLAVE);
  } catch {
    // Modo incógnito o almacenamiento bloqueado: nada marcado.
  }
  if (crudo === cache.crudo) return cache.lista;
  let lista: PasoId[] = VACIO;
  try {
    const datos = crudo ? JSON.parse(crudo) : [];
    if (Array.isArray(datos)) lista = datos.filter((x): x is PasoId => typeof x === 'string');
  } catch {
    // Algo raro guardado: se empieza de cero.
  }
  cache = { crudo, lista };
  return lista;
}

function suscribe(avisa: () => void) {
  window.addEventListener(EVENTO, avisa);
  window.addEventListener('storage', avisa);
  return () => {
    window.removeEventListener(EVENTO, avisa);
    window.removeEventListener('storage', avisa);
  };
}

export function useHechos(): PasoId[] {
  return useSyncExternalStore(suscribe, lee, () => VACIO);
}

export function marcar(id: PasoId, hecho: boolean) {
  const actual = new Set(lee());
  if (hecho) actual.add(id);
  else actual.delete(id);
  try {
    localStorage.setItem(CLAVE, JSON.stringify([...actual]));
  } catch {
    // Sin almacenamiento, la marca dura lo que dure la pestaña.
  }
  window.dispatchEvent(new Event(EVENTO));
}

/** El estado que ve la persona: lo que dijo el servidor más sus propias marcas. */
export function estadoVisible(estado: EstadoPaso, id: PasoId, hechos: PasoId[]): 'hecho' | 'pendiente' | 'manual' {
  if (estado === 'manual' && hechos.includes(id)) return 'hecho';
  return estado;
}

export type Resumen = { id: PasoId; estado: EstadoPaso; opcional?: boolean };

/** Cuántos pasos obligatorios van y cuántos son. */
export function cuenta(pasos: Resumen[], hechos: PasoId[]): { listos: number; total: number } {
  const obligatorios = pasos.filter((p) => !p.opcional);
  return {
    listos: obligatorios.filter((p) => estadoVisible(p.estado, p.id, hechos) === 'hecho').length,
    total: obligatorios.length,
  };
}
