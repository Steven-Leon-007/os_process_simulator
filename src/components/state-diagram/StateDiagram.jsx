import React, { useRef, useEffect, useState, useCallback } from "react";
import { ReactFlow, Handle, Position, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { STATES } from '../../services/fsm'
import "./StateDiagram.css"

const STATE_POSITIONS = {
  [STATES.NEW]: { x: 100, y: 50 },
  [STATES.READY]: { x: 300, y: 150 },
  [STATES.RUNNING]: { x: 600, y: 150 },
  [STATES.WAITING]: { x: 450, y: 300 },
  [STATES.TERMINATED]: { x: 800, y: 50 },
};

const STATE_COLORS = {
  [STATES.NEW]: "#7dd3fc",
  [STATES.READY]: "#60a5fa",
  [STATES.RUNNING]: "#34d399",
  [STATES.WAITING]: "#f59e0b",
  [STATES.TERMINATED]: "#ef4444",
};

// Componente de nodo personalizado
const StateNode = ({ data, selected }) => {
  return (
    <div
      className="state-node"
      style={{
        backgroundColor: data.color,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="invisible-handle"
        id="target-top"
      />
      <Handle
        type="source"
        position={Position.Top}
        className="invisible-handle"
        id="source-top"
      />

      <Handle
        type="target"
        position={Position.Right}
        className="invisible-handle"
        id="target-right"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="invisible-handle"
        id="source-right"
      />

      <Handle
        type="target"
        position={Position.Bottom}
        className="invisible-handle"
        id="target-bottom"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="invisible-handle"
        id="source-bottom"
      />

      <Handle
        type="target"
        position={Position.Left}
        className="invisible-handle"
        id="target-left"
      />
      <Handle
        type="source"
        position={Position.Left}
        className="invisible-handle"
        id="source-left"
      />

      <div className="state-label">{data.label}</div>
    </div>
  );
};

const nodeTypes = {
  stateNode: StateNode,
};

const StateDiagram = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Inicializar nodos y edges
  useEffect(() => {
    const initialNodes = Object.entries(STATES).map(([key, value]) => ({
      id: value,
      type: "stateNode",
      position: STATE_POSITIONS[value],
      data: {
        label: value,
        color: STATE_COLORS[value],
        id: value
      },
    }));

    // Definir las conexiones entre estados
    const initialEdges = [
      {
        id: "e1",
        source: STATES.NEW,
        sourceHandle: 'source-bottom',
        target: STATES.READY,
        targetHandle: 'target-left',
        markerEnd: {type: MarkerType.ArrowClosed, color: "#fff"}
      },
      {
        id: "e2",
        source: STATES.READY,
        sourceHandle: 'source-right',
        target: STATES.RUNNING,
        targetHandle: 'target-left',
        markerEnd: {type: MarkerType.ArrowClosed, color: "#fff"}
      },
      {
        id: "e3",
        source: STATES.RUNNING,
        sourceHandle: 'source-left',
        target: STATES.READY,
        targetHandle: 'target-right',
        markerEnd: {type: MarkerType.ArrowClosed, color: "#fff"}
      },
      {
        id: "e4",
        source: STATES.RUNNING,
        sourceHandle: 'source-bottom',
        target: STATES.WAITING,
        targetHandle: 'target-right',
        markerEnd: {type: MarkerType.ArrowClosed, color: "#fff"}
      },
      {
        id: "e5",
        source: STATES.WAITING,
        sourceHandle: 'source-left',
        target: STATES.READY,
        targetHandle: 'target-bottom',
        markerEnd: {type: MarkerType.ArrowClosed, color: "#fff"}
      },
      {
        id: "e6",
        source: STATES.RUNNING,
        sourceHandle: 'source-right',
        target: STATES.TERMINATED,
        targetHandle: 'target-bottom',
        markerEnd: {type: MarkerType.ArrowClosed, color: "#fff"}
      },
    ];

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, []);

  return (
    <div className="sd-container">
      <div
        ref={reactFlowWrapper}
        style={{
          width: '100%',
          height: '400px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px'
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={setReactFlowInstance}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnScroll={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={true}
          minZoom={1}
          maxZoom={1}
        />
      </div>
    </div>
  );
}

export default StateDiagram;