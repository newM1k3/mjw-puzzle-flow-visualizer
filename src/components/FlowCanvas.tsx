import { useCallback, useEffect, useState, DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  useReactFlow,
  MarkerType,
  Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { LayoutGrid } from 'lucide-react';

import StartingPointNode from './nodes/StartingPointNode';
import PluginActionNode from './nodes/PluginActionNode';
import DecodeActionNode from './nodes/DecodeActionNode';
import ResultNode from './nodes/ResultNode';
import MetaPuzzleNode from './nodes/MetaPuzzleNode';
import FinaleNode from './nodes/FinaleNode';

const nodeTypes = {
  startingPoint: StartingPointNode,
  pluginAction: PluginActionNode,
  decodeAction: DecodeActionNode,
  result: ResultNode,
  metaPuzzle: MetaPuzzleNode,
  finale: FinaleNode,
};

const DEFAULT_NODE_LABELS: Record<string, string> = {
  startingPoint: 'Starting Clue',
  pluginAction: 'Plugin Action',
  decodeAction: 'Decode Action',
  result: 'Result',
  metaPuzzle: 'Meta Puzzle',
  finale: 'ESCAPE!',
};

const DEFAULT_EDGE_OPTIONS = {
  animated: true,
  style: { stroke: '#64748b', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
};

export interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onAddNode: (node: Node) => void;
  onResetToExample: () => void;
  onNodeSelect?: (nodeId: string | null) => void;
  savedViewport?: Viewport | null;
  onViewportChange?: (viewport: Viewport) => void;
  fitOnLoad?: boolean;
}

function FlowCanvasInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect: onConnectProp,
  onAddNode,
  onResetToExample,
  onNodeSelect,
  savedViewport,
  onViewportChange,
  fitOnLoad,
}: FlowCanvasProps) {
  const { screenToFlowPosition, setViewport } = useReactFlow();
  const [viewportRestored, setViewportRestored] = useState(false);

  useEffect(() => {
    if (savedViewport && !viewportRestored) {
      setViewport(savedViewport);
      setViewportRestored(true);
    }
  }, [savedViewport, setViewport, viewportRestored]);

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      onNodeSelect?.(selectedNodes.length === 1 ? selectedNodes[0].id : null);
    },
    [onNodeSelect],
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      onAddNode({
        id: uuidv4(),
        type: nodeType,
        position,
        data: { label: DEFAULT_NODE_LABELS[nodeType] ?? nodeType },
      });
    },
    [screenToFlowPosition, onAddNode],
  );

  const isEmpty = nodes.length === 0;

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnectProp}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onSelectionChange={onSelectionChange}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        fitView={fitOnLoad}
        fitViewOptions={{ padding: 0.2 }}
        className="bg-slate-900"
        deleteKeyCode="Delete"
        connectionLineStyle={{ stroke: '#94a3b8', strokeWidth: 2 }}
        onMoveEnd={(_, viewport) => onViewportChange?.(viewport)}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
        <Controls className="!bg-slate-800 !border-slate-700 !shadow-xl" />
      </ReactFlow>

      {isEmpty && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="text-center px-8 py-10 rounded-2xl bg-slate-900/80 border border-slate-700 backdrop-blur-sm max-w-sm">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-slate-800 border border-slate-700 mx-auto mb-4">
              <LayoutGrid size={24} className="text-slate-500" />
            </div>
            <h3 className="text-slate-200 font-semibold text-base mb-2">Canvas is empty</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-5">
              Drag nodes from the left palette to start building your puzzle flow, or restore
              the example flow to see how it works.
            </p>
            <button
              onClick={onResetToExample}
              className="pointer-events-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors duration-150"
            >
              Reset to Example Flow
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FlowCanvas(props: FlowCanvasProps) {
  return (
    <div id="flow-canvas-container" className="flex-1 relative overflow-hidden">
      <FlowCanvasInner {...props} />
    </div>
  );
}
