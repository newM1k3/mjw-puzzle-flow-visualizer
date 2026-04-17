interface NodeDefinition {
  type: string;
  label: string;
  description: string;
  preview: React.ReactNode;
}

const NODE_DEFINITIONS: NodeDefinition[] = [
  {
    type: 'startingPoint',
    label: 'Starting Point',
    description: 'An easily discovered prop or clue that begins a path.',
    preview: (
      <div className="w-14 h-14 rounded-full bg-yellow-400 text-yellow-950 flex items-center justify-center text-center font-bold text-[10px] p-1 leading-tight">
        Start
      </div>
    ),
  },
  {
    type: 'pluginAction',
    label: 'Plugin Action',
    description: 'Simple physical task (e.g. unlock a padlock). Green for go.',
    preview: (
      <div className="w-14 h-14 rounded-md bg-emerald-500 text-white flex items-center justify-center text-center font-bold text-[10px] p-1 leading-tight">
        Plugin
      </div>
    ),
  },
  {
    type: 'decodeAction',
    label: 'Decode Action',
    description: 'Brain work that slows teams down. Red for slow.',
    preview: (
      <div className="w-14 h-14 rounded-md bg-rose-500 text-white flex items-center justify-center text-center font-bold text-[10px] p-1 leading-tight">
        Decode
      </div>
    ),
  },
  {
    type: 'result',
    label: 'Result',
    description: 'A gated prop or piece of information gained from an action.',
    preview: (
      <div className="w-16 h-10 rounded-xl bg-slate-600 text-white flex items-center justify-center text-center font-medium text-[10px] p-1 leading-tight">
        Result
      </div>
    ),
  },
  {
    type: 'metaPuzzle',
    label: 'Meta Puzzle',
    description: 'Convergence puzzle requiring multiple items from different paths.',
    preview: (
      <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
        <div
          className="absolute inset-0 bg-purple-600"
          style={{ transform: 'rotate(45deg)', borderRadius: 3 }}
        />
        <span className="relative z-10 text-white font-bold text-[10px]">Meta</span>
      </div>
    ),
  },
  {
    type: 'finale',
    label: 'Finale',
    description: 'The final escape state. The end of the game.',
    preview: (
      <div className="w-16 h-10 rounded-lg bg-blue-500 text-white border-2 border-blue-300 flex items-center justify-center font-black uppercase tracking-wide text-[9px]">
        ESCAPE!
      </div>
    ),
  },
];

export default function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-72 bg-slate-800/80 border-r border-slate-700 flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-5 pb-3 border-b border-slate-700">
        <h2 className="text-slate-200 font-semibold text-sm uppercase tracking-widest">Node Palette</h2>
        <p className="text-slate-500 text-xs mt-1">Drag nodes onto the canvas to build your flow.</p>
      </div>

      <div className="flex-1 py-3 px-3 space-y-2">
        {NODE_DEFINITIONS.map((node) => (
          <div
            key={node.type}
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
            className="flex items-center gap-3 px-3 py-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700/70 hover:border-slate-600 cursor-grab active:cursor-grabbing transition-all duration-150 group"
          >
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16">
              {node.preview}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 font-semibold text-xs leading-tight">{node.label}</p>
              <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">{node.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-4 border-t border-slate-700">
        <p className="text-slate-600 text-[10px] leading-relaxed">
          Double-click any node on the canvas to edit its label inline.
        </p>
      </div>
    </aside>
  );
}
