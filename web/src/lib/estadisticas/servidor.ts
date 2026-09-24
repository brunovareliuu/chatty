import 'server-only';

import { Timestamp, type WriteBatch } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import {
  accountRef,
  automationsCol,
  contactsCol,
  flagAccountError,
  getAccountToken,
  runsCol,
} from '@/lib/accounts';
import {
  InstagramApiError,
  getAccountInsights,
  getMediaInsights,
  getSelfProfile,
  listAllMedia,
  listStories,
} from '@/lib/instagram';
import type { IgAccount } from '@/lib/types';
import { fechaIg, inicioDiaIg, periodo, recibidosPorDia, sumarDias, type FotoPost } from './calculos';
import {
  A_DIA,
  A_POST,
  CORTES,
  DEMOGRAFIAS,
  METRICAS_DIA,
  METRICAS_POST,
  TIMEFRAMES,
  desgloseDe,
  grupoDe,
  pedirMetricas,
  pedirOpcional,
  tipoDe,
  valorDe,
  type GrupoPost,
} from './meta';
import {
  DIAS_DE_HISTORIAL,
  PERMISO_ESTADISTICAS,
  RANGOS_LARGOS,
  type AudienciaIg,
  type BandejaDia,
  type Demografia,
  type DiaIg,
  type HistoriaIg,
  type MetricasPost,
  type PerfilIg,
  type PostIg,
  type Reparto,
  type TableroIg,
  type TipoPost,
  type Unicos,
  type UnicosPeriodo,
} from './tipos';

/**
 * El recolector de estadísticas de Instagram y la lectura del tablero.
 *
 * Meta no guarda la historia de seguidores ni deja pedir 90 días de golpe, y
 * los números de una historia desaparecen a las 24 h. Por eso el cron
 * (`/api/cron/tick`, cada minuto) va guardando en Firestore y la pantalla solo
 * lee de ahí: carga al instante y el historial crece solo.
 *
 * Firestore (solo servidor; `firestore.rules` no lo menciona, así que ningún
 * cliente lo lee):
 *   accounts/{id}/estadisticas/estado       qué se bajó y cuándo, candado, vetos
 *   accounts/{id}/estadisticas/audiencia    edad, género, ciudades y países
 *   accounts/{id}/estadisticasDias/{fecha}  un día de Instagram (Pacífico)
 *   accounts/{id}/estadisticasPosts/{id}    cada publicación con sus métricas
 *   accounts/{id}/estadisticasHistorias/{id}
 */

const estadoRef = (id: string) => accountRef(id).collection('estadisticas').doc('estado');
const audienciaRef = (id: string) => accountRef(id).collection('estadisticas').doc('audiencia');
const diasCol = (id: string) => accountRef(id).collection('estadisticasDias');
const postsCol = (id: string) => accountRef(id).collection('estadisticasPosts');
const historiasCol = (id: string) => accountRef(id).collection('estadisticasHistorias');

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/** Cada cuánto se vuelve a pedir cada cosa. */
const CADA = {
  /** Perfil, lista de posts (likes, comentarios, portadas frescas) e historias. */
  perfil: 55 * MINUTO,
  /** Los últimos tres días: Meta tarda hasta 48 h en cerrar un día. */
  insights: 6 * HORA,
  unicos: 6 * HORA,
  posts: 6 * HORA,
  audiencia: DIA,
};

type Grupo = 'cuenta' | 'cuentaFollowType' | 'cuentaFollowerType';

/** Lo que el recolector anota de sí mismo. */
type EstadoGuardado = {
  perfil?: PerfilIg;
  perfilEn?: number;
  /** Última foto de lo que va de hoy (cada hora, para «Hoy»). */
  hoyEn?: number;
  insightsEn?: number;
  unicosEn?: number;
  postsEn?: number;
  postsPendientes?: boolean;
  audienciaEn?: number;
  historialDesde?: string | null;
  historialCompleto?: boolean;
  unicos?: Unicos;
  permiso?: 'si' | 'no';
  permisoRevisadoEn?: number;
  motivoSinPermiso?: string | null;
  /** Si en la última pasada el token traía el permiso: si cambia, se corre ya. */
  conPermisoVisto?: boolean;
  /** Métricas de la cuenta que Meta rechazó; no se vuelven a pedir. */
  vetadas?: Partial<Record<Grupo, string[]>>;
  /** El `timeframe` y el nombre de parámetro que aceptó la demografía. */
  timeframe?: string | null;
  paramDesglose?: string | null;
  ultimoError?: string | null;
  ultimoErrorEn?: number | null;
  /** Cuándo vuelve a tocar algo. El tick no corre nada antes. */
  proximaEn?: number;
  /** Candado para que dos pasadas no se pisen. */
  corriendoHasta?: number;
};

