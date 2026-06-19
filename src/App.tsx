import { useState, useCallback, useEffect, useRef, useMemo, type ReactNode, type ChangeEvent } from 'react';
import {
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Viewport,
  MarkerType,
} from '@xyflow/react';
import {
  Map,
  Save,
  FolderOpen,
  RotateCcw,
  Trash2,
  Upload,
  FileJson,
  Image,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  PanelRightOpen,
  PanelRightClose,
  SlidersHorizontal,
  BarChart2,
  Bot,
  HelpCircle,
  X,
  Keyboard,
  Monitor,
  Info,
} from 'lucide-react';

import Sidebar from './components/Sidebar';
import SavedFlowsPanel from './components/SavedFlowsPanel';
import FlowCanvas from './components/FlowCanvas';
import InspectorPanel from './components/InspectorPanel';
import ValidationPanel from './components/ValidationPanel';
import AIFlowCoachPanel from './components/AIFlowCoachPanel';
import { exportFlowToPDF } from './utils/exportPdf';
import { exportFlowToPNG } from './utils/exportImage';
import {
  loadFlow,
  saveFlow,
  exportFlowAsJson,
  parseImportedJson,
} from './utils/flowStorage';
import { pb } from './lib/pocketbase';
import { INITIAL_NODES, INITIAL_EDGES } from './utils/initialFlow';
import { analyzeGraph } from './utils/graphAnalysis';
import type { NodeMetadata, EscapeNodeType } from './types/nodeMetadata';
import type { FlowSnapshot } from './types/flow';

type SaveStatus = 'saved' | 'unsaved';
type RightTab = 'inspector' | 'metrics' | 'coach';

const APP_VERSION = '1.0.0';

