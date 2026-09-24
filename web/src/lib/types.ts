/**
 * Chatty — modelo de datos.
 *
 * Todo cuelga de una cuenta de Instagram conectada (`/accounts/{accountId}`),
 * donde accountId === el IG user id que devuelve Meta. Así un mismo despliegue
 * maneja varias cuentas sin colisiones.
 */

// ---------------------------------------------------------------------------
// Cuentas de Instagram
// ---------------------------------------------------------------------------

export type IgAccount = {
  id: string; // IG user id
  username: string;
  name: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  /**
   * El token vive en `/accounts/{id}/private/credentials`, no aquí: las reglas
   * de Firestore niegan esa subcolección a todo cliente. Este doc es legible
   * desde el navegador para pintar la UI.
   */
  tokenExpiresAt: number; // epoch ms
  tokenRefreshedAt: number;
  scopes: string[];
  connectedAt: number;
  connectedBy: string; // uid
  active: boolean;
  /** Se apaga si Meta revoca el token; la UI lo muestra para reconectar. */
  needsReconnect?: boolean;
  lastError?: string | null;
};

// ---------------------------------------------------------------------------
// Contactos
// ---------------------------------------------------------------------------

export type Contact = {
  id: string; // IGSID (Instagram-scoped user id)
  username: string | null;
  name: string | null;
  profilePic: string | null;
  isVerifiedUser?: boolean;
  followsBusiness?: boolean;
  businessFollows?: boolean;
  tags: string[];
  /** Campos personalizados capturados por flujos (askQuestion, setField). */
  fields: Record<string, string | number | boolean>;
  subscribed: boolean;
  firstSeenAt: number;
  lastMessageAt: number;
  notes?: string;
  /** automationId -> última vez que se le disparó, para respetar cooldowns. */
  automationHits?: Record<string, number>;
  /** El anuncio de Meta (Click to DM) que lo trajo, la primera vez (lo marca el webhook). */
  anuncio?: { adId: string | null; ref: string | null; titulo: string | null; en: number };
};

// ---------------------------------------------------------------------------
// Conversaciones y mensajes
// ---------------------------------------------------------------------------

export type ConversationStatus = 'open' | 'closed';

export type Conversation = {
  id: string; // === contactId (IGSID). 1 conversación por contacto.
  contactId: string;
  contactUsername: string | null;
  contactName: string | null;
  contactPic: string | null;
  lastMessagePreview: string;
  lastMessageAt: number;
  lastMessageDirection: MessageDirection;
  unreadCount: number;
  status: ConversationStatus;
  assignedTo: string | null; // uid
  /**
   * Meta solo permite responder libremente 24h después del último mensaje
   * del usuario. Guardamos el vencimiento para avisar en la UI y para que el
   * motor no intente enviar fuera de ventana.
   */
  windowExpiresAt: number;
  /** Si un humano toma la conversación, pausamos la automatización. */
  automationPaused: boolean;
  automationPausedUntil?: number | null;
  tags: string[];
};

export type MessageDirection = 'in' | 'out';

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'share'
  | 'story_reply'
  | 'story_mention'
  | 'reaction'
  | 'postback'
  | 'quick_reply'
  | 'deleted'
  | 'unsupported';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export type Attachment = {
  type: 'image' | 'video' | 'audio' | 'file' | 'share' | 'story';
  url: string;
  /** Copia en Cloud Storage: los CDN de Meta expiran en horas. */
  mirroredUrl?: string | null;
};

export type Message = {
  id: string; // mid de Meta, o id local para salientes en vuelo
  mid: string | null;
  direction: MessageDirection;
  type: MessageType;
  text: string | null;
  attachments: Attachment[];
  /** Respuesta a historia / cita de mensaje. */
  replyTo?: { mid: string; text?: string | null; storyUrl?: string | null } | null;
  reaction?: { emoji: string; action: 'react' | 'unreact' } | null;
  timestamp: number;
  status: MessageStatus;
  error?: string | null;
  /** Quién lo mandó: un humano del panel, una automatización, o el propio IG. */
  sentBy: 'human' | 'automation' | 'instagram';
  sentByUid?: string | null;
  flowId?: string | null;
  flowNodeId?: string | null;
  /** Echo = mensaje enviado desde la app de Instagram por el dueño de la cuenta. */
  isEcho?: boolean;
};

// ---------------------------------------------------------------------------
// Automatizaciones (disparadores)
// ---------------------------------------------------------------------------

export type MatchType = 'exact' | 'contains' | 'starts_with' | 'regex' | 'any';

export type TriggerType =
  | 'dm_keyword'      // palabra clave en un DM
  | 'comment_keyword' // comentario en un post -> DM privado
  | 'story_reply'     // respuesta a una historia
  | 'first_message'   // primer mensaje de un contacto nuevo
  | 'default_reply';  // fallback si nada más hizo match

export type Trigger = {
  type: TriggerType;
  keywords: string[];
  matchType: MatchType;
  caseSensitive: boolean;
  /** Solo para comment_keyword: limitar a posts concretos ([] = todos). */
  postIds: string[];
  /**
   * Respuestas públicas debajo del comentario, antes del DM. Si hay varias se
   * elige una al azar para no contestar siempre lo mismo. Admiten {{variables}}.
   */
  publicReplies?: string[];
  /** Formato anterior, de una sola respuesta. Se usa si `publicReplies` está vacío. */
  publicReply?: string | null;
};

