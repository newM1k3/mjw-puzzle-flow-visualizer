import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import { INITIAL_NODES, INITIAL_EDGES } from './utils/initialFlow';
import { analyzeGraph } from './utils/graphAnalysis';
import type { NodeMetadata, EscapeNodeType } from './types/nodeMetadata';
import type { FlowSnapshot } from './types/flow';

type SaveStatus = 'saved' | 'unsaved';
type RightTab = 'inspector' | 'metrics' | 'coach';

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

  // Derived: selected node object
  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [selectedNodeId, nodes],
  );

  // Derived: warning count badge
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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-700/80 flex-shrink-0 z-10">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-blue-500/20 border border-blue-500/40">
            <Map size={14} className="text-blue-400" />
          </div>
          <h1 className="text-slate-100 font-bold text-xs leading-tight tracking-tight hidden sm:block">
            Escape Room Puzzle Flow Visualizer
          </h1>
        </div>

        <div className="flex items-center gap-1 flex-1 overflow-x-auto min-w-0 px-2">
          <div className="flex items-center gap-1 flex-shrink-0">
            <ToolbarBtn icon={<Save size={13} />} label="Save" onClick={handleSaveNow} />
            <ToolbarBtn icon={<FolderOpen size={13} />} label="Load Saved" onClick={handleLoadSaved} />
            <ToolbarBtn icon={<RotateCcw size={13} />} label="Reset" onClick={handleResetToExample} />
            <ToolbarBtn icon={<Trash2 size={13} />} label="Clear" onClick={handleClearCanvas} variant="danger" />
          </div>
          <div className="w-px h-5 bg-slate-700 mx-1 flex-shrink-0" />
          <div className="flex items-center gap-1 flex-shrink-0">
            <ToolbarBtn icon={<Upload size={13} />} label="Import JSON" onClick={handleImportJson} />
            <ToolbarBtn icon={<FileJson size={13} />} label="Export JSON" onClick={handleExportJson} />
            <ToolbarBtn icon={<Image size={13} />} label={exportingPNG ? 'Exporting…' : 'Export PNG'} onClick={handleExportPNG} disabled={exportingPNG} />
            <ToolbarBtn icon={<FileText size={13} />} label={exportingPDF ? 'Exporting…' : 'Export PDF'} onClick={handleExportPDF} disabled={exportingPDF} variant="primary" />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <SaveStatusBadge status={saveStatus} />
          <button
            onClick={() => setRightPanelOpen((v) => !v)}
            className="flex items-center justify-center w-7 h-7 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title={rightPanelOpen ? 'Hide panel' : 'Show panel'}
          >
            {rightPanelOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
          </button>
        </div>
      </header>

      {/* Import error banner */}
      {importError && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-rose-900/50 border-b border-rose-700/60 text-rose-300 text-xs">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{importError}</span>
          <button onClick={() => setImportError(null)} className="text-rose-400 hover:text-rose-200 flex-shrink-0 font-medium">Dismiss</button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
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

          {/* Right Panel */}
          {rightPanelOpen && (
            <div className="w-96 flex-shrink-0 bg-slate-850 border-l border-slate-700 flex flex-col overflow-hidden"
              style={{ backgroundColor: '#0f1929' }}>
              {/* Tab bar */}
              <div className="flex border-b border-slate-700 flex-shrink-0">
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

              {/* Tab content */}
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
            </div>
          )}
        </ReactFlowProvider>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ToolbarBtnProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger';
}

function ToolbarBtn({ icon, label, onClick, disabled, variant = 'default' }: ToolbarBtnProps) {
  const base = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all duration-150 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    default: 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white',
    primary: 'bg-blue-600 hover:bg-blue-500 border-blue-500 hover:border-blue-400 text-white shadow-sm shadow-blue-900/40',
    danger:  'bg-slate-800 hover:bg-rose-900/40 border-slate-700 hover:border-rose-700/60 text-slate-400 hover:text-rose-300',
  };
  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick} disabled={disabled}>
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  const cfg: Record<SaveStatus, { icon: React.ReactNode; text: string; cls: string }> = {
    saved:   { icon: <CheckCircle2 size={12} />, text: 'Saved',   cls: 'text-emerald-400' },
    unsaved: { icon: <Clock size={12} />,        text: 'Unsaved', cls: 'text-amber-400' },
  };
  const { icon, text, cls } = cfg[status];
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${cls}`}>
      {icon}
      <span className="hidden sm:inline">{text}</span>
    </div>
  );
}

function TabButton({
  active, onClick, icon, label, badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors duration-150 ${
        active
          ? 'border-blue-500 text-blue-400 bg-blue-500/5'
          : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}
