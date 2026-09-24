'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, BellRing, Copy, Loader2, Pencil, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/lib/client/accounts-context';
import { useDoc } from '@/lib/client/firestore-hooks';
import { duplicateAutomation, setAutomationEnabled, updateAutomation } from '@/lib/client/mutations';
import type { Automation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Empty } from '@/components/ui/empty';
import { Switch } from '@/components/ui/switch';
import { FlowBuilder } from '@/components/flow/flow-builder';
import { AutomationDialog } from './automation-dialog';
import { TRIGGER_LABELS, triggerSummary } from './trigger-meta';

/**
 * Una automatización es su disparador y su conversación juntos: el cuándo en la
 * cabecera, el qué en el lienzo. Antes vivían en dos pantallas y se editaban por
 * separado, que es de donde salía la confusión.
 */
export function AutomationEditor({ automationId }: { automationId: string }) {
  const router = useRouter();
  const { account, loading: loadingAccount } = useAccounts();
  const { data: automation, loading } = useDoc<Automation>(
    account ? `accounts/${account.id}/automations/${automationId}` : null,
  );
  const [editingTrigger, setEditingTrigger] = useState(false);
  const [cloning, setCloning] = useState(false);

  if (loadingAccount || loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (!account) {
    return <Empty icon={Zap} title="Conecta una cuenta para editar automatizaciones" />;
  }

  if (!automation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-[15px] font-semibold">Esta automatización ya no existe</p>
        <Link href="/automations" className="text-[14px] text-accent hover:underline">
          Volver a automatizaciones
        </Link>
      </div>
    );
  }

  const Icon = TRIGGER_LABELS[automation.trigger.type].icon;

  async function toggle(enabled: boolean) {
    await setAutomationEnabled(account!.id, automation!.id, automation!.flowId, enabled);
    toast.success(enabled ? 'Automatización activada' : 'Automatización pausada');
  }

  // «Avisarme»: un push al celular cada vez que esta regla se dispara.
  async function toggleAviso() {
    const notificar = !automation!.notificar;
    await updateAutomation(account!.id, automation!.id, { notificar });
    toast.success(notificar ? 'Te avisamos al celular cuando se dispare' : 'Ya no te avisamos de esta');
  }

  async function handleClonar() {
    if (!account || !automation) return;
    setCloning(true);
    try {
      const newId = await duplicateAutomation(account.id, automation);
      toast.success(`«${automation.name}» clonada con éxito (creada pausada)`, {
        action: {
          label: 'Abrir copia',
          onClick: () => router.push(`/automations/${newId}`),
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al duplicar automatización');
    } finally {
      setCloning(false);
    }
  }

  return (
    <>
      <FlowBuilder
        accountId={account.id}
        flowId={automation.flowId}
        backHref="/automations"
        hideEnabled
        headerExtra={
          <>
            <button
              onClick={() => setEditingTrigger(true)}
              className="group flex min-w-0 items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] text-muted transition-colors hover:border-accent/40 hover:text-txt"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />
              <span className="truncate">{triggerSummary(automation.trigger, 3)}</span>
              <Pencil className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>

            <button
              onClick={handleClonar}
              disabled={cloning}
              className="ml-auto flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-muted transition hover:border-accent/40 hover:text-txt disabled:opacity-50"
              title="Clonar esta automatización y su flujo"
            >
              {cloning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Clonar</span>
            </button>

            <button
              onClick={toggleAviso}
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors',
                automation.notificar
                  ? 'border-accent/40 bg-accent-soft text-accent'
                  : 'border-border bg-surface text-muted hover:text-txt',
              )}
              aria-pressed={Boolean(automation.notificar)}
              aria-label="Avisarme al celular cuando se dispare"
              title={automation.notificar ? 'Te avisa al celular cuando se dispara' : 'Avisarme al celular cuando se dispare'}
            >
              {automation.notificar ? (
                <BellRing className="h-4 w-4" strokeWidth={2.2} />
              ) : (
                <Bell className="h-4 w-4" strokeWidth={1.9} />
              )}
            </button>

            <label className="flex shrink-0 items-center gap-2 text-[13px] font-medium text-muted">
              Activa
              <Switch checked={automation.enabled} onCheckedChange={toggle} />
            </label>
          </>
        }
      />

      {editingTrigger && (
        <AutomationDialog
          accountId={account.id}
          automation={automation}
          nextPriority={automation.priority}
          onClose={() => setEditingTrigger(false)}
        />
      )}
    </>
  );
}