export function tienePermiso(account: IgAccount): boolean {
  return (account.scopes ?? []).includes(PERMISO_ESTADISTICAS);
}

// ---------------------------------------------------------------------------
// El recolector
// ---------------------------------------------------------------------------

type Vetos = Record<Grupo, Set<string>>;

const segundos = (fecha: string) => Math.floor(inicioDiaIg(fecha) / 1000);

function mensaje(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

type Contexto = {
  account: IgAccount;
  token: string;
  estado: EstadoGuardado;
  cambios: EstadoGuardado;
  /**
   * Métricas de la cuenta que Meta rechazó en un día reciente: se guardan y no
   * se vuelven a pedir. Lo que falla en días viejos o periodos largos no entra
   * aquí (Meta puede rechazar una métrica solo por la fecha).
   */
  vetadas: Vetos;
  /** Vetos de métricas de posts: duran solo esta pasada (un post viejo puede no tener lo que uno nuevo sí). */
  vetadasPost: Record<GrupoPost, Set<string>>;
  queda: () => number;
};

export type ResultadoRecoleccion = {
  hecho: string[];
  /** Quedó trabajo para la siguiente pasada (historial o posts a medias). */
  pendiente: boolean;
  error?: string;
};

/** Toma el candado. Devuelve el estado guardado, o null si otra pasada está corriendo. */
async function tomarTurno(accountId: string, presupuestoMs: number): Promise<EstadoGuardado | null> {
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(estadoRef(accountId));
    const estado = (snap.data() ?? {}) as EstadoGuardado;
    if ((estado.corriendoHasta ?? 0) > Date.now()) return null;
    tx.set(estadoRef(accountId), { corriendoHasta: Date.now() + presupuestoMs + MINUTO }, { merge: true });
    return estado;
  });
}

/**
 * Para el tick: una lectura y se va, salvo que toque algo. Si el permiso
 * cambió (se reconectó la cuenta), corre en ese mismo minuto.
 */
export async function recolectarSiToca(account: IgAccount): Promise<ResultadoRecoleccion | null> {
  const e = (await estadoRef(account.id).get()).data() as EstadoGuardado | undefined;
  const cambioPermiso = e?.conPermisoVisto !== tienePermiso(account);
  if (e?.proximaEn && Date.now() < e.proximaEn && !cambioPermiso) return null;
  return recolectarEstadisticas(account, { presupuestoMs: 40_000 });
}

/**
 * Una pasada completa, dentro de un presupuesto de tiempo. Lo que no alcance
 * queda para la siguiente (el historial de 90 días tarda unas cuantas).
 * `forzar` vuelve a pedir lo que ya estaba fresco (el botón «Actualizar»).
 */
