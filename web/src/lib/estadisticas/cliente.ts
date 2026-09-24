'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TableroIg } from './tipos';

/** Si la última foto del perfil es más vieja que esto, el cron no está corriendo: se pide una pasada. */
const VIEJO_MS = 2 * 60 * 60 * 1000;
/** Mientras se baja el historial, el tablero se vuelve a leer cada tanto. */
const SONDEO_MS = 20_000;

type Carga = { cuenta: string | null; vuelta: number; tablero: TableroIg | null; error: string | null };

/**
 * El tablero de Instagram de una cuenta. Al recargar se queda con lo que ya
 * tenía mientras llega lo nuevo (sin parpadeo ni esqueletos).
 */
export function useTableroIg(accountId: string | null) {
  const [carga, setCarga] = useState<Carga>({ cuenta: null, vuelta: -1, tablero: null, error: null });
  const [vuelta, setVuelta] = useState(0);
  const [actualizando, setActualizando] = useState(false);
  const autoPedida = useRef<string | null>(null);
  const sondeo = useRef<ReturnType<typeof setTimeout> | null>(null);

  const actualizar = useCallback(async (): Promise<{ ok: boolean; error?: string } | null> => {
    if (!accountId) return null;
    setActualizando(true);
    try {
      const res = await fetch('/api/instagram/estadisticas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      return { ok: res.ok && Boolean(json.ok), error: json.error };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Sin conexión' };
    } finally {
      setActualizando(false);
      setVuelta((v) => v + 1);
    }
  }, [accountId]);

  useEffect(() => {
    if (!accountId) return;
    let vivo = true;
    fetch(`/api/instagram/estadisticas?accountId=${encodeURIComponent(accountId)}`, { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((json as { error?: string }).error ?? `Error ${res.status}`);
        return json as TableroIg;
      })
      .then((tablero) => {
        if (!vivo) return;
        setCarga({ cuenta: accountId, vuelta, tablero, error: null });

        // El cron no ha pasado (recién desplegado, o se cayó): una pasada ahora.
        const perfilEn = tablero.estado.perfilEn;
        if (autoPedida.current !== accountId && (!perfilEn || tablero.generadoEn - perfilEn > VIEJO_MS)) {
          autoPedida.current = accountId;
          void actualizar();
          return;
        }
        // Bajando el historial: se relee solo hasta que termine.
        if (tablero.estado.conPermiso && !tablero.estado.historialCompleto) {
          sondeo.current = setTimeout(() => setVuelta((v) => v + 1), SONDEO_MS);
        }
      })
      .catch((err: Error) => {
        if (!vivo) return;
        setCarga((c) => ({
          cuenta: accountId,
          vuelta,
          tablero: c.cuenta === accountId ? c.tablero : null,
          error: err.message,
        }));
      });
    return () => {
      vivo = false;
      if (sondeo.current) clearTimeout(sondeo.current);
    };
  }, [accountId, vuelta, actualizar]);

  const deEsta = carga.cuenta === accountId;
  return {
    tablero: deEsta ? carga.tablero : null,
    error: deEsta ? carga.error : null,
    /** Todavía no hay nada que enseñar de esta cuenta. */
    cargando: Boolean(accountId) && (!deEsta || (!carga.tablero && !carga.error)),
    /** Hay algo en pantalla y está llegando una versión más nueva. */
    recargando: deEsta && carga.vuelta !== vuelta,
    actualizando,
    actualizar,
    recargar: () => setVuelta((v) => v + 1),
  };
}
