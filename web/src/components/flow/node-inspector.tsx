'use client';

import { Plus, Trash2, X } from 'lucide-react';
import type { ButtonSpec, ConditionRule, FlowNodeData, NodeType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { VariableTextarea, type VariableOption } from '@/components/ui/variable-textarea';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { NODE_META } from './node-config';
import type { ChattyNode } from './flow-node';

type Patch = Record<string, unknown>;

const DELAY_PRESETS = [
  { value: '5000', label: '5 segundos' },
  { value: '30000', label: '30 segundos' },
  { value: '300000', label: '5 minutos' },
  { value: '3600000', label: '1 hora' },
  { value: '86400000', label: '1 día' },
  { value: '259200000', label: '3 días' },
];

const SUBJECT_OPTIONS: { value: ConditionRule['subject']; label: string }[] = [
  { value: 'tag', label: 'Etiqueta' },
  { value: 'field', label: 'Campo guardado' },
  { value: 'text', label: 'Último mensaje' },
  { value: 'follows', label: 'Te sigue' },
];

const OP_OPTIONS: { value: ConditionRule['op']; label: string }[] = [
  { value: 'exists', label: 'existe' },
  { value: 'not_exists', label: 'no existe' },
  { value: 'equals', label: 'es igual a' },
  { value: 'contains', label: 'contiene' },
  { value: 'gt', label: 'es mayor que' },
  { value: 'lt', label: 'es menor que' },
];

export function NodeInspector({
  node,
  variables,
  onChange,
  onDelete,
  onClose,
}: {
  node: ChattyNode;
  /** Variables disponibles en este flujo, para el menú de «Insertar variable». */
  variables?: VariableOption[];
  onChange: (patch: Patch) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const type = (node.type ?? 'send_text') as NodeType;
  const meta = NODE_META[type];
  const data = node.data as FlowNodeData;
  const Icon = meta.icon;

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-border bg-surface">
      <header className="flex items-start gap-2.5 border-b border-border px-4 py-3.5">
        <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-accent-soft">
          <Icon className="h-4 w-4 text-accent" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-tight">{meta.label}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-muted">{meta.description}</p>
        </div>
        <button
          onClick={onClose}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-txt"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <Body type={type} data={data} variables={variables} onChange={onChange} />
      </div>

      {onDelete && (
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            className="w-full text-neg hover:bg-neg/10 hover:text-neg"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar nodo
          </Button>
        </div>
      )}
    </aside>
  );
}

function Body({
  type,
  data,
  variables,
  onChange,
}: {
  type: NodeType;
  data: FlowNodeData;
  variables?: VariableOption[];
  onChange: (patch: Patch) => void;
}) {
  switch (type) {
    case 'trigger':
      return (
        <p className="text-[13px] leading-relaxed text-muted">
          Este nodo marca dónde empieza el flujo. Conéctalo al primer paso que quieras ejecutar.
        </p>
      );

    case 'send_text':
      return (
        <Field label="Mensaje">
          <VariableTextarea
            value={data.text ?? ''}
            onChange={(text) => onChange({ text })}
            variables={variables}
            rows={5}
            placeholder="¡Hola {{first_name}}!"
          />
        </Field>
      );

    case 'send_media':
      return (
        <>
          <Field label="Tipo">
            <Select
              value={data.mediaType ?? 'image'}
              onChange={(mediaType) => onChange({ mediaType })}
              options={[
                { value: 'image', label: 'Imagen' },
                { value: 'video', label: 'Video' },
                { value: 'audio', label: 'Audio' },
              ]}
            />
          </Field>
          <Field label="URL pública" hint="debe ser https">
            <Input
              value={data.mediaUrl ?? ''}
              onChange={(e) => onChange({ mediaUrl: e.target.value })}
              placeholder="https://…/imagen.jpg"
            />
          </Field>
        </>
      );

    case 'send_buttons':
      return (
        <>
          <Field label="Mensaje">
            <VariableTextarea
              value={data.text ?? ''}
              onChange={(text) => onChange({ text })}
              variables={variables}
              rows={3}
            />
          </Field>
          <ButtonsEditor
            buttons={data.buttons ?? []}
            onChange={(buttons) => onChange({ buttons })}
          />
        </>
      );

    case 'send_link': {
      const url = data.linkUrl ?? '';
      const invalid = url.trim() !== '' && !/^https?:\/\/\S+$/i.test(url.trim()) && !url.includes('{{');
      return (
        <>
          <Field label="Mensaje">
            <VariableTextarea
              value={data.text ?? ''}
              onChange={(text) => onChange({ text })}
              variables={variables}
              rows={3}
            />
          </Field>
          <Field label="Enlace" hint={invalid ? 'tiene que empezar con https://' : 'https://…'}>
            <Input
              value={url}
              onChange={(e) => onChange({ linkUrl: e.target.value })}
              placeholder="https://tumarca.com/guias"
              inputMode="url"
            />
          </Field>
          <Field label="Texto del botón" hint="máximo 20 · vacío = enlace escrito">
            <Input
              value={data.linkTitle ?? ''}
              onChange={(e) => onChange({ linkTitle: e.target.value.slice(0, 20) })}
              placeholder="Abrir enlace"
            />
          </Field>
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-muted">
            Si el flujo arrancó por un comentario, el primer mensaje solo puede ser texto: el
            enlace se manda escrito y Instagram lo vuelve clicable.
          </p>
        </>
      );
    }

    case 'send_quick_replies':
      return (
        <>
          <Field label="Mensaje">
            <VariableTextarea
              value={data.text ?? ''}
              onChange={(text) => onChange({ text })}
              variables={variables}
              rows={3}
            />
          </Field>
          <QuickRepliesEditor
            replies={data.quickReplies ?? []}
            onChange={(quickReplies) => onChange({ quickReplies })}
          />
        </>
      );

    case 'ask_question':
      return (
        <>
          <Field label="Pregunta">
            <VariableTextarea
              value={data.text ?? ''}
              onChange={(text) => onChange({ text })}
              variables={variables}
              rows={3}
            />
          </Field>
          <Field label="Guardar respuesta en" hint="sin espacios">
            <Input
              value={data.saveToField ?? ''}
              onChange={(e) => onChange({ saveToField: e.target.value.replace(/\s/g, '_') })}
              placeholder="email"
            />
          </Field>
          <Field label="Esperar respuesta hasta">
            <Select
              value={String(data.timeoutMs ?? 86400000)}
              onChange={(v) => onChange({ timeoutMs: Number(v) })}
              options={DELAY_PRESETS}
            />
          </Field>
        </>
      );

    case 'follow_gate':
      return (
        <>
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-muted">
            Manda este mensaje con un botón y solo sigue por «Te sigue» cuando Instagram confirma
            que la persona ya sigue tu cuenta. Si el flujo arrancó por un comentario, el primer
            mensaje llega sin botón y le pide contestar con su texto.
          </p>
          <Field label="Mensaje para pedirlo">
            <VariableTextarea
              value={data.text ?? ''}
              onChange={(text) => onChange({ text })}
              variables={variables}
              rows={3}
            />
          </Field>
          <Field label="Texto del botón" hint="máximo 20">
            <Input
              value={data.buttonTitle ?? ''}
              onChange={(e) => onChange({ buttonTitle: e.target.value.slice(0, 20) })}
              placeholder="Ya te sigo"
            />
          </Field>
          <Field label="Si todavía no te sigue">
            <VariableTextarea
              value={data.retryText ?? ''}
              onChange={(retryText) => onChange({ retryText })}
              variables={variables}
              rows={3}
            />
          </Field>
          <Field label="Pedirlo como máximo">
            <Select
              value={String(data.maxAttempts ?? 3)}
              onChange={(v) => onChange({ maxAttempts: Number(v) })}
              options={[
                { value: '1', label: '1 vez' },
                { value: '2', label: '2 veces' },
                { value: '3', label: '3 veces' },
                { value: '5', label: '5 veces' },
              ]}
            />
          </Field>
          <Field label="Esperar respuesta hasta">
            <Select
              value={String(data.timeoutMs ?? 86400000)}
              onChange={(v) => onChange({ timeoutMs: Number(v) })}
              options={DELAY_PRESETS}
            />
          </Field>
        </>
      );

    case 'wait':
      return (
        <Field label="Duración" hint="menos de 5 s se ejecuta al vuelo">
          <Select
            value={String(data.delayMs ?? 5000)}
            onChange={(v) => onChange({ delayMs: Number(v) })}
            options={DELAY_PRESETS}
          />
        </Field>
      );

    case 'condition':
      return (
        <ConditionEditor
          rules={data.rules ?? []}
          matchAll={data.matchAll !== false}
          onChange={onChange}
        />
      );

    case 'add_tag':
    case 'remove_tag':
      return (
        <Field label="Etiqueta">
          <Input
            value={data.tag ?? ''}
            onChange={(e) => onChange({ tag: e.target.value })}
            placeholder="cliente-interesado"
          />
        </Field>
      );

    case 'set_field':
      return (
        <>
          <Field label="Campo">
            <Input
              value={data.fieldKey ?? ''}
              onChange={(e) => onChange({ fieldKey: e.target.value.replace(/\s/g, '_') })}
              placeholder="origen"
            />
          </Field>
          <Field label="Valor" hint="admite {{variables}}">
            <Input
              value={data.fieldValue ?? ''}
              onChange={(e) => onChange({ fieldValue: e.target.value })}
              placeholder="instagram"
            />
          </Field>
        </>
      );

    case 'assign_human':
      return (
        <p className="text-[13px] leading-relaxed text-muted">
          Pausa la automatización en esta conversación y la marca como abierta para que alguien
          del equipo la conteste desde la bandeja.
        </p>
      );

    case 'http_request':
      return (
        <>
          <Field label="URL">
            <Input
              value={data.url ?? ''}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://api.tusistema.com/leads"
            />
          </Field>
          <Field label="Método">
            <Select
              value={data.method ?? 'POST'}
              onChange={(method) => onChange({ method })}
              options={[
                { value: 'POST', label: 'POST' },
                { value: 'GET', label: 'GET' },
              ]}
            />
          </Field>
          {data.method !== 'GET' && (
            <Field label="Cuerpo (JSON)">
              <VariableTextarea
                value={data.body ?? ''}
                onChange={(body) => onChange({ body })}
                variables={variables}
                rows={5}
                className="font-mono text-[12px]"
              />
            </Field>
          )}
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-muted">
            Los campos planos de la respuesta JSON quedan disponibles como variables en los
            nodos siguientes.
          </p>
        </>
      );

    case 'end':
      return (
        <p className="text-[13px] leading-relaxed text-muted">
          El flujo termina aquí. El contacto puede volver a entrar si otra automatización coincide.
        </p>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------

function ButtonsEditor({
  buttons,
  onChange,
}: {
  buttons: ButtonSpec[];
  onChange: (b: ButtonSpec[]) => void;
}) {
  function update(i: number, patch: Partial<ButtonSpec>) {
    onChange(buttons.map((b, idx) => (idx === i ? ({ ...b, ...patch } as ButtonSpec) : b)));
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12px] font-semibold tracking-[0.4px] text-muted uppercase">
          Botones
        </span>
        <span className="text-[11px] text-faint">máximo 3</span>
      </div>

      <div className="space-y-2">
        {buttons.map((b, i) => (
          <div key={i} className="space-y-1.5 rounded-xl bg-surface-2 p-2">
            <div className="flex gap-1.5">
              <Input
                value={b.title}
                onChange={(e) => update(i, { title: e.target.value.slice(0, 20) })}
                placeholder="Texto del botón"
                className="h-8 bg-bg text-[13px]"
              />
              <button
                onClick={() => onChange(buttons.filter((_, idx) => idx !== i))}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-neg/10 hover:text-neg"
                aria-label="Quitar botón"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 px-0.5">
              <span className="text-[12px] text-muted">Abre un enlace</span>
              <Switch
                checked={b.kind === 'url'}
                onCheckedChange={(isUrl) =>
                  onChange(
                    buttons.map((btn, idx) =>
                      idx === i
                        ? isUrl
                          ? { kind: 'url', title: btn.title, url: '' }
                          : { kind: 'postback', title: btn.title, id: `op${idx + 1}` }
                        : btn,
                    ),
                  )
                }
                className="ml-auto"
              />
            </div>

            {b.kind === 'url' && (
              <Input
                value={b.url}
                onChange={(e) => update(i, { url: e.target.value } as Partial<ButtonSpec>)}
                placeholder="https://…"
                className="h-8 bg-bg text-[13px]"
              />
            )}
          </div>
        ))}
      </div>

      {buttons.length < 3 && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={() =>
            onChange([
              ...buttons,
              { kind: 'postback', title: `Opción ${buttons.length + 1}`, id: `op${Date.now().toString(36)}` },
            ])
          }
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir botón
        </Button>
      )}
    </div>
  );
}

function QuickRepliesEditor({
  replies,
  onChange,
}: {
  replies: { id: string; title: string }[];
  onChange: (r: { id: string; title: string }[]) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12px] font-semibold tracking-[0.4px] text-muted uppercase">
          Opciones
        </span>
        <span className="text-[11px] text-faint">máximo 13</span>
      </div>

      <div className="space-y-1.5">
        {replies.map((r, i) => (
          <div key={r.id} className="flex gap-1.5">
            <Input
              value={r.title}
              onChange={(e) =>
                onChange(
                  replies.map((x, idx) =>
                    idx === i ? { ...x, title: e.target.value.slice(0, 20) } : x,
                  ),
                )
              }
              className="h-8 text-[13px]"
            />
            <button
              onClick={() => onChange(replies.filter((_, idx) => idx !== i))}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-neg/10 hover:text-neg"
              aria-label="Quitar opción"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {replies.length < 13 && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={() =>
            onChange([...replies, { id: `qr${Date.now().toString(36)}`, title: 'Nueva opción' }])
          }
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir opción
        </Button>
      )}
    </div>
  );
}

function ConditionEditor({
  rules,
  matchAll,
  onChange,
}: {
  rules: ConditionRule[];
  matchAll: boolean;
  onChange: (patch: Patch) => void;
}) {
  function update(i: number, patch: Partial<ConditionRule>) {
    onChange({ rules: rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  }

  return (
    <div className="space-y-3">
      {rules.length > 1 && (
        <Select
          value={matchAll ? 'all' : 'any'}
          onChange={(v) => onChange({ matchAll: v === 'all' })}
          options={[
            { value: 'all', label: 'Se deben cumplir todas' },
            { value: 'any', label: 'Basta con una' },
          ]}
        />
      )}

      {rules.map((rule, i) => (
        <div key={i} className="space-y-1.5 rounded-xl bg-surface-2 p-2">
          <div className="flex gap-1.5">
            <Select
              value={rule.subject}
              onChange={(subject) => update(i, { subject })}
              options={SUBJECT_OPTIONS}
              className="flex-1"
            />
            <button
              onClick={() => onChange({ rules: rules.filter((_, idx) => idx !== i) })}
              className="grid h-10 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-neg/10 hover:text-neg"
              aria-label="Quitar regla"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {(rule.subject === 'tag' || rule.subject === 'field') && (
            <Input
              value={rule.key ?? ''}
              onChange={(e) => update(i, { key: e.target.value })}
              placeholder={rule.subject === 'tag' ? 'nombre de la etiqueta' : 'nombre del campo'}
              className="h-9 bg-bg text-[13px]"
            />
          )}

          {rule.subject !== 'follows' && rule.subject !== 'tag' && (
            <Select
              value={rule.op}
              onChange={(op) => update(i, { op })}
              options={OP_OPTIONS}
            />
          )}

          {!['exists', 'not_exists'].includes(rule.op) && rule.subject !== 'follows' && (
            <Input
              value={rule.value ?? ''}
              onChange={(e) => update(i, { value: e.target.value })}
              placeholder="valor a comparar"
              className="h-9 bg-bg text-[13px]"
            />
          )}

          {(rule.subject === 'tag' || rule.subject === 'follows') && (
            <Select
              value={rule.op === 'not_exists' ? 'not_exists' : 'exists'}
              onChange={(op) => update(i, { op })}
              options={[
                { value: 'exists', label: rule.subject === 'follows' ? 'Sí te sigue' : 'La tiene' },
                { value: 'not_exists', label: rule.subject === 'follows' ? 'No te sigue' : 'No la tiene' },
              ]}
            />
          )}
        </div>
      ))}

      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={() => onChange({ rules: [...rules, { subject: 'tag', key: '', op: 'exists' }] })}
      >
        <Plus className="h-3.5 w-3.5" />
        Añadir regla
      </Button>
    </div>
  );
}
