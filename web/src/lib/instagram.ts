import 'server-only';

/**
 * Cliente de la Instagram Messaging API (Instagram API with Instagram Login).
 *
 * Docs: developers.facebook.com/docs/instagram-platform
 * Base: https://graph.instagram.com/v25.0  — NO requiere página de Facebook.
 */

export const IG_API_VERSION = 'v25.0';
export const IG_GRAPH = `https://graph.instagram.com/${IG_API_VERSION}`;
export const IG_GRAPH_ROOT = 'https://graph.instagram.com';
export const IG_OAUTH_AUTHORIZE = 'https://www.instagram.com/oauth/authorize';
export const IG_OAUTH_TOKEN = 'https://api.instagram.com/oauth/access_token';

/**
 * Permisos para leer perfil, mandar DMs, leer/responder comentarios y ver las
 * estadísticas (alcance, vistas, audiencia) del tablero de /instagram. Una
 * cuenta conectada antes de que se pidiera el último tiene que reconectarse.
 */
export const IG_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
  'instagram_business_manage_insights',
] as const;

/** Campos de webhook a los que nos suscribimos al conectar una cuenta. */
export const IG_WEBHOOK_FIELDS = [
  'messages',
  'messaging_postbacks',
  'messaging_seen',
  'message_reactions',
  'messaging_referral',
  'comments',
] as const;

/** Límites duros de la plataforma; los aplicamos antes de llamar a Meta. */
export const IG_LIMITS = {
  textBytes: 1000,
  buttons: 3,
  quickReplies: 13,
  quickReplyTitle: 20,
  buttonTitle: 20,
} as const;

// ---------------------------------------------------------------------------

export class InstagramApiError extends Error {
  constructor(
    message: string,
    readonly code: number | null,
    readonly subcode: number | null,
    readonly type: string | null,
    readonly traceId: string | null,
    readonly status: number,
  ) {
    super(message);
    this.name = 'InstagramApiError';
  }

  /** El token murió o fue revocado: hay que reconectar la cuenta. */
  get isAuthError(): boolean {
    return this.code === 190 || this.code === 102 || this.status === 401;
  }

  /** Fuera de la ventana de 24h. */
  get isOutsideWindow(): boolean {
    return this.code === 10 && (this.subcode === 2534022 || this.subcode === 2018278);
  }

  get isRateLimit(): boolean {
    return this.code === 4 || this.code === 17 || this.code === 613 || this.status === 429;
  }

  /**
   * Al token le falta un permiso (p. ej. el de estadísticas). Ojo: el código 10
   * también sale con «Not enough viewers» en historias chicas; eso no es esto.
   */
  get isPermissionError(): boolean {
    const code = this.code ?? 0;
    return (code === 10 || (code >= 200 && code < 300)) && /permission|permiso/i.test(this.message);
  }

  /** Parámetro que Meta no acepta: una métrica que no existe para ese tipo de post, un periodo… */
  get isInvalidParameter(): boolean {
    return this.code === 100;
  }
}

type FetchOpts = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Reintentos ante 429/5xx con backoff exponencial. */
  retries?: number;
};

