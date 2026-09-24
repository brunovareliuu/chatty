'use client';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { buildStarterFlow, type StarterFlowOptions } from '@/lib/engine/starter-flow';
import type { Automation, Flow, Trigger, TriggerType } from '@/lib/types';

const path = (accountId: string, sub: string) => `accounts/${accountId}/${sub}`;

// ---------------------------------------------------------------------------
// Flujos
// ---------------------------------------------------------------------------

export async function createFlow(
  accountId: string,
  name: string,
  starter: StarterFlowOptions = { message: '¡Hola {{first_name}}! 👋' },
): Promise<string> {
  const { nodes, edges } = buildStarterFlow(starter);
  const now = Date.now();
  const ref = await addDoc(collection(db, path(accountId, 'flows')), {
    name,
    enabled: true,
    nodes,
    edges,
    createdAt: now,
    updatedAt: now,
  } satisfies Omit<Flow, 'id'>);
  return ref.id;
}

export async function saveFlow(
  accountId: string,
  flowId: string,
  patch: Partial<Omit<Flow, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, path(accountId, 'flows'), flowId), {
    ...patch,
    updatedAt: Date.now(),
  } as DocumentData);
}

export async function deleteFlow(accountId: string, flowId: string): Promise<void> {
  await deleteDoc(doc(db, path(accountId, 'flows'), flowId));
}

export async function duplicateFlow(accountId: string, flow: Flow): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(db, path(accountId, 'flows')), {
    name: `${flow.name} (copia)`,
    description: flow.description ?? '',
    enabled: false,
    nodes: flow.nodes,
    edges: flow.edges,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

// ---------------------------------------------------------------------------
// Automatizaciones
// ---------------------------------------------------------------------------

export const emptyTrigger = (type: TriggerType = 'dm_keyword'): Trigger => ({
  type,
  keywords: [],
  matchType: 'contains',
  caseSensitive: false,
  postIds: [],
  publicReplies: [],
  publicReply: null,
});

export async function createAutomation(
  accountId: string,
  params: { name: string; trigger: Trigger; starter: StarterFlowOptions; priority: number; notificar?: boolean },
): Promise<string> {
  const flowId = await createFlow(accountId, params.name, params.starter);
  const now = Date.now();

  const ref = await addDoc(collection(db, path(accountId, 'automations')), {
    name: params.name,
    enabled: true,
    trigger: params.trigger,
    flowId,
    priority: params.priority,
    cooldownMs: 0,
    notificar: params.notificar ?? false,
    stats: { triggered: 0, lastTriggeredAt: null },
    createdAt: now,
    updatedAt: now,
  } satisfies Omit<Automation, 'id'>);

  return ref.id;
}

export async function updateAutomation(
  accountId: string,
  automationId: string,
  patch: Partial<Omit<Automation, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, path(accountId, 'automations'), automationId), {
    ...patch,
    updatedAt: Date.now(),
  } as DocumentData);
}

/**
 * Una automatización y su flujo son la misma cosa para quien la usa: el
 * interruptor apaga los dos a la vez. Si solo se apagara la automatización, el
 * flujo seguiría marcado como activo; si solo se apagara el flujo, la regla se
 * vería encendida sin contestar nada.
 */
export async function setAutomationEnabled(
  accountId: string,
  automationId: string,
  flowId: string | null,
  enabled: boolean,
): Promise<void> {
  const now = Date.now();
  const batch = writeBatch(db);
  batch.update(doc(db, path(accountId, 'automations'), automationId), { enabled, updatedAt: now });
  if (flowId) {
    batch.update(doc(db, path(accountId, 'flows'), flowId), { enabled, updatedAt: now });
  }
  await batch.commit();
}

/**
 * Borra la automatización y, con ella, su flujo. `flowId` llega en null cuando
 * otra automatización comparte ese flujo: entonces solo se va la regla.
 */
export async function deleteAutomation(
  accountId: string,
  automationId: string,
  flowId: string | null = null,
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, path(accountId, 'automations'), automationId));
  if (flowId) batch.delete(doc(db, path(accountId, 'flows'), flowId));
  await batch.commit();
}

/**
 * Clona una automatización y su flujo asociado.
 * La nueva regla nace pausada (enabled: false) para que el usuario pueda revisarla
 * y ajustarla antes de activarla, con sus contadores de estadísticas en cero.
 */
export async function duplicateAutomation(
  accountId: string,
  automation: Automation,
  flow?: Flow,
): Promise<string> {
  let targetFlow = flow;
  if (!targetFlow && automation.flowId) {
    const flowSnap = await getDoc(doc(db, path(accountId, 'flows'), automation.flowId));
    if (flowSnap.exists()) {
      targetFlow = { id: flowSnap.id, ...(flowSnap.data() as Omit<Flow, 'id'>) };
    }
  }

  let newFlowId: string;
  if (targetFlow) {
    newFlowId = await duplicateFlow(accountId, targetFlow);
  } else {
    newFlowId = await createFlow(accountId, `${automation.name} (copia)`);
  }

  const now = Date.now();
  const ref = await addDoc(collection(db, path(accountId, 'automations')), {
    name: `${automation.name} (copia)`,
    enabled: false,
    trigger: JSON.parse(JSON.stringify(automation.trigger)),
    flowId: newFlowId,
    priority: (automation.priority ?? 0) + 1,
    cooldownMs: automation.cooldownMs ?? 0,
    notificar: automation.notificar ?? false,
    stats: { triggered: 0, lastTriggeredAt: null },
    createdAt: now,
    updatedAt: now,
  } satisfies Omit<Automation, 'id'>);

  return ref.id;
}

// ---------------------------------------------------------------------------
// Contactos
// ---------------------------------------------------------------------------

export async function setContactTags(
  accountId: string,
  contactId: string,
  tags: string[],
): Promise<void> {
  await setDoc(doc(db, path(accountId, 'contacts'), contactId), { tags }, { merge: true });
}

export async function setContactNotes(
  accountId: string,
  contactId: string,
  notes: string,
): Promise<void> {
  await setDoc(doc(db, path(accountId, 'contacts'), contactId), { notes }, { merge: true });
}
