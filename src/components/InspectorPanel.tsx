import type { Node } from '@xyflow/react';
import { MousePointer2 } from 'lucide-react';
import type { NodeMetadata, NodeStatus, EscapeNodeType } from '../types/nodeMetadata';
import { NODE_TYPE_LABELS, STATUS_LABELS } from '../types/nodeMetadata';

interface InspectorPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, patch: Partial<NodeMetadata> & { type?: EscapeNodeType }) => void;
}

const STATUS_OPTIONS: NodeStatus[] = ['draft', 'tested', 'needs-revision', 'approved'];
const TYPE_OPTIONS = Object.keys(NODE_TYPE_LABELS) as EscapeNodeType[];

const STATUS_BADGE: Record<NodeStatus, string> = {
  draft:            'bg-slate-700 text-slate-300',
  tested:           'bg-blue-900/60 text-blue-300',
  'needs-revision': 'bg-amber-900/60 text-amber-300',
  approved:         'bg-emerald-900/60 text-emerald-300',
};

const TYPE_ACCENT: Record<EscapeNodeType, string> = {
  startingPoint: 'bg-yellow-400/20 text-yellow-300 border-yellow-500/40',
  pluginAction:  'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  decodeAction:  'bg-rose-500/20 text-rose-300 border-rose-500/40',
  result:        'bg-slate-500/20 text-slate-300 border-slate-500/40',
  metaPuzzle:    'bg-purple-600/20 text-purple-300 border-purple-500/40',
  finale:        'bg-blue-500/20 text-blue-300 border-blue-500/40',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-colors';

const textareaCls = `${inputCls} resize-none leading-relaxed`;

export default function InspectorPanel({ selectedNode, onUpdateNode }: InspectorPanelProps) {
  if (!selectedNode) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
          <MousePointer2 size={18} className="text-slate-600" />
        </div>
        <p className="text-slate-500 text-xs leading-relaxed">
          Click any node on the canvas to inspect and edit its design details.
        </p>
      </div>
    );
  }

  const data = selectedNode.data as unknown as NodeMetadata;
  const nodeType = (selectedNode.type ?? 'startingPoint') as EscapeNodeType;
  const status = data.status ?? 'draft';
  const nodeId = selectedNode.id;

  function patch(partial: Partial<NodeMetadata> & { type?: EscapeNodeType }) {
    onUpdateNode(nodeId, partial);
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      {/* Node type badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${TYPE_ACCENT[nodeType]}`}
        >
          {NODE_TYPE_LABELS[nodeType]}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS_BADGE[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Label */}
      <Field label="Label">
        <input
          className={inputCls}
          value={data.label ?? ''}
          onChange={(e) => patch({ label: e.target.value })}
          placeholder="Node label"
        />
      </Field>

      {/* Type + Status row */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Node Type">
          <select
            className={inputCls}
            value={nodeType}
            onChange={(e) => patch({ type: e.target.value as EscapeNodeType })}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{NODE_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select
            className={inputCls}
            value={status}
            onChange={(e) => patch({ status: e.target.value as NodeStatus })}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Solve time + Clue count row */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Solve Time (min)">
          <input
            type="number"
            min={0}
            max={999}
            className={inputCls}
            value={data.solveTime ?? ''}
            onChange={(e) => patch({ solveTime: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="e.g. 5"
          />
        </Field>

        <Field label="Clue Count">
          <input
            type="number"
            min={0}
            max={99}
            className={inputCls}
            value={data.clueCount ?? ''}
            onChange={(e) => patch({ clueCount: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="e.g. 3"
          />
        </Field>
      </div>

      {/* Difficulty */}
      <Field label="Difficulty">
        <div className="flex gap-1.5 mt-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => patch({ difficulty: data.difficulty === n ? undefined : n })}
              className={`w-7 h-7 rounded-md border text-xs font-bold transition-all duration-150 ${
                (data.difficulty ?? 0) >= n
                  ? 'bg-amber-500 border-amber-400 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'
              }`}
            >
              {n}
            </button>
          ))}
          {data.difficulty && (
            <span className="text-[10px] text-slate-500 self-center ml-1">
              {['', 'Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'][data.difficulty]}
            </span>
          )}
        </div>
      </Field>

      <div className="border-t border-slate-800" />

      {/* Designer notes */}
      <Field label="Designer Notes">
        <textarea
          className={textareaCls}
          rows={3}
          value={data.notes ?? ''}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Internal notes for the design team…"
        />
      </Field>

      {/* Required props */}
      <Field label="Required Props / Materials">
        <textarea
          className={textareaCls}
          rows={2}
          value={data.props ?? ''}
          onChange={(e) => patch({ props: e.target.value })}
          placeholder="e.g. UV flashlight, padlock #3, cipher wheel…"
        />
      </Field>

      {/* Reset notes */}
      <Field label="Reset / Reusability Notes">
        <textarea
          className={textareaCls}
          rows={2}
          value={data.resetNotes ?? ''}
          onChange={(e) => patch({ resetNotes: e.target.value })}
          placeholder="e.g. Re-lock padlock, reprint cipher sheet…"
        />
      </Field>
    </div>
  );
}
