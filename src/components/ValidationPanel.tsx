import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { analyzeGraph, type GraphWarning, type WarningSeverity } from '../utils/graphAnalysis';
import { NODE_TYPE_LABELS, type EscapeNodeType } from '../types/nodeMetadata';

const TYPE_COLORS: Record<string, string> = {
  startingPoint: 'text-yellow-400',
  pluginAction:  'text-emerald-400',
  decodeAction:  'text-rose-400',
  result:        'text-slate-400',
  metaPuzzle:    'text-purple-400',
  finale:        'text-blue-400',
};

const SEVERITY_ICON: Record<WarningSeverity, React.ReactNode> = {
  error:   <AlertCircle size={13} className="text-rose-400 flex-shrink-0 mt-0.5" />,
  warning: <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />,
  info:    <Info size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />,
};

const SEVERITY_ROW: Record<WarningSeverity, string> = {
  error:   'bg-rose-950/40 border-rose-800/50',
  warning: 'bg-amber-950/40 border-amber-800/50',
  info:    'bg-blue-950/40 border-blue-800/50',
};

const SEVERITY_TITLE: Record<WarningSeverity, string> = {
  error:   'text-rose-300',
  warning: 'text-amber-300',
  info:    'text-blue-300',
};

function WarningCard({ w }: { w: GraphWarning }) {
  return (
    <div className={`rounded-lg border p-3 ${SEVERITY_ROW[w.severity]}`}>
      <div className="flex items-start gap-2">
        {SEVERITY_ICON[w.severity]}
        <div className="min-w-0">
          <p className={`text-xs font-semibold leading-tight ${SEVERITY_TITLE[w.severity]}`}>{w.title}</p>
          <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">{w.detail}</p>
          <p className="text-slate-500 text-[11px] mt-1.5 leading-snug italic">{w.microcopy}</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, colorCls }: { label: string; value: number; colorCls?: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`text-xs ${colorCls ?? 'text-slate-400'}`}>{label}</span>
      <span className="text-xs font-mono font-semibold text-slate-200">{value}</span>
    </div>
  );
}

interface ValidationPanelProps {
  nodes: Node[];
  edges: Edge[];
}

export default function ValidationPanel({ nodes, edges }: ValidationPanelProps) {
  const analysis = useMemo(() => analyzeGraph(nodes, edges), [nodes, edges]);
  const { metrics, warnings } = analysis;

  const errors   = warnings.filter((w) => w.severity === 'error');
  const cautions = warnings.filter((w) => w.severity === 'warning');
  const infos    = warnings.filter((w) => w.severity === 'info');

  return (
    <div className="flex flex-col gap-5 p-4 overflow-y-auto h-full">
      {/* Overview */}
      <section>
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
          Overview
        </h3>
        <div className="bg-slate-800/60 rounded-lg border border-slate-700 px-3 divide-y divide-slate-700/60">
          <Stat label="Total nodes" value={metrics.totalNodes} />
          <Stat label="Total edges" value={metrics.totalEdges} />
          {metrics.criticalPathMinutes > 0 && (
            <Stat label="Critical path" value={metrics.criticalPathMinutes} colorCls="text-blue-400" />
          )}
          {metrics.totalSolveMinutes > 0 && (
            <Stat label="Total solve time (all paths)" value={metrics.totalSolveMinutes} colorCls="text-slate-500" />
          )}
        </div>
        {metrics.criticalPathMinutes === 0 && metrics.totalSolveMinutes === 0 && (
          <p className="text-[11px] text-slate-600 mt-1.5 leading-snug">
            Add Solve Time values in the Inspector to see timing estimates.
          </p>
        )}
      </section>

      {/* Nodes by type */}
      {metrics.totalNodes > 0 && (
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
            Nodes by Type
          </h3>
          <div className="bg-slate-800/60 rounded-lg border border-slate-700 px-3 divide-y divide-slate-700/60">
            {(Object.keys(NODE_TYPE_LABELS) as EscapeNodeType[]).map((t) => {
              const count = metrics.byType[t] ?? 0;
              if (count === 0) return null;
              return (
                <div key={t} className="flex items-center justify-between py-1">
                  <span className={`text-xs ${TYPE_COLORS[t]}`}>
                    {NODE_TYPE_LABELS[t]}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-200">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Warnings */}
      <section>
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
          Validation
          {warnings.length > 0 && (
            <span className="ml-1.5 text-slate-600 normal-case tracking-normal font-normal">
              ({warnings.length} issue{warnings.length !== 1 ? 's' : ''})
            </span>
          )}
        </h3>

        {warnings.length === 0 ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50">
            <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-300 text-xs font-medium">No issues detected</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[...errors, ...cautions, ...infos].map((w) => (
              <WarningCard key={w.id} w={w} />
            ))}
          </div>
        )}
      </section>

      {/* Branching summary */}
      {metrics.totalNodes > 0 && (
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
            Graph Shape
          </h3>
          <div className="bg-slate-800/60 rounded-lg border border-slate-700 px-3 divide-y divide-slate-700/60">
            <Stat label="Starting points" value={metrics.byType['startingPoint'] ?? 0} colorCls="text-yellow-400" />
            <Stat label="Finales" value={metrics.byType['finale'] ?? 0} colorCls="text-blue-400" />
            <Stat label="Meta puzzles (convergence)" value={metrics.byType['metaPuzzle'] ?? 0} colorCls="text-purple-400" />
            <Stat label="Disconnected" value={analysis.disconnectedIds.size} colorCls={analysis.disconnectedIds.size > 0 ? 'text-amber-400' : 'text-slate-500'} />
            <Stat label="Dead-end branches" value={analysis.deadEndIds.size} colorCls={analysis.deadEndIds.size > 0 ? 'text-amber-400' : 'text-slate-500'} />
          </div>
        </section>
      )}
    </div>
  );
}
