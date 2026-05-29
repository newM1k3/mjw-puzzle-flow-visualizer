import { useMemo, useState } from 'react';
import type { FlowSnapshot } from '../types/flow';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clipboard,
  Loader2,
  Route,
  Sparkles,
  Wand2,
} from 'lucide-react';

type CoachAction =
  | 'critique'
  | 'bottlenecks'
  | 'pacing'
  | 'clues'
  | 'starter_flow';

type SuggestedNode = {
  id?: string;
  type: string;
  label: string;
  reason?: string;
};

type SuggestedEdge = {
  source: string;
  target: string;
  reason?: string;
};

type CoachResult = {
  summary: string;
  strengths: string[];
  risks: string[];
  recommendedChanges: string[];
  suggestedNodes: SuggestedNode[];
  suggestedEdges: SuggestedEdge[];
};

type AIFlowCoachPanelProps = {
  flow: FlowSnapshot;
};

const ACTIONS: Array<{
  id: CoachAction;
  label: string;
  description: string;
}> = [
  {
    id: 'critique',
    label: 'Critique This Flow',
    description: 'Overall expert review of fairness, pacing, clue logic, and finale satisfaction.',
  },
  {
    id: 'bottlenecks',
    label: 'Find Bottlenecks',
    description: 'Identify risky choke points, dead ends, and branches that may stall teams.',
  },
  {
    id: 'pacing',
    label: 'Improve Puzzle Pacing',
    description: 'Balance cognitive and physical work while improving team parallelization.',
  },
  {
    id: 'clues',
    label: 'Suggest Missing Clues',
    description: 'Recommend clue support, hint logic, and fairness improvements.',
  },
  {
    id: 'starter_flow',
    label: 'Generate a Starter Flow From a Theme',
    description: 'Use a room theme to propose a practical starter puzzle map.',
  },
];

const emptyResult: CoachResult = {
  summary: '',
  strengths: [],
  risks: [],
  recommendedChanges: [],
  suggestedNodes: [],
  suggestedEdges: [],
};

function formatResult(result: CoachResult): string {
  const sections = [
    `Summary\n${result.summary}`,
    `Strengths\n${result.strengths.map((item) => `- ${item}`).join('\n') || '- None provided'}`,
    `Risks\n${result.risks.map((item) => `- ${item}`).join('\n') || '- None provided'}`,
    `Recommended Changes\n${
      result.recommendedChanges.map((item) => `- ${item}`).join('\n') || '- None provided'
    }`,
  ];

  if (result.suggestedNodes.length > 0) {
    sections.push(
      `Suggested Nodes\n${result.suggestedNodes
        .map((node) => `- ${node.label} (${node.type})${node.reason ? ` — ${node.reason}` : ''}`)
        .join('\n')}`
    );
  }

  if (result.suggestedEdges.length > 0) {
    sections.push(
      `Suggested Edges\n${result.suggestedEdges
        .map((edge) => `- ${edge.source} → ${edge.target}${edge.reason ? ` — ${edge.reason}` : ''}`)
        .join('\n')}`
    );
  }

  return sections.join('\n\n');
}

function normalizeResult(value: unknown): CoachResult {
  if (!value || typeof value !== 'object') return emptyResult;
  const data = value as Partial<CoachResult>;

  return {
    summary: typeof data.summary === 'string' ? data.summary : '',
    strengths: Array.isArray(data.strengths) ? data.strengths.filter((item) => typeof item === 'string') : [],
    risks: Array.isArray(data.risks) ? data.risks.filter((item) => typeof item === 'string') : [],
    recommendedChanges: Array.isArray(data.recommendedChanges)
      ? data.recommendedChanges.filter((item) => typeof item === 'string')
      : [],
    suggestedNodes: Array.isArray(data.suggestedNodes)
      ? data.suggestedNodes.filter(
          (node): node is SuggestedNode =>
            typeof node === 'object' &&
            node !== null &&
            typeof (node as SuggestedNode).type === 'string' &&
            typeof (node as SuggestedNode).label === 'string'
        )
      : [],
    suggestedEdges: Array.isArray(data.suggestedEdges)
      ? data.suggestedEdges.filter(
          (edge): edge is SuggestedEdge =>
            typeof edge === 'object' &&
            edge !== null &&
            typeof (edge as SuggestedEdge).source === 'string' &&
            typeof (edge as SuggestedEdge).target === 'string'
        )
      : [],
  };
}

