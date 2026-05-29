import { useState, useCallback, useRef, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

export function useNodeLabel(id: string, initialLabel: string) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(initialLabel);
  const { updateNodeData } = useReactFlow();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync when the label is updated externally (e.g. from the Inspector panel)
  useEffect(() => {
    if (!editing) setLabel(initialLabel);
  }, [initialLabel, editing]);

  const startEdit = useCallback(() => {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  }, []);

  const commitEdit = useCallback(() => {
    setEditing(false);
    updateNodeData(id, { label });
  }, [id, label, updateNodeData]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commitEdit();
      }
      if (e.key === 'Escape') {
        setEditing(false);
        setLabel(initialLabel);
      }
    },
    [commitEdit, initialLabel],
  );

  return { editing, label, setLabel, startEdit, commitEdit, handleKeyDown, inputRef };
}
