import { useState, useCallback, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';

export function useNodeLabel(id: string, initialLabel: string) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(initialLabel);
  const { setNodes } = useReactFlow();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const startEdit = useCallback(() => {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  }, []);

  const commitEdit = useCallback(() => {
    setEditing(false);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label } } : n
      )
    );
  }, [id, label, setNodes]);

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
    [commitEdit, initialLabel]
  );

  return { editing, label, setLabel, startEdit, commitEdit, handleKeyDown, inputRef };
}
