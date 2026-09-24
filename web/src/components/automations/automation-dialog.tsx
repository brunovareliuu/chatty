'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Automation, MatchType, Trigger, TriggerType } from '@/lib/types';
import { createAutomation, emptyTrigger, updateAutomation } from '@/lib/client/mutations';
import { FOLLOW_GATE_DEFAULTS } from '@/lib/engine/starter-flow';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { VariableTextarea } from '@/components/ui/variable-textarea';
import { Select } from '@/components/ui/select';
import { TagInput } from '@/components/ui/tag-input';
import { Switch } from '@/components/ui/switch';
import { PostPicker } from './post-picker';

const TRIGGER_OPTIONS: { value: TriggerType; label: string }[] = [
  { value: 'dm_keyword', label: 'Alguien escribe una palabra clave por DM' },
  { value: 'comment_keyword', label: 'Alguien comenta una palabra clave en una publicación' },
  { value: 'story_reply', label: 'Alguien responde a una historia' },
  { value: 'first_message', label: 'Alguien escribe por primera vez' },
  { value: 'default_reply', label: 'Nada más coincidió (respuesta por defecto)' },
];

const MATCH_OPTIONS: { value: MatchType; label: string }[] = [
  { value: 'contains', label: 'Contiene la palabra' },
  { value: 'exact', label: 'Es exactamente el mensaje' },
  { value: 'starts_with', label: 'Empieza con' },
  { value: 'regex', label: 'Expresión regular' },
  { value: 'any', label: 'Cualquier mensaje' },
];

const COOLDOWN_OPTIONS = [
  { value: '0', label: 'Siempre que coincida' },
  { value: String(60 * 60 * 1000), label: 'Máximo una vez por hora' },
  { value: String(24 * 60 * 60 * 1000), label: 'Máximo una vez al día' },
  { value: String(7 * 24 * 60 * 60 * 1000), label: 'Máximo una vez por semana' },
];

const MAX_PUBLIC_REPLIES = 10;

/** Las automatizaciones anteriores guardaban una sola respuesta pública. */
function withReplyList(trigger: Trigger): Trigger {
  if (trigger.publicReplies?.length) return trigger;
  return { ...trigger, publicReplies: trigger.publicReply ? [trigger.publicReply] : [] };
}

