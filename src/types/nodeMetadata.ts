export type NodeStatus = 'draft' | 'tested' | 'needs-revision' | 'approved';

export type EscapeNodeType =
  | 'startingPoint'
  | 'pluginAction'
  | 'decodeAction'
  | 'result'
  | 'metaPuzzle'
  | 'finale';

export interface NodeMetadata {
  label: string;
  notes?: string;
  solveTime?: number;
  difficulty?: number;
  props?: string;
  clueCount?: number;
  resetNotes?: string;
  status?: NodeStatus;
}

export const NODE_TYPE_LABELS: Record<EscapeNodeType, string> = {
  startingPoint: 'Starting Point',
  pluginAction:  'Plugin Action',
  decodeAction:  'Decode Action',
  result:        'Result',
  metaPuzzle:    'Meta Puzzle',
  finale:        'Finale',
};

export const STATUS_LABELS: Record<NodeStatus, string> = {
  draft:           'Draft',
  tested:          'Tested',
  'needs-revision': 'Needs Revision',
  approved:        'Approved',
};

export const STATUS_COLORS: Record<NodeStatus, string> = {
  draft:           'bg-slate-700 text-slate-300',
  tested:          'bg-blue-900/60 text-blue-300',
  'needs-revision': 'bg-amber-900/60 text-amber-300',
  approved:        'bg-emerald-900/60 text-emerald-300',
};