const EDGE_OPTIONS = {
  animated: true,
  style: { stroke: '#64748b', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
} as const;

function getInitialState(): {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport | null;
  fitOnLoad: boolean;
} {
  const saved = loadFlow();
  if (saved) {
    return {
      nodes: saved.nodes,
      edges: saved.edges,
      viewport: saved.viewport ?? null,
      fitOnLoad: !saved.viewport,
    };
  }
  return { nodes: INITIAL_NODES, edges: INITIAL_EDGES, viewport: null, fitOnLoad: true };
}

const initial = getInitialState();

export default function App() {
  const [nodes, setNodes] = useState<Node[]>(initial.nodes);
  const [edges, setEdges] = useState<Edge[]>(initial.edges);
  const [initialViewport] = useState<Viewport | null>(initial.viewport);
  const [fitOnLoad] = useState(initial.fitOnLoad);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingPNG, setExportingPNG] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<RightTab>('inspector');
  const [showHowToUse, setShowHowToUse] = useState(false);

  const nodesRef = useRef<Node[]>(initial.nodes);
  const edgesRef = useRef<Edge[]>(initial.edges);
  const viewportRef = useRef<Viewport | null>(initial.viewport);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  const currentFlow = useMemo<FlowSnapshot>(() => ({ nodes, edges }), [nodes, edges]);

  // ── Auto-save ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setSaveStatus('unsaved');
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveFlow(nodes, edges, viewportRef.current ?? undefined);
      setSaveStatus('saved');
    }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [nodes, edges]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // SSO token handoff from the ImmersiveKit dashboard
    const token = params.get('token');
    if (token) {
      pb.authStore.save(token, null);
      pb.collection('users').authRefresh().catch(() => pb.authStore.clear());
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('help') === '1') setShowHowToUse(true);
  }, []);

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [selectedNodeId, nodes],
  );

  const warningCount = useMemo(() => analyzeGraph(nodes, edges).warnings.length, [nodes, edges]);

  // ── React Flow handlers ──────────────────────────────────────────────────
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, ...EDGE_OPTIONS }, eds));
  }, []);

  const onAddNode = useCallback((node: Node) => {
    setNodes((nds) => [...nds, node]);
  }, []);

  const onViewportChange = useCallback((viewport: Viewport) => {
    viewportRef.current = viewport;
    saveFlow(nodesRef.current, edgesRef.current, viewport);
  }, []);

  const onNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      setRightPanelOpen(true);
      setActiveTab('inspector');
    }
  }, []);

  // ── Inspector: update node data ──────────────────────────────────────────
  const onUpdateNode = useCallback(
    (nodeId: string, patch: Partial<NodeMetadata> & { type?: EscapeNodeType }) => {
      const { type: newType, ...dataPatch } = patch;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          return {
            ...n,
            ...(newType ? { type: newType } : {}),
            data: { ...n.data, ...dataPatch },
          };
        }),
      );
    },
    [],
  );

  // ── Toolbar and persistence actions ──────────────────────────────────────
  const handleSaveNow = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    saveFlow(nodes, edges, viewportRef.current ?? undefined);
    setSaveStatus('saved');
  }, [nodes, edges]);

  const handleLoadSaved = useCallback(() => {
    const saved = loadFlow();
    if (!saved) { alert('No saved flow found.'); return; }
    if (saveStatus === 'unsaved' && !window.confirm('Load saved flow? Unsaved changes will be lost.')) return;
    setNodes(saved.nodes);
    setEdges(saved.edges);
    if (saved.viewport) viewportRef.current = saved.viewport;
    setSelectedNodeId(null);
    setSaveStatus('saved');
  }, [saveStatus]);

  const handleLoadFlow = useCallback((nextFlow: FlowSnapshot) => {
    if (saveStatus === 'unsaved' && !window.confirm('Load this flow? Unsaved canvas changes will be replaced.')) return;
    setNodes(nextFlow.nodes);
    setEdges(nextFlow.edges);
    setSelectedNodeId(null);
    setSaveStatus('unsaved');
  }, [saveStatus]);

  const handleResetToExample = useCallback(() => {
    if (!window.confirm('Reset to the example flow? The current canvas will be replaced.')) return;
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    setSelectedNodeId(null);
  }, []);

  const handleClearCanvas = useCallback(() => {
    if (!window.confirm('Clear the canvas? All nodes and edges will be removed.')) return;
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
  }, []);

  const handleExportJson = useCallback(() => exportFlowAsJson(nodes, edges), [nodes, edges]);
  const handleImportJson = useCallback(() => { setImportError(null); fileInputRef.current?.click(); }, []);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = ev.target?.result;
      if (typeof raw !== 'string') return;
      const result = parseImportedJson(raw);
      if ('error' in result) { setImportError(result.error); return; }
      setNodes(result.nodes);
      setEdges(result.edges);
      if (result.viewport) viewportRef.current = result.viewport;
      setSelectedNodeId(null);
      setSaveStatus('unsaved');
      setImportError(null);
    };
    reader.readAsText(file);
  }, []);

  const handleExportPNG = useCallback(async () => {
    setExportingPNG(true);
    try { await exportFlowToPNG('flow-canvas-container', 'puzzle-flow.png'); }
    finally { setExportingPNG(false); }
  }, []);

  const handleExportPDF = useCallback(async () => {
    setExportingPDF(true);
    try { await exportFlowToPDF('flow-canvas-container', 'puzzle-flow.pdf'); }
    finally { setExportingPDF(false); }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isTyping) return;

      if (event.key === '?') {
        event.preventDefault();
        setShowHowToUse(true);
        return;
      }

      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        handleSaveNow();
      } else if (key === 'i') {
        event.preventDefault();
        handleImportJson();
      } else if (key === 'e') {
        event.preventDefault();
        handleExportJson();
      } else if (key === 'r') {
        event.preventDefault();
        handleResetToExample();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSaveNow, handleImportJson, handleExportJson, handleResetToExample]);

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-700/80 flex-shrink-0 z-10">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-blue-500/20 border border-blue-500/40" aria-hidden="true">
            <Map size={14} className="text-blue-400" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-slate-100 font-bold text-xs leading-tight tracking-tight">
              Escape Room Puzzle Flow Visualizer
            </h1>
            <p className="text-[10px] text-slate-500 leading-tight">v{APP_VERSION} · production ready</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-1 overflow-x-auto min-w-0 px-2" role="toolbar" aria-label="Puzzle flow actions">
          <div className="flex items-center gap-1 flex-shrink-0">
            <ToolbarBtn icon={<Save size={13} />} label="Save" shortcut="Ctrl/Cmd+S" onClick={handleSaveNow} />
            <ToolbarBtn icon={<FolderOpen size={13} />} label="Load Saved" onClick={handleLoadSaved} />
            <ToolbarBtn icon={<RotateCcw size={13} />} label="Reset" shortcut="Ctrl/Cmd+R" onClick={handleResetToExample} />
            <ToolbarBtn icon={<Trash2 size={13} />} label="Clear" onClick={handleClearCanvas} variant="danger" />
          </div>
          <div className="w-px h-5 bg-slate-700 mx-1 flex-shrink-0" aria-hidden="true" />
          <div className="flex items-center gap-1 flex-shrink-0">
            <ToolbarBtn icon={<Upload size={13} />} label="Import JSON" shortcut="Ctrl/Cmd+I" onClick={handleImportJson} />
            <ToolbarBtn icon={<FileJson size={13} />} label="Export JSON" shortcut="Ctrl/Cmd+E" onClick={handleExportJson} />
            <ToolbarBtn icon={<Image size={13} />} label={exportingPNG ? 'Exporting PNG…' : 'Export PNG'} onClick={handleExportPNG} disabled={exportingPNG} />
            <ToolbarBtn icon={<FileText size={13} />} label={exportingPDF ? 'Exporting PDF…' : 'Export PDF'} onClick={handleExportPDF} disabled={exportingPDF} variant="primary" />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <SaveStatusBadge status={saveStatus} />
          <button
            onClick={() => setShowHowToUse(true)}
            className="flex items-center justify-center w-7 h-7 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
            title="Open How to Use guide (?)"
            aria-label="Open How to Use guide"
          >
            <HelpCircle size={13} />
          </button>
          <button
            onClick={() => setRightPanelOpen((v) => !v)}
            className="flex items-center justify-center w-7 h-7 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
            title={rightPanelOpen ? 'Hide right panel' : 'Show right panel'}
            aria-label={rightPanelOpen ? 'Hide inspector, metrics, and AI coach panel' : 'Show inspector, metrics, and AI coach panel'}
            aria-expanded={rightPanelOpen}
          >
            {rightPanelOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
          </button>
        </div>
      </header>

      <div className="lg:hidden flex items-start gap-3 px-4 py-3 bg-amber-950/70 border-b border-amber-700/60 text-amber-100 text-xs">
        <Monitor size={16} className="mt-0.5 flex-shrink-0 text-amber-300" aria-hidden="true" />
        <div>
          <p className="font-semibold">Desktop recommended for editing.</p>
          <p className="text-amber-200/80">Small screens are best for review and export. Use a laptop or desktop for precise drag-and-drop flow editing.</p>
        </div>
      </div>

      {importError && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-rose-900/50 border-b border-rose-700/60 text-rose-300 text-xs" role="alert">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span className="flex-1">{importError}</span>
          <button onClick={() => setImportError(null)} className="text-rose-400 hover:text-rose-200 flex-shrink-0 font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 rounded" aria-label="Dismiss import error">Dismiss</button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} aria-label="Import puzzle flow JSON file" />

      <main className="flex flex-1 overflow-hidden" aria-label="Puzzle flow visual editor">
        <ReactFlowProvider>
          <Sidebar />
          <SavedFlowsPanel currentFlow={currentFlow} onLoadFlow={handleLoadFlow} />
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onAddNode={onAddNode}
            onResetToExample={handleResetToExample}
            onNodeSelect={onNodeSelect}
            savedViewport={initialViewport}
            onViewportChange={onViewportChange}
            fitOnLoad={fitOnLoad}
          />

          {rightPanelOpen && (
            <aside
              className="w-96 flex-shrink-0 bg-slate-850 border-l border-slate-700 flex flex-col overflow-hidden hidden xl:flex"
              style={{ backgroundColor: '#0f1929' }}
              aria-label="Inspector, metrics, and AI coach panel"
            >
              <div className="flex border-b border-slate-700 flex-shrink-0" role="tablist" aria-label="Right panel sections">
                <TabButton
                  active={activeTab === 'inspector'}
                  onClick={() => setActiveTab('inspector')}
                  icon={<SlidersHorizontal size={12} />}
                  label="Inspector"
                />
                <TabButton
                  active={activeTab === 'metrics'}
                  onClick={() => setActiveTab('metrics')}
                  icon={<BarChart2 size={12} />}
                  label="Metrics"
                  badge={warningCount > 0 ? warningCount : undefined}
                />
                <TabButton
                  active={activeTab === 'coach'}
                  onClick={() => setActiveTab('coach')}
                  icon={<Bot size={12} />}
                  label="Coach"
                />
              </div>

              <div className="flex-1 overflow-hidden">
                {activeTab === 'inspector' && (
                  <InspectorPanel
                    selectedNode={selectedNode}
                    onUpdateNode={onUpdateNode}
                  />
                )}
                {activeTab === 'metrics' && <ValidationPanel nodes={nodes} edges={edges} />}
                {activeTab === 'coach' && <AIFlowCoachPanel flow={currentFlow} />}
              </div>
            </aside>
          )}
        </ReactFlowProvider>
      </main>

      <footer className="hidden sm:flex items-center justify-between px-4 py-1.5 border-t border-slate-800 bg-slate-950 text-[10px] text-slate-500 flex-shrink-0">
        <span>v{APP_VERSION} · MJW Puzzle Flow Visualizer</span>
        <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">?</kbd> for shortcuts and onboarding tips.</span>
      </footer>

      {showHowToUse && <HowToUseModal onClose={() => setShowHowToUse(false)} version={APP_VERSION} />}
    </div>
  );
}

