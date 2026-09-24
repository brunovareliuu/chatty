import 'server-only';

import type Anthropic from '@anthropic-ai/sdk';
import { accountRef } from '../accounts';
import { adminDb } from '../firebase-admin';
import type { AssistantCard, ChatSummary, ViewMessage } from './eventos';

/**
 * Conversaciones del asistente.
 *
 *   accounts/{accountId}/assistantChats/{chatId}
 *     /messages/{000001}   un mensaje de la API de Claude por documento
 *
 * El contenido se guarda como JSON en texto, idéntico a como lo devolvió
 * Claude: los bloques de pensamiento llevan firma y hay que reenviarlos sin
 * tocar. Solo el servidor lee y escribe aquí (las reglas niegan todo lo que no
 * está declarado), así que la pantalla pide el historial por la API.
 */

type ContentBlock = Anthropic.Beta.BetaContentBlockParam;

export type StoredCard = { toolUseId: string; card: AssistantCard };

export type StoredMessage = {
  role: 'user' | 'assistant';
  content: ContentBlock[];
  /** Tarjetas de las herramientas cuyo resultado va en este mensaje. */
  cards: StoredCard[];
  createdAt: number;
};

const chatsCol = (accountId: string) => accountRef(accountId).collection('assistantChats');
const messagesCol = (accountId: string, chatId: string) =>
  chatsCol(accountId).doc(chatId).collection('messages');

const messageId = (index: number) => String(index).padStart(6, '0');

export async function createChat(accountId: string, uid: string, title: string): Promise<string> {
  const now = Date.now();
  const ref = chatsCol(accountId).doc();
  await ref.set({ title, createdBy: uid, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function listChats(accountId: string): Promise<ChatSummary[]> {
  const snap = await chatsCol(accountId).orderBy('updatedAt', 'desc').limit(50).get();
  return snap.docs.map((d) => ({
    id: d.id,
    title: String(d.get('title') ?? 'Conversación'),
    updatedAt: Number(d.get('updatedAt') ?? 0),
  }));
}

/** Mensajes en orden. `null` si la conversación no existe. */
export async function loadMessages(accountId: string, chatId: string): Promise<StoredMessage[] | null> {
  const chat = await chatsCol(accountId).doc(chatId).get();
  if (!chat.exists) return null;

  const snap = await messagesCol(accountId, chatId).orderBy('index', 'asc').get();
  return snap.docs.map((d) => ({
    role: d.get('role') === 'assistant' ? 'assistant' : 'user',
    content: JSON.parse(String(d.get('content') ?? '[]')) as ContentBlock[],
    cards: (d.get('cards') as StoredCard[] | undefined) ?? [],
    createdAt: Number(d.get('createdAt') ?? 0),
  }));
}

export async function appendMessage(
  accountId: string,
  chatId: string,
  index: number,
  message: StoredMessage,
): Promise<void> {
  const batch = adminDb.batch();
  batch.set(messagesCol(accountId, chatId).doc(messageId(index)), {
    index,
    role: message.role,
    content: JSON.stringify(message.content),
    cards: message.cards,
    createdAt: message.createdAt,
  });
  batch.update(chatsCol(accountId).doc(chatId), { updatedAt: message.createdAt });
  await batch.commit();
}

export async function deleteChat(accountId: string, chatId: string): Promise<void> {
  await adminDb.recursiveDelete(chatsCol(accountId).doc(chatId));
}

/**
 * Si una respuesta se cortó después de pedir herramientas y antes de guardar
 * sus resultados, la API rechazaría el historial. Aquí se completan esos
 * huecos con un resultado de error.
 */
export function repairHistory(messages: StoredMessage[]): StoredMessage[] {
  const repaired: StoredMessage[] = [];
  messages.forEach((message, i) => {
    repaired.push(message);
    if (message.role !== 'assistant') return;

    const pending = message.content.flatMap((b) => (b.type === 'tool_use' ? [b.id] : []));
    if (pending.length === 0) return;

    const next = messages[i + 1];
    const answered = new Set(
      next?.role === 'user'
        ? next.content.flatMap((b) => (b.type === 'tool_result' ? [b.tool_use_id] : []))
        : [],
    );
    const missing = pending.filter((id) => !answered.has(id));
    if (missing.length === 0) return;

    const results: ContentBlock[] = missing.map((id) => ({
      type: 'tool_result',
      tool_use_id: id,
      is_error: true,
      content: 'La respuesta se interrumpió antes de terminar esta herramienta.',
    }));

    if (next?.role === 'user' && answered.size > 0) {
      next.content = [...next.content, ...results];
    } else {
      repaired.push({ role: 'user', content: results, cards: [], createdAt: message.createdAt });
    }
  });
  return repaired;
}

/** Del formato de la API al que pinta la pantalla. */
export function toViewMessages(messages: StoredMessage[]): ViewMessage[] {
  const view: ViewMessage[] = [];

  messages.forEach((message, index) => {
    const toolResults = message.content.flatMap((b) => (b.type === 'tool_result' ? [b] : []));

    if (message.role === 'user' && toolResults.length === 0) {
      const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n');
      if (text.trim()) view.push({ id: `m${index}`, role: 'user', text });
      return;
    }

    // Un turno del asistente puede ocupar varios mensajes de la API (pide
    // herramientas, recibe resultados, sigue): en pantalla es uno solo.
    const last = view[view.length - 1];
    const turn = last?.role === 'assistant' ? last : { id: `m${index}`, role: 'assistant' as const, blocks: [] };
    if (turn !== last) view.push(turn);

    if (message.role === 'user') {
      for (const result of toolResults) {
        const tool = turn.blocks.find((b) => b.type === 'tool' && b.id === result.tool_use_id);
        if (tool?.type === 'tool') tool.status = result.is_error ? 'error' : 'done';
        for (const stored of message.cards) {
          if (stored.toolUseId === result.tool_use_id) turn.blocks.push({ type: 'card', card: stored.card });
        }
      }
      return;
    }

    for (const block of message.content) {
      if (block.type === 'text' && block.text.trim()) turn.blocks.push({ type: 'text', text: block.text });
      if (block.type === 'tool_use') turn.blocks.push({ type: 'tool', id: block.id, name: block.name, status: 'working' });
    }
  });

  return view;
}
