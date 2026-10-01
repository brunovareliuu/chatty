'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ChevronLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useDoc } from '@/lib/client/firestore-hooks';
import { saveFlow } from '@/lib/client/mutations';
import type { Flow, FlowEdge, FlowNode, FlowNodeData, NodeType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Punto } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { NODE_META } from './node-config';
import { FlowNodeCardMemo, type ChattyNode } from './flow-node';
import { NodePalette } from './node-palette';
import { NodeInspector } from './node-inspector';
import { BASE_VARIABLES, type VariableOption } from '@/components/ui/variable-textarea';

const nodeTypes = Object.fromEntries(
  Object.keys(NODE_META).map((t) => [t, FlowNodeCardMemo]),
) as Record<string, typeof FlowNodeCardMemo>;

function toReactFlow(flow: Flow): { nodes: ChattyNode[]; edges: Edge[] } {
  return {
    nodes: flow.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data as ChattyNode['data'],
      deletable: NODE_META[n.type].removable,
    })),
    edges: flow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      animated: true,
    })),
  };
}

function fromReactFlow(nodes: ChattyNode[], edges: Edge[]): { nodes: FlowNode[]; edges: FlowEdge[] } {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: (n.type ?? 'send_text') as NodeType,
      position: n.position,
      data: n.data,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? 'next',
    })),
  };
}

/**
 * Lo que cambia según quién monte el lienzo. Dentro de una automatización el
 * nombre y el interruptor viven en su cabecera, no aquí: si no, serían dos
 * controles para lo mismo.
 */
type BuilderChrome = {
  /** A dónde vuelve la flecha. */
  backHref?: string;
  /** Se pinta junto al nombre: el resumen del disparador, por ejemplo. */
  headerExtra?: ReactNode;
  /** El interruptor lo maneja quien nos monta; aquí ni se pinta ni se guarda. */
  hideEnabled?: boolean;
  /** Se llama al guardar, para que el nombre del flujo y el de su automatización no se separen. */
  onNameSaved?: (name: string) => Promise<void> | void;
};

/**
 * El lienzo se monta con el flujo ya cargado, así el estado inicial sale de las
 * props y no de un efecto. `initialFlow` es una foto del arranque a propósito:
 * a partir de ahí manda el lienzo, si no cada snapshot de Firestore pisaría lo
 * que el usuario está moviendo.
 */