interface ToolbarBtnProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger';
  shortcut?: string;
}

function ToolbarBtn({ icon, label, onClick, disabled, variant = 'default', shortcut }: ToolbarBtnProps) {
  const base = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all duration-150 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400';
  const variants = {
    default: 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white',
    primary: 'bg-blue-600 hover:bg-blue-500 border-blue-500 hover:border-blue-400 text-white shadow-sm shadow-blue-900/40',
    danger:  'bg-slate-800 hover:bg-rose-900/40 border-slate-700 hover:border-rose-700/60 text-slate-400 hover:text-rose-300',
  };
  return (
    <button
      className={`${base} ${variants[variant]}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={shortcut ? `${label}. Shortcut: ${shortcut}` : label}
      title={shortcut ? `${label} (${shortcut})` : label}
      type="button"
    >
      <span aria-hidden="true">{icon}</span>
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  const cfg: Record<SaveStatus, { icon: ReactNode; text: string; cls: string }> = {
    saved:   { icon: <CheckCircle2 size={12} />, text: 'Saved',   cls: 'text-emerald-400' },
    unsaved: { icon: <Clock size={12} />,        text: 'Unsaved', cls: 'text-amber-400' },
  };
  const { icon, text, cls } = cfg[status];
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${cls}`} aria-live="polite" aria-label={`Flow status: ${text}`}>
      <span aria-hidden="true">{icon}</span>
      <span className="hidden sm:inline">{text}</span>
    </div>
  );
}