export async function recolectarEstadisticas(
  account: IgAccount,
  opciones: { presupuestoMs?: number; forzar?: boolean } = {},
): Promise<ResultadoRecoleccion> {
  const presupuesto = opciones.presupuestoMs ?? 40_000;
  const inicio = Date.now();
  const estado = await tomarTurno(account.id, presupuesto);
  if (!estado) return { hecho: [], pendiente: true, error: 'Ya hay otra actualización corriendo.' };

  const conPermiso = tienePermiso(account);
  const cambios: EstadoGuardado = { conPermisoVisto: conPermiso };
  const hecho: string[] = [];
  let pendiente = false;
  let error: string | undefined;
  let esperar = 0;

  const vencido = (en: number | undefined, cada: number) =>
    Boolean(opciones.forzar) || !en || Date.now() - en >= cada;

  try {
    const token = await getAccountToken(account);
    const ctx: Contexto = {
      account,
      token,
      estado,
      cambios,
      vetadas: {
        cuenta: new Set(estado.vetadas?.cuenta ?? []),
        cuentaFollowType: new Set(estado.vetadas?.cuentaFollowType ?? []),
        cuentaFollowerType: new Set(estado.vetadas?.cuentaFollowerType ?? []),
      },
      vetadasPost: { REELS: new Set(), FEED: new Set(), STORY: new Set() },
      queda: () => presupuesto - (Date.now() - inicio),
    };

    // 1. Perfil, publicaciones e historias: cada hora y sin permiso especial.
    if (vencido(estado.perfilEn, CADA.perfil)) {
      await guardarPerfil(ctx);
      await guardarPublicaciones(ctx);
      await guardarHistorias(ctx, conPermiso);
      hecho.push('perfil', 'publicaciones', 'historias');
    }

    if (!conPermiso) {
      cambios.permiso = 'no';
      cambios.permisoRevisadoEn = Date.now();
      cambios.motivoSinPermiso = 'La cuenta se conectó sin el permiso de estadísticas.';
    } else {
      try {
        // 2a. Lo que va de hoy, cada hora: el botón «Hoy» y las altas y bajas
        //     con que se reconstruyen los seguidores de ayer.
        if (vencido(estado.hoyEn, CADA.perfil)) {
          await guardarHoy(ctx);
          cambios.hoyEn = Date.now();
          hecho.push('hoy');
        }

        // 2b. Los últimos tres días cerrados, que Meta sigue corrigiendo: cada
        //     6 h y en cuanto cambia el día (para que «Ayer» deje de ir a medias).
        const cambioDeDia = estado.insightsEn != null && fechaIg(estado.insightsEn) !== fechaIg(Date.now());
        if (vencido(estado.insightsEn, CADA.insights) || cambioDeDia) {
          for (let i = 1; i <= 3; i++) await guardarDia(ctx, sumarDias(fechaIg(Date.now()), -i));
          cambios.insightsEn = Date.now();
          hecho.push('dias');
        }

        // 3. El historial, hacia atrás, hasta 90 días. Se reparte entre pasadas.
        if (!estado.historialCompleto) {
          if (!(await bajarHistorial(ctx))) pendiente = true;
          hecho.push('historial');
        }

        // 4. Alcance único de cada periodo (no se puede sumar por día).
        if (vencido(estado.unicosEn, CADA.unicos) && ctx.queda() > 10_000) {
          cambios.unicos = await pedirUnicos(ctx);
          cambios.unicosEn = Date.now();
          hecho.push('unicos');
        }

        // 5. Métricas de cada publicación.
        if ((vencido(estado.postsEn, CADA.posts) || estado.postsPendientes) && ctx.queda() > 5_000) {
          const terminado = await metricasDePosts(ctx, Boolean(opciones.forzar));
          cambios.postsPendientes = !terminado;
          if (terminado) cambios.postsEn = Date.now();
          else pendiente = true;
          hecho.push('posts');
        }

        // 6. Quién te sigue y quién interactúa: una vez al día.
        if (vencido(estado.audienciaEn, CADA.audiencia) && ctx.queda() > 12_000) {
          await audienciaRef(account.id).set(await pedirAudiencia(ctx));
          cambios.audienciaEn = Date.now();
          hecho.push('audiencia');
        }

        cambios.permiso = 'si';
        cambios.permisoRevisadoEn = Date.now();
        cambios.motivoSinPermiso = null;
      } catch (err) {
        if (!(err instanceof InstagramApiError) || !err.isPermissionError) throw err;
        cambios.permiso = 'no';
        cambios.permisoRevisadoEn = Date.now();
        cambios.motivoSinPermiso = `Meta no dejó leer las estadísticas: ${err.message}`;
      }
    }

    cambios.vetadas = {
      cuenta: [...ctx.vetadas.cuenta],
      cuentaFollowType: [...ctx.vetadas.cuentaFollowType],
      cuentaFollowerType: [...ctx.vetadas.cuentaFollowerType],
    };
    cambios.ultimoError = null;
    cambios.ultimoErrorEn = null;
  } catch (err) {
    error = mensaje(err);
    cambios.ultimoError = error;
    cambios.ultimoErrorEn = Date.now();
    if (err instanceof InstagramApiError) {
      if (err.isAuthError) await flagAccountError(account.id, err).catch(() => {});
      // Con límite de llamadas, media hora de silencio.
      if (err.isRateLimit) esperar = 30 * MINUTO;
    }
    // Cualquier otro error se reintenta en unos minutos, no en el siguiente tick.
    if (!esperar) esperar = 10 * MINUTO;
  } finally {
    const final = { ...estado, ...cambios };
    const proximas = [
      (final.perfilEn ?? 0) + CADA.perfil,
      conPermiso ? (final.hoyEn ?? 0) + CADA.perfil : Infinity,
      conPermiso ? (final.insightsEn ?? 0) + CADA.insights : Infinity,
      conPermiso ? (final.unicosEn ?? 0) + CADA.unicos : Infinity,
      conPermiso ? (final.postsEn ?? 0) + CADA.posts : Infinity,
      conPermiso ? (final.audienciaEn ?? 0) + CADA.audiencia : Infinity,
    ];
    let proximaEn = pendiente ? Date.now() : Math.min(...proximas);
    if (esperar) proximaEn = Date.now() + esperar;
    await estadoRef(account.id).set({ ...cambios, proximaEn, corriendoHasta: 0 }, { merge: true });
  }

  return { hecho, pendiente, error };
}

