import type { Node, Edge, Viewport } from '@xyflow/react';

const STORAGE_KEY = 'mjw-puzzle-flow-v1';
const SCHEMA_VERSION = 1;

const VALID_NODE_TYPES = new Set([
  'startingPoint',
  'pluginAction',
  'decodeAction',
  'result',
  'metaPuzzle',
  'finale',
]);

export interface PersistedFlow {
  version: number;
  savedAt: string;
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
}

export function serializeFlow(
  nodes: Node[],
  edges: Edge[],
  viewport?: Viewport,
): PersistedFlow {
  return {
    version: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    nodes,
    edges,
    ...(viewport ? { viewport } : {}),
  };
}

function isValidNode(n: unknown): n is Node {
  if (!n || typeof n !== 'object') return false;
  const node = n as Record<string, unknown>;
  if (typeof node.id !== 'string' || !node.id) return false;
  if (typeof node.type !== 'string' || !VALID_NODE_TYPES.has(node.type)) return false;
  if (!node.position || typeof node.position !== 'object') return false;
  const pos = node.position as Record<string, unknown>;
  if (typeof pos.x !== 'number' || typeof pos.y !== 'number') return false;
  if (!node.data || typeof node.data !== 'object') return false;
  return true;
}

function isValidEdge(e: unknown): e is Edge {
  if (!e || typeof e !== 'object') return false;
  const edge = e as Record<string, unknown>;
  return (
    typeof edge.id === 'string' &&
    typeof edge.source === 'string' &&
    typeof edge.target === 'string'
  );
}

function isValidViewport(v: unknown): v is Viewport {
  if (!v || typeof v !== 'object') return false;
  const vp = v as Record<string, unknown>;
  return (
    typeof vp.x === 'number' &&
    typeof vp.y === 'number' &&
    typeof vp.zoom === 'number'
  );
}

export function validateFlow(data: unknown): data is PersistedFlow {
  if (!data || typeof data !== 'object') return false;
  const flow = data as Record<string, unknown>;

  if (!Array.isArray(flow.nodes) || !Array.isArray(flow.edges)) return false;
  if (!flow.nodes.every(isValidNode)) return false;
  if (!flow.edges.every(isValidEdge)) return false;
  if (flow.viewport !== undefined && !isValidViewport(flow.viewport)) return false;

  return true;
}

export function saveFlow(nodes: Node[], edges: Edge[], viewport?: Viewport): void {
  try {
    const data = serializeFlow(nodes, edges, viewport);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage quota exceeded or private mode — silently ignore
  }
}

export function loadFlow(): PersistedFlow | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!validateFlow(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedFlow(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function exportFlowAsJson(
  nodes: Node[],
  edges: Edge[],
  filename = 'puzzle-flow.json',
): void {
  const data = serializeFlow(nodes, edges);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportedJson(raw: string): PersistedFlow | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'The file is not valid JSON.' };
  }
  if (!validateFlow(parsed)) {
    return {
      error:
        'The file does not contain a valid puzzle flow. ' +
        'Make sure you are importing a file exported from this app.',
    };
  }
  return parsed as PersistedFlow;
}