function TabButton({
  active, onClick, icon, label, badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        active
          ? 'border-blue-500 text-blue-400 bg-blue-500/5'
          : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
      }`}
      role="tab"
      aria-selected={active}
      aria-label={badge ? `${label}, ${badge} warnings` : label}
      type="button"
    >
      <span aria-hidden="true">{icon}</span>
      {label}
      {badge !== undefined && (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold" aria-hidden="true">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

function HowToUseModal({ onClose, version }: { onClose: () => void; version: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="how-to-use-title">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-700 bg-slate-900 px-5 py-4">
          <div>
            <h2 id="how-to-use-title" className="text-lg font-bold text-slate-100">How to Use the Puzzle Flow Visualizer</h2>
            <p className="text-xs text-slate-500">Version {version} · desktop editing recommended</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Close How to Use guide"
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 text-sm text-slate-300">
          <section className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-4">
            <div className="flex items-start gap-3">
              <Info size={18} className="mt-0.5 text-blue-300" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-blue-100">Recommended first pass</h3>
                <p className="mt-1 text-blue-100/80">Drag a starting clue onto the canvas, connect each clue to its outcome, inspect warnings in Metrics, then save locally or export JSON before major revisions.</p>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section>
              <h3 className="mb-2 font-semibold text-slate-100">Core workflow</h3>
              <ol className="list-decimal space-y-2 pl-5 text-slate-400">
                <li>Drag node types from the left palette onto the canvas.</li>
                <li>Connect nodes to represent clue dependency, solve order, and payoff.</li>
                <li>Select a node to edit design metadata in the Inspector.</li>
                <li>Use Metrics to find pacing, fairness, and graph-structure warnings.</li>
                <li>Use Saved Flows, JSON export, PNG, or PDF to preserve reviewable versions.</li>
              </ol>
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-100"><Keyboard size={15} aria-hidden="true" /> Keyboard shortcuts</h3>
              <dl className="space-y-2 text-slate-400">
                <ShortcutRow keys="Delete / Backspace" action="Delete selected canvas items" />
                <ShortcutRow keys="Mouse wheel / trackpad" action="Zoom the canvas" />
                <ShortcutRow keys="Space + drag or canvas drag" action="Pan the canvas" />
                <ShortcutRow keys="Ctrl/Cmd + S" action="Save the current flow locally" />
                <ShortcutRow keys="Ctrl/Cmd + I" action="Import flow JSON" />
                <ShortcutRow keys="Ctrl/Cmd + E" action="Export flow JSON" />
                <ShortcutRow keys="Ctrl/Cmd + R" action="Reset to the example flow" />
                <ShortcutRow keys="?" action="Open this guide" />
              </dl>
            </section>
          </div>

          <section className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4">
            <h3 className="font-semibold text-amber-100">Mobile and tablet guidance</h3>
            <p className="mt-1 text-amber-100/80">The app remains readable on smaller screens, but precise graph editing is intentionally desktop recommended. Use mobile for review, coaching, and export checks; use a laptop or desktop for drag-and-drop editing.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, action }: { keys: string; action: string }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-3">
      <dt><kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-200">{keys}</kbd></dt>
      <dd>{action}</dd>
    </div>
  );
}
