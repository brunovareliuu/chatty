import 'server-only';

import { adminDb } from './firebase-admin';
import { automationsCol, flowsCol } from './accounts';
import { buildStarterFlow, type StarterFlowOptions } from './engine/starter-flow';
import type { Automation, Flow, Trigger } from './types';

/**
 * Automatizaciones creadas desde el servidor (el asistente). El panel hace lo
 * mismo desde el navegador en `client/mutations.ts`; los dos arman el flujo
 * con `buildStarterFlow`, así nacen iguales.
 */
export async function createAutomationWithFlow(
  accountId: string,
  params: { name: string; trigger: Trigger; starter: StarterFlowOptions; enabled?: boolean },
): Promise<{ automation: Automation; flow: Flow }> {
  const now = Date.now();
  const { nodes, edges } = buildStarterFlow(params.starter);

  // Las nuevas van al final: las que ya existían conservan su prioridad.
  const count = (await automationsCol(accountId).count().get()).data().count;

  const flowRef = flowsCol(accountId).doc();
  const automationRef = automationsCol(accountId).doc();

  const flowDoc: Omit<Flow, 'id'> = {
    name: params.name,
    enabled: true,
    nodes,
    edges,
    createdAt: now,
    updatedAt: now,
  };
  const automationDoc: Omit<Automation, 'id'> = {
    name: params.name,
    enabled: params.enabled ?? true,
    trigger: params.trigger,
    flowId: flowRef.id,
    priority: count,
    cooldownMs: 0,
    stats: { triggered: 0, lastTriggeredAt: null },
    createdAt: now,
    updatedAt: now,
  };

  const batch = adminDb.batch();
  batch.set(flowRef, flowDoc);
  batch.set(automationRef, automationDoc);
  await batch.commit();

  return {
    automation: { id: automationRef.id, ...automationDoc },
    flow: { id: flowRef.id, ...flowDoc },
  };
}

export async function listAutomations(accountId: string): Promise<Automation[]> {
  const snap = await automationsCol(accountId).orderBy('priority', 'asc').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Automation);
}

export async function getAutomation(accountId: string, id: string): Promise<Automation | null> {
  const snap = await automationsCol(accountId).doc(id).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as Automation) : null;
}

export async function getFlow(accountId: string, id: string): Promise<Flow | null> {
  const snap = await flowsCol(accountId).doc(id).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as Flow) : null;
}
