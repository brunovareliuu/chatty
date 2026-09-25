import 'server-only';

import { connection } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { firebaseListo } from '@/lib/instalacion';
import { DE_FABRICA, esHex, type Entrada, type Identidad } from './tipos';

/**
 * Dónde vive la identidad del panel: `config/marca` (nombre, color, si hay
 * logo) y el logo aparte, en `config/marcaLogo`, para que cada página lea solo
 * lo chico. Solo el servidor las toca: las reglas no dejan a ningún navegador.
 */
const marcaRef = () => adminDb.doc('config/marca');
const logoRef = () => adminDb.doc('config/marcaLogo');

type Guardada = { nombre: string; acento: string; tieneLogo: boolean; logoCompleto: boolean; actualizadoEn: number };

// El layout raíz la pide en cada página: un minuto de memoria ahorra lecturas.
// Vive en `globalThis` y no en una variable del módulo porque Next empaqueta
// aparte las rutas de API y las páginas: con una variable, guardar borraría la
// memoria de la API y las páginas seguirían un minuto con la marca de antes.
// Al guardar se borra para todo el proceso; si hay más instancias, la ven en
// menos de un minuto.
const VIGENCIA_MS = 60 * 1000;
type Memoria = {
  marca: { en: number; valor: Guardada | null } | null;
  logo: { en: number; valor: string | null } | null;
};
const proceso = globalThis as unknown as { __chattyIdentidad?: Memoria };
const memoria: Memoria = (proceso.__chattyIdentidad ??= { marca: null, logo: null });

async function leeGuardada(): Promise<Guardada | null> {
  if (!firebaseListo()) return null;
  if (memoria.marca && Date.now() - memoria.marca.en < VIGENCIA_MS) return memoria.marca.valor;
  try {
    const d = (await marcaRef().get()).data();
    const valor =
      d && typeof d.nombre === 'string' && d.nombre.trim() && esHex(d.acento)
        ? {
            nombre: d.nombre,
            acento: d.acento,
            tieneLogo: d.tieneLogo === true,
            logoCompleto: d.logoCompleto === true,
            actualizadoEn: Number(d.actualizadoEn) || 0,
          }
        : null;
    memoria.marca = { en: Date.now(), valor };
    return valor;
  } catch (err) {
    // Sin credenciales o sin red: el panel se ve con la de fábrica, no se cae.
    console.error('[identidad] no se pudo leer', err instanceof Error ? err.message : err);
    memoria.marca = { en: Date.now(), valor: null };
    return null;
  }
}

/**
 * La identidad para pintar. Sin Firebase, o si nunca se guardó, la de fábrica.
 * Pide la conexión para que Next no la congele al construir: cambia cuando
 * alguien la guarda, no en cada despliegue.
 */
export async function leerIdentidad(): Promise<Identidad> {
  await connection();
  const g = await leeGuardada();
  if (!g) return DE_FABRICA;
  return {
    nombre: g.nombre,
    acento: g.acento,
    logo: g.tieneLogo ? `/iconos/logo.png?v=${g.actualizadoEn}` : null,
    logoCompleto: g.logoCompleto,
    actualizadoEn: g.actualizadoEn,
  };
}

/** El logo tal como se subió (un PNG en data URL), para la ruta de los iconos. */
export async function leerLogo(): Promise<string | null> {
  const g = await leeGuardada();
  if (!g?.tieneLogo) return null;
  if (memoria.logo && Date.now() - memoria.logo.en < VIGENCIA_MS) return memoria.logo.valor;
  try {
    const png = (await logoRef().get()).get('png');
    memoria.logo = { en: Date.now(), valor: typeof png === 'string' ? png : null };
  } catch (err) {
    console.error('[identidad] no se pudo leer el logo', err instanceof Error ? err.message : err);
    memoria.logo = { en: Date.now(), valor: null };
  }
  return memoria.logo.valor;
}

/** Que el data URL sea de verdad un PNG, no solo que lo diga. */
export function esPng(dataUrl: string): boolean {
  const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

export async function guardarIdentidad(e: Entrada): Promise<Identidad> {
  const actualizadoEn = Date.now();
  let tieneLogo: boolean;
  if (e.logo === undefined) {
    // Sin logo en la entrada, se queda el que había. Se lee fresco, no de la memoria.
    tieneLogo = (await marcaRef().get()).get('tieneLogo') === true;
  } else if (e.logo === null) {
    tieneLogo = false;
    await logoRef().delete();
  } else {
    tieneLogo = true;
    await logoRef().set({ png: e.logo, actualizadoEn });
  }
  await marcaRef().set({
    nombre: e.nombre,
    acento: e.acento,
    tieneLogo,
    logoCompleto: tieneLogo && e.logoCompleto,
    actualizadoEn,
  });
  memoria.marca = null;
  memoria.logo = null;
  return leerIdentidad();
}
