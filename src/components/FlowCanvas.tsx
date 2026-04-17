import { useCallback, useRef, useEffect, DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  useReactFlow,
  ReactFlowInstance,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

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

const defaultNodeLabels: Record<string, string> = {
  startingPoint: 'Starting Clue',
  pluginAction: 'Plugin Action',
  decodeAction: 'Decode Action',
  result: 'Result',
  metaPuzzle: 'Meta Puzzle',
  finale: 'ESCAPE!',
};

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#64748b', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
};

const initialNodes: Node[] = [
  {
    id: 'intro-1',
    type: 'startingPoint',
    position: { x: 80, y: 200 },
    data: { label: 'Starting Clue' },
  },
  {
    id: 'intro-2',
    type: 'decodeAction',
    position: { x: 260, y: 195 },
    data: { label: 'Cipher Decode' },
  },
  {
    id: 'intro-3',
    type: 'result',
    position: { x: 460, y: 205 },
    data: { label: 'Safe Combo' },
  },
  {
    id: 'intro-4',
    type: 'pluginAction',
    position: { x: 460, y: 80 },
    data: { label: 'Unlock Safe' },
  },
  {
    id: 'intro-5',
    type: 'metaPuzzle',
    position: { x: 660, y: 180 },
    data: { label: 'Meta Puzzle' },
  },
  {
    id: 'intro-6',
    type: 'finale',
    position: { x: 880, y: 193 },
    data: { label: 'ESCAPE!' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'intro-1', target: 'intro-2', animated: true, style: { stroke: '#64748b', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' } },
  { id: 'e2-3', source: 'intro-2', target: 'intro-3', animated: true, style: { stroke: '#64748b', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' } },
  { id: 'e3-5', source: 'intro-3', target: 'intro-5', animated: true, style: { stroke: '#64748b', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' } },
  { id: 'e4-5', source: 'intro-4', target: 'intro-5', animated: true, style: { stroke: '#64748b', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' } },
  { id: 'e5-6', source: 'intro-5', target: 'intro-6', animated: true, style: { stroke: '#64748b', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' } },
];

interface FlowCanvasProps {
  onClear: () => void;
  clearTrigger: number;
}

function FlowCanvasInner({ clearTrigger }: { clearTrigger: number }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setNodes([]);
    setEdges([]);
  }, [clearTrigger, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: '#64748b', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: uuidv4(),
        type: nodeType,
        position,
        data: { label: defaultNodeLabels[nodeType] || nodeType },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDragOver={onDragOver}
      onDrop={onDrop}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      onInit={(instance) => { reactFlowInstanceRef.current = instance; }}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      className="bg-slate-900"
      deleteKeyCode="Delete"
      connectionLineStyle={{ stroke: '#94a3b8', strokeWidth: 2 }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        color="#334155"
      />
      <Controls className="!bg-slate-800 !border-slate-700 !shadow-xl" />
    </ReactFlow>
  );
}

export default function FlowCanvas({ clearTrigger }: { clearTrigger: number }) {
  return (
    <div id="flow-canvas-container" className="flex-1 relative overflow-hidden">
      <FlowCanvasInner clearTrigger={clearTrigger} />
    </div>
  );
}