function Canvas({
  accountId,
  flowId,
  initialFlow,
  backHref,
  headerExtra,
  hideEnabled,
  onNameSaved,
}: {
  accountId: string;
  flowId: string;
  initialFlow: Flow;
} & BuilderChrome) {
  const initial = useMemo(() => toReactFlow(initialFlow), [initialFlow]);

  const [nodes, setNodes, onNodesChange] = useNodesState<ChattyNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [name, setName] = useState(initialFlow.name);
  const [enabled, setEnabled] = useState(initialFlow.enabled);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Aviso al cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        // Un puerto de salida solo puede llevar a un destino: reemplazamos.
        const cleaned = eds.filter(
          (e) => !(e.source === connection.source && e.sourceHandle === connection.sourceHandle),
        );
        return addEdge({ ...connection, animated: true }, cleaned);
      });
      setDirty(true);
    },
    [setEdges],
  );

  const onSelectionChange = useCallback(({ nodes: sel }: OnSelectionChangeParams) => {
    setSelectedId(sel.length === 1 ? sel[0].id : null);
  }, []);

  // Variables que puede usar cualquier texto de este flujo: las fijas más las
  // que capturan los nodos «Pregunta» y la respuesta de «Llamar a una API».
  const flowVariables = useMemo<VariableOption[]>(() => {
    const captured: VariableOption[] = [];
    for (const n of nodes) {
      const d = n.data as FlowNodeData;
      if (n.type === 'ask_question' && d.saveToField) {
        captured.push({ key: d.saveToField, label: `Respuesta: ${d.saveToField}`, hint: 'capturada con «Pregunta»' });
      }
      if (n.type === 'http_request' && !captured.some((v) => v.key === 'http_response')) {
        captured.push({ key: 'http_response', label: 'Respuesta de la API', hint: 'de «Llamar a una API»' });
      }
    }
    return [...BASE_VARIABLES, ...captured];
  }, [nodes]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  function addNode(type: NodeType) {
    const id = `${type}_${Date.now().toString(36)}`;
    const anchor = selectedNode ?? nodes[nodes.length - 1];
    const position = anchor ? { x: anchor.position.x, y: anchor.position.y + 190 } : { x: 0, y: 0 };

    setNodes((ns) => [
      ...ns.map((n) => ({ ...n, selected: false })),
      {
        id,
        type,
        position,
        data: { ...NODE_META[type].defaults } as ChattyNode['data'],
        deletable: true,
        selected: true,
      },
    ]);

    // Si el nodo de referencia tenía la salida por defecto libre, lo enlazamos solo.
    if (anchor) {
      const taken = edges.some((e) => e.source === anchor.id && e.sourceHandle === 'next');
      if (!taken) {
        setEdges((eds) => [
          ...eds,
          { id: `${anchor.id}-${id}`, source: anchor.id, target: id, sourceHandle: 'next', animated: true },
        ]);
      }
    }

    setSelectedId(id);
    setDirty(true);
  }

  function updateNodeData(id: string, patch: Record<string, unknown>) {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
    setDirty(true);
  }

  function removeNode(id: string) {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
    setDirty(true);
  }

  async function persist() {
    setSaving(true);
    try {
      const { nodes: n, edges: e } = fromReactFlow(nodes, edges);
      const cleanName = name.trim() || 'Flujo sin nombre';
      await saveFlow(accountId, flowId, {
        name: cleanName,
        // Con el interruptor fuera, `enabled` pudo cambiar mientras editábamos:
        // guardarlo desde la foto del arranque lo pisaría.
        ...(hideEnabled ? {} : { enabled }),
        nodes: n,
        edges: e,
      });
      await onNameSaved?.(cleanName);
      setDirty(false);
      toast.success('Guardado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/*
        En celular la cabecera va en dos renglones: volver, nombre y guardar
        arriba; el resumen del disparador y los interruptores abajo. En
        escritorio el envoltorio de abajo se disuelve (md:contents) y todo
        queda en una sola línea, en el orden de siempre.
      */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline bg-card px-3 py-2.5 md:min-h-14 md:flex-nowrap md:gap-x-2.5 md:px-4 md:py-2.5">
        <Link
          href={backHref ?? '/automations'}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-fill-soft hover:text-txt"
          aria-label="Volver"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </Link>

        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
          aria-label="Nombre del flujo"
          className="h-9 min-w-0 flex-1 border-transparent bg-transparent px-2 text-[16px] font-semibold tracking-[-0.012em] hover:bg-fill-soft focus:bg-field md:max-w-[300px] md:flex-initial md:text-[15px]"
        />

        <div className="ml-auto flex shrink-0 items-center gap-2 md:order-last md:gap-2.5">
          {!hideEnabled && (
            <label className="mr-1 flex items-center gap-2 text-[13px] font-medium text-muted">
              Activo
              <Switch
                checked={enabled}
                onCheckedChange={(v) => {
                  setEnabled(v);
                  setDirty(true);
                }}
              />
            </label>
          )}

          <Button
            variant="primary"
            onClick={persist}
            loading={saving}
            disabled={!dirty}
            className="max-md:px-3"
          >
            <Save className="h-4 w-4" strokeWidth={2} />
            Guardar
          </Button>
        </div>

        {(dirty || headerExtra) && (
          <div className="flex w-full min-w-0 items-center gap-2 md:contents">
            {dirty && (
              <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-muted">
                <Punto tone="accent" />
                Sin guardar
              </span>
            )}
            {headerExtra}
          </div>
        )}
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Editar en teléfono no es objetivo: la paleta solo se ofrece en escritorio. */}
        <div className="hidden md:contents">
          <NodePalette onAdd={addNode} />
        </div>

        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(c) => {
              onNodesChange(c);
              if (c.some((ch) => ch.type === 'position' || ch.type === 'remove')) setDirty(true);
            }}
            onEdgesChange={(c) => {
              onEdgesChange(c);
              if (c.some((ch) => ch.type === 'remove')) setDirty(true);
            }}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            fitView
            // El mínimo de React Flow (0.5) no deja ver entero un flujo de más de ~20 nodos.
            minZoom={0.1}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ animated: true }}
            deleteKeyCode={['Backspace', 'Delete']}
            className="bg-page"
          >
            {/* Tarjetas blancas sobre la página gris, como el resto del panel. */}
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1.3}
              color="color-mix(in srgb, var(--faint) 45%, transparent)"
              bgColor="var(--page)"
            />
            <Controls
              className="!overflow-hidden !rounded-[10px] !border-0 !shadow-control [&>button]:!border-hairline [&>button]:!bg-elevated [&>button]:!fill-[var(--txt)] [&>button:hover]:!bg-surface"
              showInteractive={false}
            />
          </ReactFlow>
        </div>

        {selectedNode && (
          // En celular el inspector tapa el lienzo a lo ancho; en escritorio es la columna de siempre.
          <div className="absolute inset-0 z-10 flex md:static md:contents [&>aside]:w-full md:[&>aside]:w-[320px]">
            <NodeInspector
              node={selectedNode}
              variables={flowVariables}
              onChange={(patch) => updateNodeData(selectedNode.id, patch)}
              onDelete={
                NODE_META[(selectedNode.type ?? 'send_text') as NodeType].removable
                  ? () => removeNode(selectedNode.id)
                  : undefined
              }
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Loader({ accountId, flowId, ...chrome }: { accountId: string; flowId: string } & BuilderChrome) {
  const { data: flow, loading } = useDoc<Flow>(`accounts/${accountId}/flows/${flowId}`);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-[15px] font-semibold">Este flujo ya no existe</p>
        <Link href={chrome.backHref ?? '/automations'} className="text-[14px] text-accent hover:underline">
          Volver a automatizaciones
        </Link>
      </div>
    );
  }

  return <Canvas accountId={accountId} flowId={flowId} initialFlow={flow} {...chrome} />;
}

/**
 * `flujoInicial` monta el lienzo con un flujo que ya se tiene en la mano en vez
 * de leerlo de Firestore (una vista con datos de ejemplo). Sin él, se lee como siempre.
 */
export function FlowBuilder({
  flujoInicial,
  ...props
}: { accountId: string; flowId: string; flujoInicial?: Flow } & BuilderChrome) {
  return (
    <ReactFlowProvider>
      {flujoInicial ? <Canvas {...props} initialFlow={flujoInicial} /> : <Loader {...props} />}
    </ReactFlowProvider>
  );
}