async function guardarPerfil(ctx: Contexto): Promise<void> {
  const p = await getSelfProfile(ctx.token);
  const hoy = fechaIg(Date.now());
  const perfil: PerfilIg = {
    id: ctx.account.id,
    username: p.username ?? ctx.account.username,
    nombre: p.name ?? null,
    foto: p.profile_picture_url ?? null,
    bio: p.biography ?? null,
    sitio: p.website ?? null,
    seguidores: p.followers_count ?? null,
    siguiendo: p.follows_count ?? null,
    publicaciones: p.media_count ?? null,
  };
  await diasCol(ctx.account.id).doc(hoy).set(
    {
      fecha: hoy,
      seguidores: p.followers_count,
      siguiendo: p.follows_count,
      publicaciones: p.media_count,
      perfilEn: Date.now(),
    },
    { merge: true },
  );
  // La foto del CDN de Meta caduca: de paso se refresca la de la barra lateral.
  if (perfil.foto) await accountRef(ctx.account.id).update({ profilePictureUrl: perfil.foto });
  ctx.cambios.perfil = perfil;
  ctx.cambios.perfilEn = Date.now();
}

async function guardarPublicaciones(ctx: Contexto): Promise<void> {
  const TOPE = 500;
  const media = await listAllMedia(ctx.token, TOPE);
  const col = postsCol(ctx.account.id);
  const hoy = fechaIg(Date.now());

  let lote = adminDb.batch();
  let enLote = 0;
  const escribe = async (fn: (b: WriteBatch) => void) => {
    fn(lote);
    if (++enLote >= 400) {
      await lote.commit();
      lote = adminDb.batch();
      enLote = 0;
    }
  };

  for (const m of media) {
    await escribe((b) =>
      b.set(
        col.doc(m.id),
        {
          id: m.id,
          tipo: tipoDe(m),
          grupo: grupoDe(m),
          caption: (m.caption ?? '').slice(0, 2200),
          permalink: m.permalink ?? null,
          fecha: m.timestamp ? Date.parse(m.timestamp) : Date.now(),
          // En video, media_url es el video: la portada es thumbnail_url.
          miniatura: m.thumbnail_url ?? (m.media_type === 'VIDEO' ? null : m.media_url) ?? null,
          likes: m.like_count ?? null,
          comentarios: m.comments_count ?? null,
          // La foto de hoy (se pisa cada hora): restando días salen los likes
          // y comentarios que llegaron cada día, sin permiso de estadísticas.
          ...(typeof m.like_count === 'number' || typeof m.comments_count === 'number'
            ? { diario: { [hoy]: { l: m.like_count ?? 0, c: m.comments_count ?? 0 } } }
            : {}),
        },
        { merge: true },
      ),
    );
  }

  // Lo que ya no está en Instagram (borrado o archivado) sale del tablero.
  // Solo si la lista vino completa: si se cortó en el tope, faltar no es prueba.
  if (media.length < TOPE) {
    const vivos = new Set(media.map((m) => m.id));
    const guardados = await col.select().get();
    for (const d of guardados.docs) {
      if (!vivos.has(d.id)) await escribe((b) => b.delete(d.ref));
    }
  }
  if (enLote) await lote.commit();
}

async function guardarHistorias(ctx: Contexto, conPermiso: boolean): Promise<void> {
  const vivas = await listStories(ctx.token);
  for (const h of vivas) {
    let metricas: MetricasPost | null = null;
    if (conPermiso) {
      try {
        metricas = await metricasDe(ctx, h.id, 'STORY');
      } catch (err) {
        // Historias con pocas vistas: Meta contesta «Not enough viewers» (código 10).
        // Si lo que falta es el permiso, el paso de estadísticas lo detecta y lo anota.
        if (!(err instanceof InstagramApiError) || err.isAuthError) throw err;
      }
    }
    await historiasCol(ctx.account.id).doc(h.id).set(
      {
        id: h.id,
        fecha: h.timestamp ? Date.parse(h.timestamp) : Date.now(),
        esVideo: h.media_type === 'VIDEO',
        miniatura: h.thumbnail_url ?? (h.media_type === 'VIDEO' ? null : h.media_url) ?? null,
        permalink: h.permalink ?? null,
        ...(metricas ? { metricas, metricasEn: Date.now() } : {}),
      },
      { merge: true },
    );
  }
}

