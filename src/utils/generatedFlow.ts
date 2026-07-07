// generatedFlow.ts — build a Flow canvas from an AI Room Generator document.
//
// Rooms sent from Create ("Send to My Venue") carry their generated document
// in experiences.design_parameters. The puzzle_flow is a directed chain (each
// puzzle's output feeds the next), which maps directly onto Flow nodes and
// edges: start → [puzzle → its output] per step → finale.

import type { Edge, Node } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import type { FlowSnapshot } from '../types/flow';

export interface GeneratedPuzzle {
  title?: string;
  role_in_flow?: string;
  player_facing_clue?: string;
  output?: string;
}

export interface GeneratedRoomDoc {
  title?: string;
  theme?: string;
  format?: string;
  puzzle_flow?: GeneratedPuzzle[];
}

export interface GeneratedRoomPayload {
  source: string;
  room: GeneratedRoomDoc;
}

export function isGeneratedRoomPayload(value: unknown): value is GeneratedRoomPayload {
  const payload = value as GeneratedRoomPayload | null;
  return Boolean(payload && payload.source === 'room_generator' && payload.room && typeof payload.room === 'object');
}

const EDGE_STYLE = {
  animated: true,
  style: { stroke: '#64748b', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
} as const;

const truncate = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

export function buildFlowFromGeneratedRoom(room: GeneratedRoomDoc): FlowSnapshot {
  const puzzles = room.puzzle_flow || [];
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: 'gen-start',
    type: 'startingPoint',
    position: { x: 40, y: 220 },
    data: { label: truncate(`${room.title || 'Room'} — intro`, 34) },
  });

  puzzles.forEach((puzzle, index) => {
    const n = index + 1;
    const columnX = 260 + index * 300;
    const isMeta = /meta/i.test(`${puzzle.title || ''} ${puzzle.role_in_flow || ''}`);

    nodes.push({
      id: `gen-p${n}`,
      type: isMeta ? 'metaPuzzle' : 'decodeAction',
      position: { x: columnX, y: 140 },
      data: { label: truncate(puzzle.title || `Puzzle ${n}`, 36) },
    });
    nodes.push({
      id: `gen-r${n}`,
      type: 'result',
      position: { x: columnX + 110, y: 320 },
      data: { label: truncate(puzzle.output || `Output ${n}`, 34) },
    });

    edges.push({ id: `gen-e-p${n}-r${n}`, source: `gen-p${n}`, target: `gen-r${n}`, ...EDGE_STYLE });
    if (index === 0) {
      edges.push({ id: 'gen-e-start-p1', source: 'gen-start', target: 'gen-p1', ...EDGE_STYLE });
    } else {
      edges.push({ id: `gen-e-r${n - 1}-p${n}`, source: `gen-r${n - 1}`, target: `gen-p${n}`, ...EDGE_STYLE });
    }
  });

  const finaleX = 260 + puzzles.length * 300;
  nodes.push({ id: 'gen-finale', type: 'finale', position: { x: finaleX, y: 220 }, data: { label: 'ESCAPE!' } });
  edges.push({
    id: 'gen-e-final',
    source: puzzles.length ? `gen-r${puzzles.length}` : 'gen-start',
    target: 'gen-finale',
    ...EDGE_STYLE,
  });

  return { nodes, edges };
}
