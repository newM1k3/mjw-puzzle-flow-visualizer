import { Handle, Position, NodeProps } from '@xyflow/react';
import { useNodeLabel } from './useNodeLabel';

export default function FinaleNode({ id, data, selected }: NodeProps) {
  const label = typeof data.label === 'string' ? data.label : 'ESCAPE!';
  const { editing, label: currentLabel, setLabel, startEdit, commitEdit, handleKeyDown, inputRef } =
    useNodeLabel(id, label);

  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} className="!bg-blue-200 !border-blue-700" />
      <div
        onDoubleClick={startEdit}
        className={`w-32 h-24 rounded-lg bg-blue-500 text-white border-4 border-blue-300 flex items-center justify-center text-center font-black uppercase tracking-wider cursor-pointer select-none transition-all duration-150 shadow-lg shadow-blue-500/40 ${
          selected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
        }`}
      >
        {editing ? (
          <textarea
            ref={inputRef}
            value={currentLabel}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-white text-center text-xs font-black uppercase tracking-wider w-full resize-none outline-none leading-tight"
            rows={3}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm leading-tight px-1">{currentLabel}</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-blue-200 !border-blue-700" />
    </div>
  );
}
