import type { Automation, MatchType, Trigger, TriggerType } from '../types';

/** Quita acentos y baja a minúsculas: "Informacion" ≈ "información". */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function matchesKeyword(
  text: string,
  keyword: string,
  matchType: MatchType,
  caseSensitive: boolean,
): boolean {
  if (matchType === 'any') return true;

  const haystack = caseSensitive ? text.trim() : normalize(text);
  const needle = caseSensitive ? keyword.trim() : normalize(keyword);
  if (!needle) return false;

  switch (matchType) {
    case 'exact':
      return haystack === needle;
    case 'starts_with':
      return haystack.startsWith(needle);
    case 'contains':
      // \b no funciona con acentos ni emoji; comparamos por tokens.
      if (/^[\w\s]+$/.test(needle)) {
        const words = haystack.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
        const needleWords = needle.split(/\s+/);
        if (needleWords.length === 1) return words.includes(needle);
      }
      return haystack.includes(needle);
    case 'regex':
      try {
        return new RegExp(keyword, caseSensitive ? '' : 'i').test(text);
      } catch {
        return false; // regex inválida escrita por el usuario: no truena el webhook
      }
    default:
      return false;
  }
}

export type MatchContext = {
  text: string;
  triggerType: TriggerType;
  /** Para comment_keyword: en qué post ocurrió. */
  postId?: string;
  isFirstMessage: boolean;
  /** Última vez que cada automatización se disparó a este contacto. */
  lastTriggeredByAutomation: Record<string, number>;
};

/**
 * Elige qué automatización responde. Prioridad ascendente; `default_reply`
 * solo entra si ninguna otra hizo match.
 */
export function selectAutomation(
  automations: Automation[],
  ctx: MatchContext,
): Automation | null {
  const now = Date.now();

  const candidates = automations
    .filter((a) => a.enabled)
    .filter((a) => a.trigger.type === ctx.triggerType)
    .sort((a, b) => a.priority - b.priority);

  const eligible = (a: Automation): boolean => {
    if (a.cooldownMs > 0) {
      const last = ctx.lastTriggeredByAutomation[a.id];
      if (last && now - last < a.cooldownMs) return false;
    }
    if (a.trigger.type === 'comment_keyword' && a.trigger.postIds.length > 0) {
      if (!ctx.postId || !a.trigger.postIds.includes(ctx.postId)) return false;
    }
    return true;
  };

  for (const automation of candidates) {
    if (!eligible(automation)) continue;

    const { keywords, matchType, caseSensitive } = automation.trigger;

    if (automation.trigger.type === 'first_message') {
      if (ctx.isFirstMessage) return automation;
      continue;
    }

    if (matchType === 'any' || keywords.length === 0) return automation;

    if (keywords.some((k) => matchesKeyword(ctx.text, k, matchType, caseSensitive))) {
      return automation;
    }
  }

  // Fallback: solo cuando el disparador buscado era un DM y nada coincidió.
  if (ctx.triggerType === 'dm_keyword') {
    const fallback = automations
      .filter((a) => a.enabled && a.trigger.type === 'default_reply')
      .sort((a, b) => a.priority - b.priority)
      .find(eligible);
    return fallback ?? null;
  }

  return null;
}

/**
 * Qué contestar en público debajo de un comentario. Con varias respuestas se
 * elige una al azar: la misma frase repetida en cada comentario se ve a bot.
 */
export function pickPublicReply(
  trigger: Pick<Trigger, 'publicReplies' | 'publicReply'>,
  random: () => number = Math.random,
): string | null {
  const options = (trigger.publicReplies ?? []).map((r) => r.trim()).filter(Boolean);
  if (options.length === 0) return trigger.publicReply?.trim() || null;
  return options[Math.min(options.length - 1, Math.floor(random() * options.length))];
}

/** Compara textos de botón ignorando acentos, mayúsculas, emoji y signos. */
function comparable(text: string): string {
  return normalize(text)
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Si alguien escribe el texto de un botón en vez de tocarlo, cuenta como si lo
 * hubiera tocado. Pasa con la respuesta privada a un comentario, que llega
 * sin botones y le pide a la persona escribir la opción.
 */
export function matchOptionByText(
  options: { id: string; title: string }[],
  text: string,
): string | null {
  const wanted = comparable(text);
  if (!wanted) return null;
  return options.find((o) => comparable(o.title) === wanted)?.id ?? null;
}
