import { Handle, Position, NodeProps } from '@xyflow/react';
import { useNodeLabel } from './useNodeLabel';

export default function MetaPuzzleNode({ id, data, selected }: NodeProps) {
  const label = typeof data.label === 'string' ? data.label : 'Meta Puzzle';
  const { editing, label: currentLabel, setLabel, startEdit, commitEdit, handleKeyDown, inputRef } =
    useNodeLabel(id, label);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ left: 0, top: '50%' }}
        className="!bg-purple-300 !border-purple-800"
      />
      <div
        className={`absolute inset-0 bg-purple-600 transition-all duration-150 ${
          selected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
        }`}
        style={{ transform: 'rotate(45deg)', borderRadius: 4 }}
      />
      <div
        onDoubleClick={startEdit}
        className="relative z-10 flex items-center justify-center text-center cursor-pointer select-none"
        style={{ width: '100%', height: '100%' }}
      >
        {editing ? (
          <textarea
            ref={inputRef}
            value={currentLabel}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-white text-center text-xs font-bold resize-none outline-none leading-tight w-20"
            rows={3}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-white text-xs font-bold leading-tight w-20 text-center">{currentLabel}</span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ right: 0, top: '50%' }}
        className="!bg-purple-300 !border-purple-800"
      />
    </div>
  );
}