/** Una copia de los vetos para pedidos que no deben vetar nada para siempre. */
function copiaDeVetos(v: Vetos): Vetos {
  return {
    cuenta: new Set(v.cuenta),
    cuentaFollowType: new Set(v.cuentaFollowType),
    cuentaFollowerType: new Set(v.cuentaFollowerType),
  };
}

/**
 * Todo lo de un día de la cuenta: totales, altas y bajas, y el reparto
 * seguidores / no seguidores. `hastaMs` corta el día en curso en «ahora».
 */
async function insightsDelDia(
  ctx: Contexto,
  fecha: string,
  vetadas: Vetos,
  hastaMs?: number,
): Promise<Partial<DiaIg>> {
  const base = {
    period: 'day',
    metric_type: 'total_value',
    since: segundos(fecha),
    until: hastaMs ? Math.floor(hastaMs / 1000) : segundos(sumarDias(fecha, 1)),
  };
  const cifras: Record<string, number> = {};

  const totales = await pedirMetricas(
    (ms) => getAccountInsights(ctx.token, { ...base, metric: ms.join(',') }),
    METRICAS_DIA,
    vetadas.cuenta,
  );
  for (const i of totales) {
    const k = A_DIA[i.name];
    const v = valorDe(i);
    if (k && v != null) cifras[k] = v;
  }
  const dia: Partial<DiaIg> = { ...cifras };

  const porSeguir = await pedirOpcional(
    (ms) => getAccountInsights(ctx.token, { ...base, metric: ms.join(','), breakdown: 'follow_type' }),
    ['follows_and_unfollows', 'reach'],
    vetadas.cuentaFollowType,
  );
  for (const i of porSeguir) {
    const d = desgloseDe(i, 'follow_type');
    if (!d) continue;
    if (i.name === 'follows_and_unfollows') dia.altasBajas = d;
    if (i.name === 'reach') dia.alcancePorSeguidor = d;
  }

  const vistas = await pedirOpcional(
    (ms) => getAccountInsights(ctx.token, { ...base, metric: ms.join(','), breakdown: 'follower_type' }),
    ['views'],
    vetadas.cuentaFollowerType,
  );
  for (const i of vistas) {
    const d = desgloseDe(i, 'follower_type');
    if (d) dia.vistasPorSeguidor = d;
  }

  dia.insightsEn = Date.now();
  return dia;
}

async function guardarDia(ctx: Contexto, fecha: string, vetadas: Vetos = ctx.vetadas): Promise<void> {
  const dia = await insightsDelDia(ctx, fecha, vetadas);
  await diasCol(ctx.account.id).doc(fecha).set({ fecha, ...dia, parcial: false }, { merge: true });
}

/**
 * Lo que va de hoy, a medias (`parcial`). Con una copia de los vetos: un
 * parámetro raro del día en curso no debe vetar nada para los días cerrados.
 */
async function guardarHoy(ctx: Contexto): Promise<void> {
  const hoy = fechaIg(Date.now());
  try {
    const dia = await insightsDelDia(ctx, hoy, copiaDeVetos(ctx.vetadas), Date.now());
    await diasCol(ctx.account.id).doc(hoy).set({ fecha: hoy, ...dia, parcial: true }, { merge: true });
  } catch (err) {
    if (err instanceof InstagramApiError && (err.isPermissionError || err.isAuthError || err.isRateLimit)) {
      throw err;
    }
    // Meta puede no dar el día en curso: la pantalla toma sus altas y bajas como cero.
  }
}

/**
 * Baja días hacia atrás desde donde se quedó. Devuelve true si ya terminó.
 * Si Meta rechaza un día viejo, ahí se acaba lo que guarda: se da por completo.
 */