export default function AIFlowCoachPanel({ flow }: AIFlowCoachPanelProps) {
  const [selectedAction, setSelectedAction] = useState<CoachAction>('critique');
  const [theme, setTheme] = useState('Haunted manor with hidden family secrets');
  const [result, setResult] = useState<CoachResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const nodeCount = flow.nodes.length;
  const edgeCount = flow.edges.length;
  const selectedActionDetails = useMemo(
    () => ACTIONS.find((action) => action.id === selectedAction) ?? ACTIONS[0],
    [selectedAction]
  );

  const runCoach = async () => {
    setLoading(true);
    setError('');
    setCopied(false);

    try {
      const response = await fetch('/.netlify/functions/ai-flow-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          theme: selectedAction === 'starter_flow' ? theme : undefined,
          flow,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload?.message ||
          payload?.error ||
          'The AI Flow Coach is not available yet. Check your Netlify Function and API key setup.';
        throw new Error(message);
      }

      setResult(normalizeResult(payload));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'The AI Flow Coach could not complete the request.');
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(formatResult(result));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <aside className="w-96 bg-slate-950/95 border-l border-slate-700 flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-5 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10">
            <Bot size={18} className="text-cyan-300" />
          </div>
          <div>
            <h2 className="text-slate-100 font-semibold text-sm uppercase tracking-widest">AI Flow Coach</h2>
            <p className="text-slate-500 text-xs mt-1">Secure server-side critique for escape room puzzle maps.</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider">
            <Route size={14} className="text-blue-300" />
            Current Flow
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Sending {nodeCount} nodes and {edgeCount} edges to the secure Netlify Function. API keys stay server-side.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400" htmlFor="ai-coach-action">
            Coaching Action
          </label>
          <select
            id="ai-coach-action"
            value={selectedAction}
            onChange={(event) => setSelectedAction(event.target.value as CoachAction)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
          >
            {ACTIONS.map((action) => (
              <option key={action.id} value={action.id}>
                {action.label}
              </option>
            ))}
          </select>
          <p className="text-xs leading-relaxed text-slate-500">{selectedActionDetails.description}</p>
        </div>

        {selectedAction === 'starter_flow' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400" htmlFor="ai-coach-theme">
              Room Theme
            </label>
            <textarea
              id="ai-coach-theme"
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
              placeholder="Example: 1920s speakeasy hiding a cursed artifact"
            />
          </div>
        )}

        <button
          type="button"
          onClick={runCoach}
          disabled={loading || (selectedAction === 'starter_flow' && theme.trim().length < 4)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500 bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-cyan-300"
          aria-label={`Run AI Flow Coach action: ${selectedActionDetails.label}`}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? 'Coaching…' : 'Run AI Coach'}
        </button>

        {error && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100" role="alert">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-300" />
              <div>
                <p className="font-semibold">Setup or request issue</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-100/80">{error}</p>
                <p className="mt-2 text-xs leading-relaxed text-amber-100/70">
                  Add `OPENAI_API_KEY` or `GEMINI_API_KEY` in Netlify environment variables, then redeploy.
                </p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Wand2 size={16} className="text-cyan-300" />
                Coach Results
              </div>
              <button
                type="button"
                onClick={copyResult}
                className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300"
                aria-label="Copy AI Flow Coach recommendations to clipboard"
              >
                {copied ? <CheckCircle2 size={13} className="text-emerald-300" /> : <Clipboard size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Summary</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-200">{result.summary || 'No summary returned.'}</p>
            </div>

            <ResultList title="Strengths" items={result.strengths} tone="emerald" />
            <ResultList title="Risks" items={result.risks} tone="rose" />
            <ResultList title="Recommended Changes" items={result.recommendedChanges} tone="cyan" />

            {result.suggestedNodes.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Suggested Nodes</h3>
                <div className="mt-2 space-y-2">
                  {result.suggestedNodes.map((node, index) => (
                    <div key={`${node.type}-${node.label}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                      <p className="text-xs font-semibold text-slate-200">{node.label}</p>
                      <p className="text-[11px] uppercase tracking-widest text-cyan-300">{node.type}</p>
                      {node.reason && <p className="mt-1 text-xs leading-relaxed text-slate-500">{node.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.suggestedEdges.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Suggested Edges</h3>
                <div className="mt-2 space-y-2">
                  {result.suggestedEdges.map((edge, index) => (
                    <div key={`${edge.source}-${edge.target}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                      <p className="text-xs font-semibold text-slate-200">
                        {edge.source} → {edge.target}
                      </p>
                      {edge.reason && <p className="mt-1 text-xs leading-relaxed text-slate-500">{edge.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function ResultList({ title, items, tone }: { title: string; items: string[]; tone: 'emerald' | 'rose' | 'cyan' }) {
  if (items.length === 0) return null;

  const markerColor = {
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
    cyan: 'bg-cyan-400',
  }[tone];

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</h3>
      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2 text-sm leading-relaxed text-slate-300">
            <span className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${markerColor}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
