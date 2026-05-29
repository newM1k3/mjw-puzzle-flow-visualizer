import type { Node, Edge } from '@xyflow/react';

export type WarningSeverity = 'error' | 'warning' | 'info';

export interface GraphWarning {
  id: string;
  severity: WarningSeverity;
  title: string;
  detail: string;
  nodeIds?: string[];
  microcopy: string;
}

export interface GraphMetrics {
  totalNodes: number;
  totalEdges: number;
  byType: Record<string, number>;
  totalSolveMinutes: number;
  criticalPathMinutes: number;
}

export interface GraphAnalysis {
  metrics: GraphMetrics;
  warnings: GraphWarning[];
  disconnectedIds: Set<string>;
  deadEndIds: Set<string>;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function buildAdjacency(nodes: Node[], edges: Edge[]) {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const forward = new Map<string, string[]>();
  const reverse = new Map<string, string[]>();
  for (const n of nodes) { forward.set(n.id, []); reverse.set(n.id, []); }
  for (const e of edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    forward.get(e.source)!.push(e.target);
    reverse.get(e.target)!.push(e.source);
  }
  return { forward, reverse };
}

function nodeLabel(n: Node): string {
  return typeof n.data?.label === 'string' ? n.data.label : n.id;
}

function solveTime(n: Node): number {
  const v = typeof n.data?.solveTime === 'number' ? n.data.solveTime : 0;
  return Math.max(0, v);
}

// ── main export ───────────────────────────────────────────────────────────────

export function analyzeGraph(nodes: Node[], edges: Edge[]): GraphAnalysis {
  const warnings: GraphWarning[] = [];
  const { forward, reverse } = buildAdjacency(nodes, edges);

  // Node sets by type
  const byType: Record<string, number> = {};
  for (const n of nodes) {
    const t = n.type ?? 'unknown';
    byType[t] = (byType[t] ?? 0) + 1;
  }

  const starts   = nodes.filter((n) => n.type === 'startingPoint');
  const finales  = nodes.filter((n) => n.type === 'finale');
  const decodes  = nodes.filter((n) => n.type === 'decodeAction');
  const plugins  = nodes.filter((n) => n.type === 'pluginAction');

  // ── Warning: no starting point ────────────────────────────────────────────
  if (starts.length === 0) {
    warnings.push({
      id: 'no-start',
      severity: 'error',
      title: 'No Starting Point',
      detail: 'Every room needs at least one entry clue players will find first.',
      microcopy: 'Add a Starting Point node to define where your players begin.',
      nodeIds: [],
    });
  }

  // ── Warning: no finale ────────────────────────────────────────────────────
  if (finales.length === 0) {
    warnings.push({
      id: 'no-finale',
      severity: 'error',
      title: 'No Finale',
      detail: 'Players have no defined escape condition.',
      microcopy: 'Add a Finale node to represent the end-state / escape trigger.',
      nodeIds: [],
    });
  }

  // ── Disconnected nodes ────────────────────────────────────────────────────
  const nodesWithEdges = new Set<string>();
  for (const e of edges) {
    nodesWithEdges.add(e.source);
    nodesWithEdges.add(e.target);
  }
  const disconnectedIds = new Set<string>(
    nodes.filter((n) => !nodesWithEdges.has(n.id)).map((n) => n.id),
  );
  if (disconnectedIds.size > 0) {
    const names = nodes
      .filter((n) => disconnectedIds.has(n.id))
      .map((n) => `"${nodeLabel(n)}"`)
      .join(', ');
    warnings.push({
      id: 'disconnected',
      severity: 'warning',
      title: `Disconnected Node${disconnectedIds.size > 1 ? 's' : ''}`,
      detail: `${names} ${disconnectedIds.size > 1 ? 'have' : 'has'} no connections.`,
      microcopy: 'Disconnected nodes are never reached during play. Connect or remove them.',
      nodeIds: [...disconnectedIds],
    });
  }

  // ── Dead-end nodes (BFS backward from finales) ────────────────────────────
  const reachableFromFinale = new Set<string>(finales.map((n) => n.id));
  const bfsQ = finales.map((n) => n.id);
  while (bfsQ.length > 0) {
    const cur = bfsQ.shift()!;
    for (const prev of reverse.get(cur) ?? []) {
      if (!reachableFromFinale.has(prev)) {
        reachableFromFinale.add(prev);
        bfsQ.push(prev);
      }
    }
  }

  const deadEndIds = new Set<string>(
    nodes
      .filter((n) => n.type !== 'finale' && !reachableFromFinale.has(n.id) && !disconnectedIds.has(n.id))
      .map((n) => n.id),
  );
  if (deadEndIds.size > 0) {
    const names = nodes
      .filter((n) => deadEndIds.has(n.id))
      .map((n) => `"${nodeLabel(n)}"`)
      .join(', ');
    warnings.push({
      id: 'dead-end',
      severity: 'warning',
      title: `Dead-End Branch${deadEndIds.size > 1 ? 'es' : ''}`,
      detail: `${names} ${deadEndIds.size > 1 ? 'do' : 'does'} not lead to any Finale.`,
      microcopy:
        'Players who solve these puzzles will have no forward path. Connect them to the main flow or to a Finale.',
      nodeIds: [...deadEndIds],
    });
  }

  // ── No path from any start to any finale ─────────────────────────────────
  if (starts.length > 0 && finales.length > 0) {
    const reachableFromStart = new Set<string>(starts.map((n) => n.id));
    const fwdQ = starts.map((n) => n.id);
    while (fwdQ.length > 0) {
      const cur = fwdQ.shift()!;
      for (const next of forward.get(cur) ?? []) {
        if (!reachableFromStart.has(next)) {
          reachableFromStart.add(next);
          fwdQ.push(next);
        }
      }
    }
    const finaleReachable = finales.some((f) => reachableFromStart.has(f.id));
    if (!finaleReachable) {
      warnings.push({
        id: 'no-path',
        severity: 'error',
        title: 'No Path from Start to Finale',
        detail: 'No chain of connections leads from a Starting Point to any Finale.',
        microcopy: 'Players can start but can never escape. Check your connections.',
        nodeIds: [],
      });
    }
  }

  // ── Bottleneck (≥3 incoming edges on a non-finale node) ──────────────────
  const inDegree = new Map<string, number>();
  for (const n of nodes) inDegree.set(n.id, 0);
  for (const e of edges) {
    if (inDegree.has(e.target)) inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }
  const bottlenecks = nodes.filter(
    (n) => n.type !== 'finale' && (inDegree.get(n.id) ?? 0) >= 3,
  );
  if (bottlenecks.length > 0) {
    const names = bottlenecks.map((n) => `"${nodeLabel(n)}"`).join(', ');
    warnings.push({
      id: 'bottleneck',
      severity: 'warning',
      title: 'Convergence Bottleneck',
      detail: `${names} has 3 or more incoming paths.`,
      microcopy:
        'Early convergence slows the whole group before they\'ve explored all branches. Consider splitting into a Meta Puzzle node or spacing out the convergence.',
      nodeIds: bottlenecks.map((n) => n.id),
    });
  }

  // ── Cognitive balance ─────────────────────────────────────────────────────
  if (decodes.length > 0 && plugins.length > 0) {
    const ratio = decodes.length / plugins.length;
    if (ratio > 2.5) {
      warnings.push({
        id: 'too-many-decodes',
        severity: 'info',
        title: 'Heavy on Brain Work',
        detail: `${decodes.length} Decode Actions vs ${plugins.length} Plugin Actions.`,
        microcopy:
          'Rooms that are mostly decode-heavy can fatigue players mentally. Mix in more physical/plugin actions.',
        nodeIds: [],
      });
    } else if (1 / ratio > 2.5) {
      warnings.push({
        id: 'too-many-plugins',
        severity: 'info',
        title: 'Heavy on Physical Tasks',
        detail: `${plugins.length} Plugin Actions vs ${decodes.length} Decode Actions.`,
        microcopy:
          'Rooms with mostly physical tasks may lack puzzle depth. Add some decode/cipher challenges.',
        nodeIds: [],
      });
    }
  }

  // ── Critical path (topological DP on DAG) ─────────────────────────────────
  let criticalPathMinutes = 0;
  if (starts.length > 0 && finales.length > 0) {
    // Kahn's topological sort
    const inDegCopy = new Map<string, number>(inDegree);
    const topo: string[] = [];
    const q = nodes.filter((n) => (inDegCopy.get(n.id) ?? 0) === 0).map((n) => n.id);
    while (q.length > 0) {
      const cur = q.shift()!;
      topo.push(cur);
      for (const nxt of forward.get(cur) ?? []) {
        const d = (inDegCopy.get(nxt) ?? 1) - 1;
        inDegCopy.set(nxt, d);
        if (d === 0) q.push(nxt);
      }
    }
    if (topo.length === nodes.length) {
      // No cycle — compute DP
      const dp = new Map<string, number>();
      const nodeMap = new Map<string, Node>(nodes.map((n) => [n.id, n]));
      for (const id of topo) {
        const prevMax = Math.max(0, ...(reverse.get(id) ?? []).map((p) => dp.get(p) ?? 0));
        dp.set(id, prevMax + solveTime(nodeMap.get(id)!));
      }
      criticalPathMinutes = Math.max(
        0,
        ...finales.map((f) => dp.get(f.id) ?? 0),
      );
    }
  }

  const totalSolveMinutes = nodes.reduce((sum, n) => sum + solveTime(n), 0);

  return {
    metrics: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      byType,
      totalSolveMinutes,
      criticalPathMinutes,
    },
    warnings,
    disconnectedIds,
    deadEndIds,
  };
}