async function bajarHistorial(ctx: Contexto): Promise<boolean> {
  const hoy = fechaIg(Date.now());
  const meta = sumarDias(hoy, -DIAS_DE_HISTORIAL);
  // Los tres días más recientes ya los baja el paso 2.
  let fecha = ctx.estado.historialDesde ? sumarDias(ctx.estado.historialDesde, -1) : sumarDias(hoy, -4);
  const vetadas = copiaDeVetos(ctx.vetadas);

  while (fecha >= meta) {
    if (ctx.queda() < 6_000) return false;
    try {
      await guardarDia(ctx, fecha, vetadas);
    } catch (err) {
      if (err instanceof InstagramApiError && err.isInvalidParameter) {
        ctx.cambios.historialDesde = sumarDias(fecha, 1);
        ctx.cambios.historialCompleto = true;
        return true;
      }
      throw err;
    }
    ctx.cambios.historialDesde = fecha;
    fecha = sumarDias(fecha, -1);
  }
  ctx.cambios.historialCompleto = true;
  return true;
}

async function pedirUnicos(ctx: Contexto): Promise<Unicos> {
  const hoy = fechaIg(Date.now());
  const r: Unicos = {};
  for (const dias of RANGOS_LARGOS) {
    r[dias] = {
      actual: await unicosDe(ctx, periodo(hoy, dias)),
      anterior: await unicosDe(ctx, periodo(hoy, dias, true)),
    };
  }
  return r;
}

async function unicosDe(ctx: Contexto, p: { desde: string; hasta: string }): Promise<UnicosPeriodo | null> {
  // Un periodo largo puede no aceptar alguna métrica: eso no la veta para los días.
  const vetadas = copiaDeVetos(ctx.vetadas);
  try {
    const datos = await pedirMetricas(
      (ms) =>
        getAccountInsights(ctx.token, {
          metric: ms.join(','),
          period: 'day',
          metric_type: 'total_value',
          since: segundos(p.desde),
          until: segundos(sumarDias(p.hasta, 1)),
        }),
      ['reach', 'accounts_engaged'],
      vetadas.cuenta,
    );
    const de = (nombre: string) => {
      const i = datos.find((x) => x.name === nombre);
      return i ? valorDe(i) : null;
    };
    return { ...p, alcance: de('reach'), cuentasInteraccion: de('accounts_engaged') };
  } catch (err) {
    // Meta puede no dar un periodo tan largo: la pantalla usa el promedio diario.
    if (err instanceof InstagramApiError && err.isInvalidParameter) return null;
    throw err;
  }
}

async function metricasDe(ctx: Contexto, mediaId: string, grupo: GrupoPost): Promise<MetricasPost> {
  const datos = await pedirMetricas(
    (ms) => getMediaInsights(mediaId, ctx.token, ms.join(',')),
    METRICAS_POST[grupo],
    ctx.vetadasPost[grupo],
  );
  const m: MetricasPost = {};
  for (const i of datos) {
    const k = A_POST[i.name];
    const v = valorDe(i);
    if (k && v != null) m[k] = v;
  }
  return m;
}

/**
 * Métricas de los posts que ya toca refrescar: los de esta semana cada 6 h,
 * los del último mes y medio a diario, los demás cada semana. Devuelve false
 * si se acabó el tiempo antes de terminar.
 */
async function metricasDePosts(ctx: Contexto, forzar: boolean): Promise<boolean> {
  const snap = await postsCol(ctx.account.id).select('fecha', 'grupo', 'metricasEn').get();
  const ahora = Date.now();
  const tocan = snap.docs
    .map((d) => ({
      id: d.id,
      fecha: (d.get('fecha') as number) ?? 0,
      grupo: (d.get('grupo') as GrupoPost) ?? 'FEED',
      metricasEn: (d.get('metricasEn') as number | null) ?? null,
    }))
    .filter((p) => {
      const edad = ahora - p.fecha;
      if (forzar && edad < 7 * DIA) return true;
      const cada = edad < 7 * DIA ? 6 * HORA : edad < 45 * DIA ? DIA : 7 * DIA;
      return !p.metricasEn || ahora - p.metricasEn >= cada;
    })
    .sort((a, b) => b.fecha - a.fecha);

  for (const p of tocan) {
    if (ctx.queda() < 4_000) return false;
    const ref = postsCol(ctx.account.id).doc(p.id);
    try {
      const metricas = await metricasDe(ctx, p.id, p.grupo);
      await ref.set({ metricas, metricasEn: Date.now(), metricasError: null }, { merge: true });
    } catch (err) {
      if (
        err instanceof InstagramApiError &&
        !err.isPermissionError &&
        !err.isAuthError &&
        !err.isRateLimit
      ) {
        // Un post que Meta no mide (p. ej. anterior a la cuenta profesional):
        // se anota y no se reintenta hasta su siguiente turno.
        await ref.set({ metricasEn: Date.now(), metricasError: err.message }, { merge: true });
        continue;
      }
      throw err;
    }
  }
  return true;
}