export type Automation = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: Trigger;
  flowId: string;
  /** Menor número = se evalúa primero. */
  priority: number;
  /** No re-disparar al mismo contacto dentro de esta ventana (ms). 0 = siempre. */
  cooldownMs: number;
  /** Mandar un aviso al celular cada vez que se dispara (Ajustes › Notificaciones). */
  notificar?: boolean;
  stats: { triggered: number; lastTriggeredAt: number | null };
  createdAt: number;
  updatedAt: number;
};

// ---------------------------------------------------------------------------
// Flujos
// ---------------------------------------------------------------------------

export type NodeType =
  | 'trigger'
  | 'send_text'
  | 'send_buttons'
  | 'send_quick_replies'
  | 'send_link'
  | 'send_media'
  | 'ask_question'
  | 'follow_gate'
  | 'wait'
  | 'condition'
  | 'add_tag'
  | 'remove_tag'
  | 'set_field'
  | 'assign_human'
  | 'http_request'
  | 'end';

export type ButtonSpec =
  | { kind: 'postback'; title: string; id: string }
  | { kind: 'url'; title: string; url: string };

export type ConditionRule = {
  subject: 'text' | 'tag' | 'field' | 'follows';
  /** Nombre del tag o del campo, según subject. */
  key?: string;
  op: 'equals' | 'contains' | 'exists' | 'not_exists' | 'gt' | 'lt';
  value?: string;
};

export type FlowNodeData = {
  label?: string;
  // send_text / ask_question / follow_gate
  text?: string;
  // send_buttons / send_quick_replies
  buttons?: ButtonSpec[];
  // send_link
  /** Texto del botón. Vacío: el enlace va escrito al final del mensaje. */
  linkTitle?: string;
  linkUrl?: string;
  quickReplies?: { title: string; id: string }[];
  // send_media
  mediaType?: 'image' | 'video' | 'audio';
  mediaUrl?: string;
  // ask_question
  saveToField?: string;
  /** Cuánto esperar la respuesta antes de tomar la salida 'timeout'. */
  timeoutMs?: number;
  // follow_gate
  /** Texto del botón con el que avisan que ya siguen la cuenta. */
  buttonTitle?: string;
  /** Lo que se manda si avisaron pero todavía no siguen. */
  retryText?: string;
  /** Cuántas veces pedirlo antes de salir por 'timeout'. */
  maxAttempts?: number;
  // wait
  delayMs?: number;
  // condition
  rules?: ConditionRule[];
  matchAll?: boolean;
  // add_tag / remove_tag
  tag?: string;
  // set_field
  fieldKey?: string;
  fieldValue?: string;
  // http_request
  url?: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
};

export type FlowNode = {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: FlowNodeData;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  /**
   * Puerto de salida del nodo origen. Los nodos con ramas lo usan:
   *  - condition       -> 'true' | 'false'
   *  - send_buttons    -> id del botón
   *  - ask_question    -> 'answered' | 'timeout'
   *  - follow_gate     -> 'follows' | 'timeout'
   *  - resto           -> 'next'
   */
  sourceHandle: string;
};

export type Flow = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: number;
  updatedAt: number;
  updatedBy?: string;
};

// ---------------------------------------------------------------------------
// Ejecuciones de flujo
// ---------------------------------------------------------------------------

export type RunStatus = 'running' | 'waiting_reply' | 'sleeping' | 'done' | 'failed' | 'cancelled';

export type FlowRun = {
  id: string;
  flowId: string;
  contactId: string;
  conversationId: string;
  automationId: string | null;
  status: RunStatus;
  currentNodeId: string | null;
  /** Variables del run: respuestas capturadas, datos del contacto, etc. */
  vars: Record<string, string | number | boolean>;
  /** Para status 'sleeping': cuándo retomar. Lo lee el cron. */
  resumeAt: number | null;
  /** Para 'waiting_reply': a qué nodo volver cuando conteste. */
  waitingNodeId: string | null;
  waitingUntil: number | null;
  /**
   * El run arrancó por un comentario. El primer mensaje sale como respuesta
   * privada (`recipient.comment_id`) y Meta no deja mandar otro hasta que la
   * persona conteste.
   */
  privateReply?: { commentId: string; sent: boolean } | null;
  /** Ya se usó la respuesta privada: el nodo actual espera a que contesten. */
  waitingForWindow?: boolean;
  /** Veces que cada `follow_gate` ya pidió que sigan la cuenta. */
  followAttempts?: Record<string, number>;
  startedAt: number;
  updatedAt: number;
  finishedAt: number | null;
  error: string | null;
  /** Traza de nodos ejecutados, para depurar el flujo en la UI. */
  trace: { nodeId: string; type: NodeType; at: number; note?: string }[];
};

// ---------------------------------------------------------------------------
// Usuarios del panel
// ---------------------------------------------------------------------------

export type AppUserRole = 'owner' | 'agent';

export type AppUser = {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: AppUserRole;
  createdAt: number;
  lastSeenAt: number;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
};
