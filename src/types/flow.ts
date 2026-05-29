import type { Edge, Node } from '@xyflow/react';

export type FlowSnapshot = {
  nodes: Node[];
  edges: Edge[];
};

export type FlowVisibility = 'private' | 'shared' | 'public';

export type SavedFlow = {
  id: string;
  cloudId?: string;
  title: string;
  description: string;
  flow: FlowSnapshot;
  thumbnail?: string;
  visibility: FlowVisibility;
  version: number;
  createdAt: string;
  updatedAt: string;
  source: 'local' | 'cloud';
};

export type FlowLoadRequest = {
  id: string;
  flow: FlowSnapshot;
};

export const emptyFlow: FlowSnapshot = {
  nodes: [],
  edges: [],
};