async function pedirAudiencia(ctx: Contexto): Promise<AudienciaIg> {
  const res: AudienciaIg = { seguidores: null, interaccion: null, periodo: null, actualizadoEn: Date.now() };
  for (const [metrica, clave] of DEMOGRAFIAS) {
    const demo: Demografia = { edad: [], genero: [], ciudad: [], pais: [] };
    let alguna = false;
    for (const [corte, campo] of CORTES) {
      const reparto = await pedirReparto(ctx, metrica, corte);
      if (reparto) {
        demo[campo] = reparto;
        alguna = true;
      }
    }
    if (alguna) res[clave] = demo;
  }
  res.periodo = ctx.cambios.timeframe ?? ctx.estado.timeframe ?? null;
  return res;
}

/**
 * Un reparto de audiencia. Meta ha cambiado qué `timeframe` acepta según la
 * versión, así que se prueban en orden y se recuerda el que funcionó.
 */
async function pedirReparto(ctx: Contexto, metrica: string, corte: string): Promise<Reparto | null> {
  const conocido = ctx.cambios.timeframe ?? ctx.estado.timeframe;
  const timeframes = conocido ? [conocido, ...TIMEFRAMES.filter((t) => t !== conocido)] : TIMEFRAMES;
  const paramConocido = ctx.cambios.paramDesglose ?? ctx.estado.paramDesglose;
  const params = paramConocido ? [paramConocido] : ['breakdown', 'breakdowns'];

  for (const param of params) {
    for (const timeframe of timeframes) {
      try {
        const datos = await getAccountInsights(ctx.token, {
          metric: metrica,
          period: 'lifetime',
          metric_type: 'total_value',
          timeframe,
          [param]: corte,
        });
        ctx.cambios.timeframe = timeframe;
        ctx.cambios.paramDesglose = param;
        const d = datos[0] ? desgloseDe(datos[0], corte) : null;
        if (!d) return [];
        return Object.entries(d)
          .map(([k, valor]) => ({ clave: k, valor }))
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 45);
      } catch (err) {
        if (err instanceof InstagramApiError && err.isInvalidParameter) continue;
        throw err;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// El tablero
// ---------------------------------------------------------------------------

export async function leerTablero(account: IgAccount): Promise<TableroIg> {
  const ahora = Date.now();
  const hoy = fechaIg(ahora);

  const [estadoSnap, audienciaSnap, diasSnap, postsSnap, historiasSnap, bandeja, automatizaciones] =
    await Promise.all([
      estadoRef(account.id).get(),
      audienciaRef(account.id).get(),
      diasCol(account.id).where('fecha', '>=', sumarDias(hoy, -400)).get(),
      postsCol(account.id).orderBy('fecha', 'desc').limit(500).get(),
      historiasCol(account.id).orderBy('fecha', 'desc').limit(60).get(),
      // Lo de la bandeja es un extra: si falla, el tablero sale igual.
      leerBandeja(account.id, sumarDias(hoy, -200)).catch((err): Record<string, BandejaDia> => {
        console.error('[estadisticas] bandeja', err);
        return {};
      }),
      automatizacionesTop(account.id).catch((err): TableroIg['automatizaciones'] => {
        console.error('[estadisticas] automatizaciones', err);
        return [];
      }),
    ]);

  const e = (estadoSnap.data() ?? {}) as EstadoGuardado;
  const permisoEnToken = tienePermiso(account);
  // Un «no» anterior a la última conexión ya no cuenta: pudieron reconectar.
  const noVigente = e.permiso === 'no' && (e.permisoRevisadoEn ?? 0) > (account.connectedAt ?? 0);
  const conPermiso = permisoEnToken && !noVigente;
  const motivoSinPermiso = !permisoEnToken
    ? 'Tu cuenta se conectó antes de que el panel pidiera el permiso de estadísticas.'
    : noVigente
      ? (e.motivoSinPermiso ?? 'Meta no dejó leer las estadísticas.')
      : null;

  const perfil: PerfilIg = e.perfil ?? {
    id: account.id,
    username: account.username,
    nombre: account.name,
    foto: account.profilePictureUrl,
    bio: null,
    sitio: null,
    seguidores: account.followersCount,
    siguiendo: null,
    publicaciones: null,
  };

  const dias = diasSnap.docs.map((d) => ({ ...(d.data() as DiaIg), fecha: d.id }));

  // Likes y comentarios que llegaron cada día, de las fotos horarias de cada post.
  const recibidos = recibidosPorDia(
    postsSnap.docs.map((d) => ({
      fecha: (d.get('fecha') as number) ?? 0,
      diario: d.get('diario') as Record<string, FotoPost> | undefined,
    })),
  );
  const porFecha = new Map(dias.map((d) => [d.fecha, d]));
  for (const [fecha, r] of Object.entries(recibidos)) {
    let dia = porFecha.get(fecha);
    if (!dia) {
      dia = { fecha };
      porFecha.set(fecha, dia);
      dias.push(dia);
    }
    dia.likesPosts = r.likes;
    dia.comentariosPosts = r.comentarios;
  }
  dias.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const posts: PostIg[] = postsSnap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      tipo: (x.tipo as TipoPost) ?? 'foto',
      caption: x.caption ?? '',
      permalink: x.permalink ?? null,
      fecha: x.fecha ?? 0,
      miniatura: x.miniatura ?? null,
      likes: x.likes ?? null,
      comentarios: x.comentarios ?? null,
      metricas: x.metricas ?? null,
      metricasEn: x.metricasEn ?? null,
    };
  });

  const historias: HistoriaIg[] = historiasSnap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      fecha: x.fecha ?? 0,
      esVideo: Boolean(x.esVideo),
      miniatura: x.miniatura ?? null,
      permalink: x.permalink ?? null,
      metricas: x.metricas ?? null,
      metricasEn: x.metricasEn ?? null,
    };
  });

  return {
    hoy,
    generadoEn: ahora,
    perfil,
    estado: {
      conPermiso,
      motivoSinPermiso,
      perfilEn: e.perfilEn ?? null,
      insightsEn: e.insightsEn ?? null,
      historialDesde: e.historialDesde ?? null,
      historialCompleto: Boolean(e.historialCompleto),
      ultimoError:
        e.ultimoError && e.ultimoErrorEn && ahora - e.ultimoErrorEn < 6 * HORA ? e.ultimoError : null,
    },
    dias,
    posts,
    historias,
    audiencia: audienciaSnap.exists ? (audienciaSnap.data() as AudienciaIg) : null,
    unicos: e.unicos ?? {},
    bandeja,
    automatizaciones,
  };
}

