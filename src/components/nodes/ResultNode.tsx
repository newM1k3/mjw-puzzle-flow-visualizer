import { Handle, Position, NodeProps } from '@xyflow/react';
import { useNodeLabel } from './useNodeLabel';

export default function ResultNode({ id, data, selected }: NodeProps) {
  const label = typeof data.label === 'string' ? data.label : 'Result';
  const { editing, label: currentLabel, setLabel, startEdit, commitEdit, handleKeyDown, inputRef } =
    useNodeLabel(id, label);

  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} className="!bg-slate-400 !border-slate-700" />
      <div
        onDoubleClick={startEdit}
        className={`w-32 h-20 rounded-xl bg-slate-600 text-white flex items-center justify-center text-center font-medium p-2 cursor-pointer select-none transition-all duration-150 ${
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
            className="bg-transparent text-white text-center text-xs font-medium w-full resize-none outline-none leading-tight"
            rows={3}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-xs leading-tight">{currentLabel}</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-slate-400 !border-slate-700" />
    </div>
  );
}