export function AutomationDialog({
  accountId,
  automation,
  nextPriority,
  onClose,
  onCreated,
}: {
  accountId: string;
  automation: Automation | null;
  nextPriority: number;
  onClose: () => void;
  /** Al crearla se abre su editor: el resto se arma en el lienzo. */
  onCreated?: (automationId: string) => void;
}) {
  const isNew = !automation;

  const [name, setName] = useState(automation?.name ?? '');
  const [trigger, setTrigger] = useState<Trigger>(() =>
    withReplyList(automation?.trigger ?? emptyTrigger()),
  );
  const [firstMessage, setFirstMessage] = useState(
    '¡Hola {{first_name}}! 👋 Gracias por escribir, ahora te comparto la información.',
  );
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [askFollow, setAskFollow] = useState(false);
  const [followText, setFollowText] = useState<string>(FOLLOW_GATE_DEFAULTS.text);
  const [followButton, setFollowButton] = useState<string>(FOLLOW_GATE_DEFAULTS.buttonTitle);
  const [cooldownMs, setCooldownMs] = useState(automation?.cooldownMs ?? 0);
  const [notificar, setNotificar] = useState(automation?.notificar ?? false);
  const [saving, setSaving] = useState(false);

  const needsKeywords = trigger.type !== 'first_message' && trigger.type !== 'default_reply';
  const isComment = trigger.type === 'comment_keyword';

  function patchTrigger(patch: Partial<Trigger>) {
    setTrigger((t) => ({ ...t, ...patch }));
  }

  async function save() {
    if (!name.trim()) {
      toast.error('Ponle un nombre a la automatización');
      return;
    }
    if (needsKeywords && trigger.matchType !== 'any' && trigger.keywords.length === 0) {
      toast.error('Agrega al menos una palabra clave');
      return;
    }
    const url = linkUrl.trim();
    if (isNew && url && !/^https?:\/\/\S+$/i.test(url)) {
      toast.error('El enlace tiene que empezar con https://');
      return;
    }

    const cleanTrigger: Trigger = {
      ...trigger,
      publicReplies: (trigger.publicReplies ?? []).map((r) => r.trim()).filter(Boolean),
      publicReply: null,
    };

    setSaving(true);
    try {
      if (isNew) {
        const id = await createAutomation(accountId, {
          name: name.trim(),
          trigger: cleanTrigger,
          priority: nextPriority,
          starter: {
            message: firstMessage,
            link: url ? { title: linkTitle.trim() || 'Ver enlace', url } : null,
            followGate: askFollow ? { text: followText, buttonTitle: followButton } : null,
          },
          notificar,
        });
        toast.success('Automatización creada');
        onCreated?.(id);
      } else {
        await updateAutomation(accountId, automation.id, {
          name: name.trim(),
          trigger: cleanTrigger,
          cooldownMs,
          notificar,
        });
        toast.success('Cambios guardados');
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? 'Nueva automatización' : 'Cuándo se dispara'}
      description={
        isNew
          ? 'Define cuándo se dispara y qué contesta. El resto de la conversación se arma en el lienzo.'
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            {isNew ? 'Crear' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Al editar, el nombre se cambia en la cabecera del lienzo: aquí sería el segundo campo para lo mismo. */}
        {isNew && (
          <Field label="Nombre">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Lista de precios"
              autoFocus
            />
          </Field>
        )}

        <Field label="Cuándo se dispara">
          <Select
            value={trigger.type}
            onChange={(type) => patchTrigger({ type })}
            options={TRIGGER_OPTIONS}
          />
        </Field>

        {needsKeywords && (
          <>
            <Field label="Coincidencia">
              <Select
                value={trigger.matchType}
                onChange={(matchType) => patchTrigger({ matchType })}
                options={MATCH_OPTIONS}
              />
            </Field>

            {trigger.matchType !== 'any' && (
              <Field
                label="Palabras clave"
                hint={trigger.matchType === 'regex' ? 'una expresión por entrada' : 'ignora acentos y mayúsculas'}
              >
                <TagInput
                  values={trigger.keywords}
                  onChange={(keywords) => patchTrigger({ keywords })}
                  placeholder="precio, costo, cuánto cuesta…"
                />
              </Field>
            )}
          </>
        )}

        {isComment && (
          <>
            <Field label="Publicaciones" hint="sin elegir ninguna, aplica a todas">
              <PostPicker
                accountId={accountId}
                values={trigger.postIds}
                onChange={(postIds) => patchTrigger({ postIds })}
              />
            </Field>

            <Field label="Responder también en público" hint="opcional · con varias, sale una al azar">
              <PublicRepliesEditor
                replies={trigger.publicReplies ?? []}
                onChange={(publicReplies) => patchTrigger({ publicReplies })}
              />
            </Field>
          </>
        )}

        {isNew && (
          <>
            <Field label="Primer mensaje" hint="luego lo editas en el lienzo">
              <VariableTextarea value={firstMessage} onChange={setFirstMessage} rows={3} />
            </Field>

            <Field label="Botón con enlace" hint="opcional">
              <div className="flex gap-1.5">
                <Input
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value.slice(0, 20))}
                  placeholder="Ver la guía"
                  className="w-[38%] shrink-0"
                />
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://…"
                  inputMode="url"
                />
              </div>
            </Field>

            <div className="space-y-3 rounded-xl bg-surface px-3 py-2.5">
              <label className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-[13px] font-medium">Pedir que te siga antes</span>
                  <span className="block text-[12px] leading-snug text-muted">
                    El mensaje solo llega cuando Instagram confirma que ya te sigue.
                  </span>
                </span>
                <Switch checked={askFollow} onCheckedChange={setAskFollow} />
              </label>

              {askFollow && (
                <>
                  <Field label="Mensaje para pedirlo">
                    <VariableTextarea value={followText} onChange={setFollowText} rows={2} />
                  </Field>
                  <Field label="Texto del botón" hint="máximo 20">
                    <Input
                      value={followButton}
                      onChange={(e) => setFollowButton(e.target.value.slice(0, 20))}
                      placeholder="Ya te sigo"
                    />
                  </Field>
                </>
              )}
            </div>
          </>
        )}

        {!isNew && (
          <Field label="Frecuencia por contacto">
            <Select
              value={String(cooldownMs)}
              onChange={(v) => setCooldownMs(Number(v))}
              options={COOLDOWN_OPTIONS}
            />
          </Field>
        )}

        <label className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2.5">
          <span className="min-w-0">
            <span className="block text-[13px] font-medium">Avisarme al celular cuando se dispare</span>
            <span className="block text-[12px] leading-snug text-muted">
              Un aviso con quién escribió o comentó y qué dijo. Se activa en Ajustes › Notificaciones.
            </span>
          </span>
          <Switch checked={notificar} onCheckedChange={setNotificar} />
        </label>

        {trigger.matchType !== 'regex' && trigger.matchType !== 'any' && needsKeywords && (
          <label className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
            <span className="text-[13px] font-medium">Distinguir mayúsculas y acentos</span>
            <Switch
              checked={trigger.caseSensitive}
              onCheckedChange={(caseSensitive) => patchTrigger({ caseSensitive })}
            />
          </label>
        )}
      </div>
    </Dialog>
  );
}

function PublicRepliesEditor({
  replies,
  onChange,
}: {
  replies: string[];
  onChange: (replies: string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      {replies.map((reply, i) => (
        <div key={i} className="flex gap-1.5">
          <Input
            value={reply}
            onChange={(e) => onChange(replies.map((r, idx) => (idx === i ? e.target.value : r)))}
            placeholder={i === 0 ? '¡Te acabo de mandar DM! 📩' : 'Otra forma de decirlo'}
          />
          <button
            type="button"
            onClick={() => onChange(replies.filter((_, idx) => idx !== i))}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-neg/10 hover:text-neg"
            aria-label="Quitar respuesta"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {replies.length < MAX_PUBLIC_REPLIES && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => onChange([...replies, ''])}
        >
          <Plus className="h-3.5 w-3.5" />
          {replies.length === 0 ? 'Agregar respuesta pública' : 'Agregar otra respuesta'}
        </Button>
      )}
    </div>
  );
}
