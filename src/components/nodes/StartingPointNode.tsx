import { Handle, Position, NodeProps } from '@xyflow/react';
import { useNodeLabel } from './useNodeLabel';

export default function StartingPointNode({ id, data, selected }: NodeProps) {
  const label = typeof data.label === 'string' ? data.label : 'Starting Clue';
  const { editing, label: currentLabel, setLabel, startEdit, commitEdit, handleKeyDown, inputRef } =
    useNodeLabel(id, label);

  return (
    <div className="relative flex items-center justify-center">
      <Handle type="target" position={Position.Top} className="!bg-yellow-300 !border-yellow-600" />
      <div
        onDoubleClick={startEdit}
        className={`w-24 h-24 rounded-full bg-yellow-400 text-yellow-950 flex items-center justify-center text-center font-bold p-2 cursor-pointer select-none transition-all duration-150 ${
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
            className="bg-transparent text-yellow-950 text-center text-xs font-bold w-full resize-none outline-none leading-tight"
            rows={3}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-xs leading-tight">{currentLabel}</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-yellow-300 !border-yellow-600" />
    </div>
  );
}
