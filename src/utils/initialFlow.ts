import type { Node, Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';

const EDGE_STYLE = {
  animated: true,
  style: { stroke: '#64748b', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
} as const;

export const INITIAL_NODES: Node[] = [
  { id: 'intro-1', type: 'startingPoint', position: { x: 80,  y: 200 }, data: { label: 'Starting Clue' } },
  { id: 'intro-2', type: 'decodeAction',  position: { x: 260, y: 195 }, data: { label: 'Cipher Decode' } },
  { id: 'intro-3', type: 'result',        position: { x: 460, y: 205 }, data: { label: 'Safe Combo' } },
  { id: 'intro-4', type: 'pluginAction',  position: { x: 460, y: 80  }, data: { label: 'Unlock Safe' } },
  { id: 'intro-5', type: 'metaPuzzle',   position: { x: 660, y: 180 }, data: { label: 'Meta Puzzle' } },
  { id: 'intro-6', type: 'finale',       position: { x: 880, y: 193 }, data: { label: 'ESCAPE!' } },
];

export const INITIAL_EDGES: Edge[] = [
  { id: 'e1-2', source: 'intro-1', target: 'intro-2', ...EDGE_STYLE },
  { id: 'e2-3', source: 'intro-2', target: 'intro-3', ...EDGE_STYLE },
  { id: 'e3-5', source: 'intro-3', target: 'intro-5', ...EDGE_STYLE },
  { id: 'e4-5', source: 'intro-4', target: 'intro-5', ...EDGE_STYLE },
  { id: 'e5-6', source: 'intro-5', target: 'intro-6', ...EDGE_STYLE },
];