async function igFetch<T>(path: string, token: string, opts: FetchOpts = {}): Promise<T> {
  const { method = 'GET', body, query = {}, retries = 2 } = opts;

  const url = new URL(path.startsWith('http') ? path : `${IG_GRAPH}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  url.searchParams.set('access_token', token);

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 2 ** attempt * 400));
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
    } catch (err) {
      lastError = err;
      continue; // error de red: reintentar
    }

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    if (res.ok) return json as T;

    const e = (json as { error?: Record<string, unknown> }).error ?? {};
    const apiError = new InstagramApiError(
      String(e.message ?? `Instagram respondió ${res.status}`),
      typeof e.code === 'number' ? e.code : null,
      typeof e.error_subcode === 'number' ? e.error_subcode : null,
      typeof e.type === 'string' ? e.type : null,
      typeof e.fbtrace_id === 'string' ? e.fbtrace_id : null,
      res.status,
    );

    // Solo reintentamos lo que puede resolverse solo.
    if ((apiError.isRateLimit || res.status >= 500) && attempt < retries) {
      lastError = apiError;
      continue;
    }
    throw apiError;
  }

  throw lastError instanceof Error
    ? lastError
    : new InstagramApiError('Instagram no respondió', null, null, null, null, 0);
}

// ---------------------------------------------------------------------------
// OAuth / tokens
// ---------------------------------------------------------------------------

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(IG_OAUTH_AUTHORIZE);
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', IG_SCOPES.join(','));
  url.searchParams.set('state', params.state);
  return url.toString();
}

/** Paso 1: código -> token corto (1 hora). */
export async function exchangeCodeForToken(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{ accessToken: string; userId: string; permissions: string[] }> {
  const form = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: params.redirectUri,
    code: params.code,
  });

  const res = await fetch(IG_OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    cache: 'no-store',
  });

  const json = (await res.json()) as {
    access_token?: string;
    user_id?: number | string;
    permissions?: string[] | string;
    error_message?: string;
    error_type?: string;
  };

  if (!res.ok || !json.access_token) {
    throw new InstagramApiError(
      json.error_message ?? 'No se pudo canjear el código de autorización',
      null,
      null,
      json.error_type ?? null,
      null,
      res.status,
    );
  }

  const permissions = Array.isArray(json.permissions)
    ? json.permissions
    : String(json.permissions ?? '')
        .split(',')
        .filter(Boolean);

  return { accessToken: json.access_token, userId: String(json.user_id ?? ''), permissions };
}

/** Paso 2: token corto -> token largo (60 días). */
export async function exchangeForLongLivedToken(params: {
  clientSecret: string;
  shortLivedToken: string;
}): Promise<{ accessToken: string; expiresIn: number }> {
  const url = new URL(`${IG_GRAPH_ROOT}/access_token`);
  url.searchParams.set('grant_type', 'ig_exchange_token');
  url.searchParams.set('client_secret', params.clientSecret);
  url.searchParams.set('access_token', params.shortLivedToken);

  const res = await fetch(url, { cache: 'no-store' });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (!res.ok || !json.access_token) {
    throw new InstagramApiError(
      json.error?.message ?? 'No se pudo obtener el token de larga duración',
      null, null, null, null, res.status,
    );
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in ?? 5184000 };
}

/**
 * Renueva un token largo. Requisitos de Meta: el token debe tener >24h de vida,
 * no estar vencido, y haberse usado en los últimos 60 días.
 */
export async function refreshLongLivedToken(token: string): Promise<{ accessToken: string; expiresIn: number }> {
  const url = new URL(`${IG_GRAPH_ROOT}/refresh_access_token`);
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', token);

  const res = await fetch(url, { cache: 'no-store' });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string; code?: number };
  };

  if (!res.ok || !json.access_token) {
    throw new InstagramApiError(
      json.error?.message ?? 'No se pudo renovar el token',
      json.error?.code ?? null, null, null, null, res.status,
    );
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in ?? 5184000 };
}

// ---------------------------------------------------------------------------
// Perfil y suscripción
// ---------------------------------------------------------------------------

export type IgSelfProfile = {
  user_id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  biography?: string;
  website?: string;
};

export function getSelfProfile(token: string) {
  return igFetch<IgSelfProfile>('/me', token, {
    query: {
      fields:
        'user_id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website',
    },
  });
}

export type IgContactProfile = {
  id?: string;
  name?: string;
  username?: string;
  profile_pic?: string;
  follower_count?: number;
  is_verified_user?: boolean;
  is_user_follow_business?: boolean;
  is_business_follow_user?: boolean;
};

/**
 * Perfil de quien nos escribe. Solo funciona dentro de una conversación activa;
 * si falla no es crítico, seguimos con lo que traiga el webhook.
 */
export function getContactProfile(igsid: string, token: string) {
  return igFetch<IgContactProfile>(`/${igsid}`, token, {
    query: {
      fields:
        'name,username,profile_pic,follower_count,is_verified_user,is_user_follow_business,is_business_follow_user',
    },
  });
}

export type IgMedia = {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  /** FEED, REELS, STORY o AD. Solo lo piden las estadísticas. */
  media_product_type?: string;
  caption?: string;
  permalink?: string;
  timestamp?: string;
  /** Imagen del post (o portada del video). Son URLs del CDN de Meta y caducan. */
  media_url?: string;
  thumbnail_url?: string;
  comments_count?: number;
  like_count?: number;
};

/**
 * Publicaciones de la cuenta conectada, de la más reciente a la más vieja.
 * Se usa para elegir en qué posts aplica una automatización de comentarios.
 */
export async function listMedia(token: string, limit = 30): Promise<IgMedia[]> {
  const res = await igFetch<{ data?: IgMedia[] }>('/me/media', token, {
    query: {
      fields:
        'id,media_type,caption,permalink,timestamp,media_url,thumbnail_url,comments_count,like_count',
      limit,
    },
  });
  return res.data ?? [];
}

// ---------------------------------------------------------------------------
// Estadísticas (tablero de /instagram)
// ---------------------------------------------------------------------------

const CAMPOS_MEDIA =
  'id,media_type,media_product_type,caption,permalink,timestamp,media_url,thumbnail_url,comments_count,like_count';

/**
 * TODAS las publicaciones, página por página, hasta `tope`. Likes y
 * comentarios salen con el permiso básico; lo demás pide el de estadísticas.
 */
export async function listAllMedia(token: string, tope = 500): Promise<IgMedia[]> {
  type Pagina = { data?: IgMedia[]; paging?: { next?: string } };
  const todas: IgMedia[] = [];
  let pagina = await igFetch<Pagina>('/me/media', token, {
    query: { fields: CAMPOS_MEDIA, limit: 100 },
  });
  todas.push(...(pagina.data ?? []));
  while (pagina.paging?.next && todas.length < tope) {
    pagina = await igFetch<Pagina>(pagina.paging.next, token);
    todas.push(...(pagina.data ?? []));
  }
  return todas.slice(0, tope);
}

/** Las historias vivas (las últimas 24 h). */
export async function listStories(token: string): Promise<IgMedia[]> {
  const res = await igFetch<{ data?: IgMedia[] }>('/me/stories', token, {
    query: { fields: 'id,media_type,media_product_type,permalink,timestamp,media_url,thumbnail_url' },
  });
  return res.data ?? [];
}

/** Una métrica tal como la devuelve `/insights`. */
export type IgInsight = {
  name: string;
  period?: string;
  values?: { value: number | Record<string, number>; end_time?: string }[];
  total_value?: {
    value?: number;
    breakdowns?: {
      dimension_keys: string[];
      results: { dimension_values: string[]; value: number }[];
    }[];
  };
};

/**
 * Estadísticas de la cuenta conectada. `query` lleva `metric`, `period`,
 * `metric_type`, `since`/`until`, `breakdown` o `timeframe` según la métrica.
 */
export async function getAccountInsights(
  token: string,
  query: Record<string, string | number | undefined>,
): Promise<IgInsight[]> {
  const res = await igFetch<{ data?: IgInsight[] }>('/me/insights', token, { query });
  return res.data ?? [];
}

/** Estadísticas de una publicación o historia. */
export async function getMediaInsights(
  mediaId: string,
  token: string,
  metric: string,
): Promise<IgInsight[]> {
  const res = await igFetch<{ data?: IgInsight[] }>(`/${mediaId}/insights`, token, {
    query: { metric },
  });
  return res.data ?? [];
}

/** Suscribe la app a los webhooks de esta cuenta. Sin esto no llegan eventos. */
export function subscribeToWebhooks(igUserId: string, token: string) {
  return igFetch<{ success: boolean }>(`/${igUserId}/subscribed_apps`, token, {
    method: 'POST',
    query: { subscribed_fields: IG_WEBHOOK_FIELDS.join(',') },
  });
}

export function getSubscriptions(igUserId: string, token: string) {
  return igFetch<{ data: { subscribed_fields?: string[] }[] }>(`/${igUserId}/subscribed_apps`, token);
}

// ---------------------------------------------------------------------------
// Envío de mensajes
// ---------------------------------------------------------------------------

export type OutgoingMessage =
  | { kind: 'text'; text: string }
  | { kind: 'media'; mediaType: 'image' | 'video' | 'audio'; url: string }
  | { kind: 'quick_replies'; text: string; replies: { title: string; payload: string }[] }
  | {
      kind: 'buttons';
      text: string;
      buttons: ({ type: 'postback'; title: string; payload: string } | { type: 'url'; title: string; url: string })[];
    };

export type SendTarget = { igsid: string } | { commentId: string };

function truncateBytes(text: string, maxBytes: number): string {
  const enc = new TextEncoder();
  if (enc.encode(text).length <= maxBytes) return text;
  let out = text;
  while (enc.encode(out).length > maxBytes - 1 && out.length > 0) {
    out = out.slice(0, -1);
  }
  return out + '…';
}

/** Traduce nuestro formato al payload que espera Meta. */
export function buildMessagePayload(msg: OutgoingMessage): Record<string, unknown> {
  switch (msg.kind) {
    case 'text':
      return { text: truncateBytes(msg.text, IG_LIMITS.textBytes) };

    case 'media':
      return { attachment: { type: msg.mediaType, payload: { url: msg.url } } };

    case 'quick_replies':
      return {
        text: truncateBytes(msg.text, IG_LIMITS.textBytes),
        quick_replies: msg.replies.slice(0, IG_LIMITS.quickReplies).map((r) => ({
          content_type: 'text',
          title: r.title.slice(0, IG_LIMITS.quickReplyTitle),
          payload: r.payload,
        })),
      };

    case 'buttons':
      return {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: truncateBytes(msg.text, IG_LIMITS.textBytes),
            buttons: msg.buttons.slice(0, IG_LIMITS.buttons).map((b) =>
              b.type === 'url'
                ? { type: 'web_url', url: b.url, title: b.title.slice(0, IG_LIMITS.buttonTitle) }
                : { type: 'postback', title: b.title.slice(0, IG_LIMITS.buttonTitle), payload: b.payload },
            ),
          },
        },
      };
  }
}

/** «Opción A», «Opción B» o «Opción C» */
function listOptions(options: string[]): string {
  const quoted = options.map((o) => `«${o}»`);
  if (quoted.length <= 1) return quoted.join('');
  return `${quoted.slice(0, -1).join(', ')} o ${quoted[quoted.length - 1]}`;
}

/**
 * Versión en texto de un mensaje. La respuesta privada a un comentario solo
 * admite texto: los botones de enlace se escriben como enlace y los demás se
 * vuelven la instrucción de qué contestar.
 */
export function toPlainText(msg: OutgoingMessage): string {
  const clean = (t: string) => t.replace(/​/g, '').trim();

  switch (msg.kind) {
    case 'text':
      return msg.text;
    case 'media':
      return msg.url;
    case 'quick_replies': {
      const options = msg.replies.map((r) => r.title);
      return [clean(msg.text), options.length ? `👉 Responde ${listOptions(options)}` : '']
        .filter(Boolean)
        .join('\n\n');
    }
    case 'buttons': {
      const links = msg.buttons.flatMap((b) => (b.type === 'url' ? [`${b.title}: ${b.url}`] : []));
      const replies = msg.buttons.flatMap((b) => (b.type === 'postback' ? [b.title] : []));
      return [clean(msg.text), ...links, replies.length ? `👉 Responde ${listOptions(replies)}` : '']
        .filter(Boolean)
        .join('\n\n');
    }
  }
}

export type SendResult = { recipient_id: string; message_id: string };

/**
 * Envía un mensaje.
 *
 * `humanAgent: true` usa la etiqueta HUMAN_AGENT, que amplía la ventana de 24h
 * a 7 días — solo válido para respuestas escritas por una persona real.
 */
export async function sendMessage(params: {
  igUserId: string;
  token: string;
  target: SendTarget;
  message: OutgoingMessage;
  humanAgent?: boolean;
}): Promise<SendResult> {
  const recipient =
    'igsid' in params.target ? { id: params.target.igsid } : { comment_id: params.target.commentId };

  const body: Record<string, unknown> = {
    recipient,
    message: buildMessagePayload(params.message),
  };

  if (params.humanAgent) {
    body.messaging_type = 'MESSAGE_TAG';
    body.tag = 'HUMAN_AGENT';
  }

  return igFetch<SendResult>(`/${params.igUserId}/messages`, params.token, { method: 'POST', body });
}

/** Indicador de "escribiendo…" — hace que los flujos se sientan humanos. */
export async function sendTypingIndicator(params: {
  igUserId: string;
  token: string;
  igsid: string;
  on: boolean;
}): Promise<void> {
  try {
    await igFetch(`/${params.igUserId}/messages`, params.token, {
      method: 'POST',
      retries: 0,
      body: {
        recipient: { id: params.igsid },
        sender_action: params.on ? 'typing_on' : 'typing_off',
      },
    });
  } catch {
    // Cosmético: si falla, el flujo sigue igual.
  }
}

export async function markSeen(params: { igUserId: string; token: string; igsid: string }): Promise<void> {
  try {
    await igFetch(`/${params.igUserId}/messages`, params.token, {
      method: 'POST',
      retries: 0,
      body: { recipient: { id: params.igsid }, sender_action: 'mark_seen' },
    });
  } catch {
    /* no crítico */
  }
}

// ---------------------------------------------------------------------------
// Comentarios
// ---------------------------------------------------------------------------

/** Respuesta pública debajo del comentario. */
export function replyToComment(params: { commentId: string; token: string; message: string }) {
  return igFetch<{ id: string }>(`/${params.commentId}/replies`, params.token, {
    method: 'POST',
    body: { message: truncateBytes(params.message, IG_LIMITS.textBytes) },
  });
}

/**
 * DM privado disparado por un comentario ("comenta INFO y te mando el link").
 * Meta permite uno por comentario, dentro de los 7 días posteriores.
 */
export function sendPrivateReply(params: {
  igUserId: string;
  token: string;
  commentId: string;
  message: OutgoingMessage;
}) {
  return sendMessage({
    igUserId: params.igUserId,
    token: params.token,
    target: { commentId: params.commentId },
    message: params.message,
  });
}

export function hideComment(params: { commentId: string; token: string; hide: boolean }) {
  return igFetch<{ success: boolean }>(`/${params.commentId}`, params.token, {
    method: 'POST',
    query: { hide: String(params.hide) },
  });
}

// ---------------------------------------------------------------------------
// Conversaciones (backfill inicial)
// ---------------------------------------------------------------------------

export type IgConversation = {
  id: string;
  updated_time?: string;
  participants?: { data: { id: string; username?: string }[] };
};

export function listConversations(igUserId: string, token: string, after?: string) {
  return igFetch<{ data: IgConversation[]; paging?: { cursors?: { after?: string } } }>(
    `/${igUserId}/conversations`,
    token,
    { query: { platform: 'instagram', fields: 'id,updated_time,participants', after } },
  );
}

export function listConversationMessages(conversationId: string, token: string) {
  return igFetch<{
    messages?: { data: { id: string; created_time?: string; from?: { id: string }; message?: string }[] };
  }>(`/${conversationId}`, token, {
    query: { fields: 'messages{id,created_time,from,to,message}' },
  });
}

// ---------------------------------------------------------------------------
// Publicación de contenido (Estudio)
// ---------------------------------------------------------------------------

/**
 * Publicar exige el permiso `instagram_business_content_publish` en la app de
 * Meta y reconectar la cuenta para que el token lo incluya. Sin él, Meta
 * responde con el código 200 (permiso faltante) y la UI lo explica.
 *
 * El flujo son siempre dos pasos: se crea un contenedor con la URL del medio
 * —Meta la descarga, así que tiene que ser pública— y después se publica.
 * El video no está listo al instante: hay que esperar a que su contenedor
 * pase a FINISHED.
 */
export type IgPublishKind = 'IMAGE' | 'STORIES' | 'REELS';

export type IgContainerStatus = {
  status_code: 'EXPIRED' | 'ERROR' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED';
  status?: string;
};

/** Paso 1: contenedor. Devuelve el id de creación. */
export async function createMediaContainer(params: {
  token: string;
  kind: IgPublishKind;
  mediaUrl: string;
  caption?: string;
  coverUrl?: string;
  /** Solo REELS: también aparece en el perfil. */
  shareToFeed?: boolean;
}): Promise<string> {
  const { token, kind, mediaUrl, caption, coverUrl, shareToFeed } = params;

  const body: Record<string, unknown> = {};
  if (kind === 'IMAGE') {
    body.image_url = mediaUrl;
  } else {
    body.video_url = mediaUrl;
    body.media_type = kind; // STORIES o REELS
  }
  if (kind === 'STORIES') body.media_type = 'STORIES';
  if (kind === 'REELS' && coverUrl) body.cover_url = coverUrl;
  if (kind === 'REELS' && shareToFeed !== undefined) body.share_to_feed = shareToFeed;
  // Las historias no llevan pie de foto.
  if (caption && kind !== 'STORIES') body.caption = caption;

  const res = await igFetch<{ id: string }>('/me/media', token, { method: 'POST', body });
  return res.id;
}

/** Estado del contenedor: el video tarda en procesarse. */
export function getContainerStatus(containerId: string, token: string) {
  return igFetch<IgContainerStatus>(`/${containerId}`, token, {
    query: { fields: 'status_code,status' },
  });
}

/** Espera a que un contenedor de video quede listo. Lanza si falla o expira. */
export async function waitForContainer(
  containerId: string,
  token: string,
  opts: { intentos?: number; esperaMs?: number } = {},
): Promise<void> {
  const { intentos = 20, esperaMs = 3000 } = opts;
  for (let i = 0; i < intentos; i++) {
    const estado = await getContainerStatus(containerId, token);
    if (estado.status_code === 'FINISHED' || estado.status_code === 'PUBLISHED') return;
    if (estado.status_code === 'ERROR' || estado.status_code === 'EXPIRED') {
      throw new InstagramApiError(
        `Instagram no pudo procesar el video (${estado.status ?? estado.status_code})`,
        null, null, null, null, 502,
      );
    }
    await new Promise((r) => setTimeout(r, esperaMs));
  }
  throw new InstagramApiError(
    'El video sigue procesándose en Instagram. Intenta publicar de nuevo en un minuto.',
    null, null, null, null, 504,
  );
}

/** Paso 2: publicar. Devuelve el id del medio ya publicado. */
export async function publishContainer(creationId: string, token: string): Promise<string> {
  const res = await igFetch<{ id: string }>('/me/media_publish', token, {
    method: 'POST',
    body: { creation_id: creationId },
  });
  return res.id;
}

/** Cuántas publicaciones quedan en la ventana de 24 h (límite de Meta: 50). */
export function getPublishingLimit(token: string) {
  return igFetch<{ data: { quota_usage: number; config?: { quota_total: number } }[] }>(
    '/me/content_publishing_limit',
    token,
    { query: { fields: 'quota_usage,config' } },
  );
}