/** Lo que pasó en la bandeja y en el cotizador, por día de Instagram. */
async function leerBandeja(accountId: string, desde: string): Promise<Record<string, BandejaDia>> {
  const desdeMs = inicioDiaIg(desde);
  const [contactos, corridas, leads] = await Promise.all([
    contactsCol(accountId).where('firstSeenAt', '>=', desdeMs).select('firstSeenAt').get(),
    runsCol(accountId).where('startedAt', '>=', desdeMs).select('startedAt').get(),
    adminDb
      .collection('solicitudesCotizacion')
      .where('createdAt', '>=', Timestamp.fromMillis(desdeMs))
      .select('createdAt', 'source')
      .get(),
  ]);

  const dias: Record<string, BandejaDia> = {};
  const suma = (ms: number, k: keyof BandejaDia) => {
    const f = fechaIg(ms);
    const d = (dias[f] ??= {});
    d[k] = (d[k] ?? 0) + 1;
  };
  for (const d of contactos.docs) {
    const t = d.get('firstSeenAt');
    if (typeof t === 'number') suma(t, 'personasNuevas');
  }
  for (const d of corridas.docs) {
    const t = d.get('startedAt');
    if (typeof t === 'number') suma(t, 'disparos');
  }
  for (const d of leads.docs) {
    const t = d.get('createdAt') as Timestamp | undefined;
    if (!t?.toMillis) continue;
    suma(t.toMillis(), 'leads');
    if (d.get('source') === 'instagram') suma(t.toMillis(), 'leadsIg');
  }
  return dias;
}

async function automatizacionesTop(accountId: string): Promise<TableroIg['automatizaciones']> {
  const snap = await automationsCol(accountId).get();
  return snap.docs
    .map((d) => ({
      id: d.id,
      nombre: (d.get('name') as string) || 'Sin nombre',
      disparos: (d.get('stats.triggered') as number) ?? 0,
    }))
    .filter((a) => a.disparos > 0)
    .sort((a, b) => b.disparos - a.disparos)
    .slice(0, 5);
}
