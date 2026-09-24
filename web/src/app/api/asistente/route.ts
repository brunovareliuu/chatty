import { NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { getAccount } from '@/lib/accounts';
import { getCurrentUser } from '@/lib/session';
import { claude, CLAUDE_BETAS, CLAUDE_MODEL, describeClaudeError } from '@/lib/asistente/claude';
import {
  appendMessage,
  createChat,
  loadMessages,
  repairHistory,
  type StoredCard,
  type StoredMessage,
} from '@/lib/asistente/historial';
import { runTool, TOOLS } from '@/lib/asistente/herramientas';
import { systemPrompt } from '@/lib/asistente/instrucciones';
import type { AssistantEvent } from '@/lib/asistente/eventos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Vueltas de herramienta por mensaje: de sobra para crear varias piezas seguidas. */
const MAX_TURNS = 12;
const MAX_MESSAGE_CHARS = 8000;

type ContentBlock = Anthropic.Beta.BetaContentBlock;
type ContentBlockParam = Anthropic.Beta.BetaContentBlockParam;

/**
 * Lo que se guarda y se reenvía de una respuesta. Si Anthropic cambió de
 * modelo a mitad de la respuesta (rechazo del filtro de seguridad), lo que
 * quedó antes del cambio solo se reenvía como texto: así lo pide la API.
 */
function replayable(content: ContentBlock[]): ContentBlockParam[] {
  const boundary = content.map((b) => b.type).lastIndexOf('fallback');
  return content.filter(
    (block, i) => block.type !== 'fallback' && (i > boundary || block.type === 'text'),
  ) as ContentBlockParam[];
}

type Body = { accountId?: string; chatId?: string | null; message?: string };

/**
 * Un mensaje del dueño al asistente. Responde en streaming (una línea JSON por
 * evento) mientras Claude escribe y usa herramientas, y va guardando la
 * conversación para poder retomarla.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  const userText = body?.message?.trim() ?? '';
  if (!body?.accountId || !userText) {
    return NextResponse.json({ error: 'Falta el mensaje o la cuenta' }, { status: 400 });
  }
  if (userText.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: 'El mensaje es demasiado largo' }, { status: 400 });
  }

  const account = await getAccount(body.accountId);
  if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });

  try {
    claude();
  } catch (err) {
    return NextResponse.json({ error: describeClaudeError(err) }, { status: 503 });
  }

  let history: StoredMessage[] = [];
  let persistedCount = 0;
  if (body.chatId) {
    const loaded = await loadMessages(account.id, body.chatId);
    if (!loaded) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    history = repairHistory(loaded);
    persistedCount = loaded.length;
  }

  const abort = new AbortController();
  req.signal.addEventListener('abort', () => abort.abort());
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AssistantEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // El navegador ya cerró la conexión.
        }
      };

      try {
        let chatId = body.chatId ?? null;
        if (!chatId) {
          const title = userText.replace(/\s+/g, ' ').slice(0, 60);
          chatId = await createChat(account.id, user.uid, title);
          send({ type: 'chat', chatId, title });
        }

        const messages = [...history];
        const persist = async (message: StoredMessage) => {
          await appendMessage(account.id, chatId, persistedCount, message);
          persistedCount += 1;
          messages.push(message);
        };

        await persist({ role: 'user', content: [{ type: 'text', text: userText }], cards: [], createdAt: Date.now() });

        for (let turn = 0; turn < MAX_TURNS && !abort.signal.aborted; turn++) {
          const response = claude().beta.messages.stream(
            {
              model: CLAUDE_MODEL,
              max_tokens: 64000,
              betas: CLAUDE_BETAS,
              fallbacks: 'default',
              thinking: { type: 'adaptive', display: 'omitted' },
              cache_control: { type: 'ephemeral' },
              system: systemPrompt(account),
              tools: TOOLS,
              messages: messages.map((m) => ({ role: m.role, content: m.content })),
            },
            { signal: abort.signal },
          );

          response.on('streamEvent', (event) => {
            if (event.type !== 'content_block_start') return;
            if (event.content_block.type === 'thinking') send({ type: 'thinking' });
            if (event.content_block.type === 'tool_use') {
              send({ type: 'tool', id: event.content_block.id, name: event.content_block.name, status: 'working' });
            }
          });
          response.on('text', (delta) => send({ type: 'text', text: delta }));

          const final = await response.finalMessage();

          if (final.stop_reason === 'refusal') {
            // Lo que alcanzó a salir no se guarda: la API pide descartarlo.
            send({ type: 'error', message: 'Claude no puede ayudar con esto. Prueba pedirlo de otra forma.' });
            break;
          }

          let content = replayable(final.content);
          if (final.stop_reason === 'max_tokens') {
            // Una herramienta a medio escribir no se puede ejecutar ni reenviar.
            content = content.filter((b) => b.type !== 'tool_use');
          }
          if (content.length) {
            await persist({ role: 'assistant', content, cards: [], createdAt: Date.now() });
          }

          const toolUses = content.flatMap((b) => (b.type === 'tool_use' ? [b] : []));
          if (final.stop_reason === 'max_tokens') {
            send({ type: 'error', message: 'La respuesta salió demasiado larga y se cortó. Pide menos a la vez.' });
            break;
          }
          if (final.stop_reason !== 'tool_use' || toolUses.length === 0) break;

          const cards: StoredCard[] = [];
          const results = await Promise.all(
            toolUses.map(async (use): Promise<ContentBlockParam> => {
              const outcome = await runTool(use.name, use.input, { account });
              send({
                type: 'tool',
                id: use.id,
                name: use.name,
                status: outcome.isError ? 'error' : 'done',
                detail: outcome.detail,
              });
              if (outcome.card) {
                cards.push({ toolUseId: use.id, card: outcome.card });
                send({ type: 'card', toolId: use.id, card: outcome.card });
              }
              return {
                type: 'tool_result',
                tool_use_id: use.id,
                content: outcome.content,
                ...(outcome.isError ? { is_error: true } : {}),
              };
            }),
          );

          await persist({ role: 'user', content: results, cards, createdAt: Date.now() });
        }

        send({ type: 'done' });
      } catch (err) {
        if (!abort.signal.aborted) {
          console.error('[asistente]', err);
          send({ type: 'error', message: describeClaudeError(err) });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // ya estaba cerrado
        }
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
