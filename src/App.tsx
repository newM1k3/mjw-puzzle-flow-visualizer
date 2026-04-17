import { useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Trash2, Download, Map } from 'lucide-react';
import Sidebar from './components/Sidebar';
import FlowCanvas from './components/FlowCanvas';
import { exportFlowToPDF } from './utils/exportPdf';

export default function App() {
  const [clearTrigger, setClearTrigger] = useState(0);
  const [exporting, setExporting] = useState(false);

  const handleClear = useCallback(() => {
    if (window.confirm('Clear the entire canvas? This cannot be undone.')) {
      setClearTrigger((t) => t + 1);
    }
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    await exportFlowToPDF('flow-canvas-container', 'puzzle-flow.pdf');
    setExporting(false);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      <header className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-700/80 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40">
            <Map size={16} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-slate-100 font-bold text-sm leading-tight tracking-tight">
              Escape Room Puzzle Flow Visualizer
            </h1>
            <p className="text-slate-500 text-[11px] leading-none mt-0.5">
              Design your game's puzzle flow — drag, connect, export
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-medium transition-all duration-150"
          >
            <Trash2 size={13} />
            Clear Canvas
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed border border-blue-500 hover:border-blue-400 text-white text-xs font-medium transition-all duration-150 shadow-md shadow-blue-900/40"
          >
            <Download size={13} />
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <ReactFlowProvider>
          <Sidebar />
          <FlowCanvas clearTrigger={clearTrigger} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
