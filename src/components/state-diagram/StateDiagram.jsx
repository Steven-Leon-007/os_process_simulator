import React, { useRef, useEffect, useState, useCallback } from "react";
import { ReactFlow, Handle, Position, MarkerType, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { STATES } from '../../services/fsm'
import "./StateDiagram.css"

const getPositions = (width) => {
  if (width < 768) {

    return {
      [STATES.NEW]: { x: 50, y: 30 },
      [STATES.READY]: { x: 100, y: 150 },
      [STATES.RUNNING]: { x: width - 215, y: 150 },
      [STATES.WAITING]: { x: (width / 2) - 60, y: 300 },
      [STATES.TERMINATED]: { x: width - 165, y: 30 },
    };
  }

  return {
    [STATES.NEW]: { x: 100, y: 50 },
    [STATES.READY]: { x: 300, y: 150 },
    [STATES.RUNNING]: { x: 600, y: 150 },
    [STATES.WAITING]: { x: 450, y: 300 },
    [STATES.TERMINATED]: { x: 800, y: 50 },
  };
};


const STATE_COLORS = {
  [STATES.NEW]: "#7dd3fc",
  [STATES.READY]: "#60a5fa",
  [STATES.RUNNING]: "#34d399",
  [STATES.WAITING]: "#f59e0b",
  [STATES.TERMINATED]: "#ef4444",
};

// Componente de nodo personalizado
const StateNode = ({ data }) => {
  return (
    <div
      className="state-node"
      style={{
        backgroundColor: data.color,
      }}
    >
      <Handle type="target" position={Position.Top} className="invisible-handle" id="target-top" />
      <Handle type="source" position={Position.Top} className="invisible-handle" id="source-top" />
      <Handle type="target" position={Position.Right} className="invisible-handle" id="target-right" />
      <Handle type="source" position={Position.Right} className="invisible-handle" id="source-right" />
      <Handle type="target" position={Position.Bottom} className="invisible-handle" id="target-bottom" />
      <Handle type="source" position={Position.Bottom} className="invisible-handle" id="source-bottom" />
      <Handle type="target" position={Position.Left} className="invisible-handle" id="target-left" />
      <Handle type="source" position={Position.Left} className="invisible-handle" id="source-left" />
      <div className="state-label">{data.label}</div>
    </div>
  );
};

// Nodo que representa un proceso (rectángulo con PID y estado)
const ProcessNode = ({ data }) => {
  return (
    <div className="process-node" style={{ borderColor: data.color }}>
      <div className="process-pid">P{data.pid}</div>
      <div className="process-state">{data.state}</div>
    </div>
  );
};

const nodeTypes = {
  stateNode: StateNode,
   processNode: ProcessNode,
};

const StateDiagram = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [positions, setPositions] = useState(getPositions(window.innerWidth));

  useEffect(() => {
    const handleResize = () => {
      setPositions(getPositions(window.innerWidth));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  // Inicializar nodos y edges
  useEffect(() => {
    const initialNodes = Object.entries(STATES).map(([key, value]) => ({
      id: value,
      type: "stateNode",
      position: positions[value],
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
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#fff" },
        style: {
          stroke: "#bbb",
          strokeDasharray: "5 5",
        },
      },
      {
        id: "e2",
        source: STATES.READY,
        sourceHandle: 'source-right',
        target: STATES.RUNNING,
        targetHandle: 'target-left',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#fff" },
        style: {
          stroke: "#bbb",
          strokeDasharray: "5 5",
        },
        className: "edge-ready-running"
      },
      {
        id: "e3",
        source: STATES.RUNNING,
        sourceHandle: 'source-left',
        target: STATES.READY,
        targetHandle: 'target-right',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#fff" },
        style: {
          stroke: "#bbb",
          strokeDasharray: "5 5",
        },
        className: "edge-running-ready"

      },
      {
        id: "e4",
        source: STATES.RUNNING,
        sourceHandle: 'source-bottom',
        target: STATES.WAITING,
        targetHandle: 'target-right',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#fff" },
        style: {
          stroke: "#bbb",
          strokeDasharray: "5 5",
        },
      },
      {
        id: "e5",
        source: STATES.WAITING,
        sourceHandle: 'source-left',
        target: STATES.READY,
        targetHandle: 'target-bottom',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#fff" },
        style: {
          stroke: "#bbb",
          strokeDasharray: "5 5",
        },
      },
      {
        id: "e6",
        source: STATES.RUNNING,
        sourceHandle: 'source-right',
        target: STATES.TERMINATED,
        targetHandle: 'target-bottom',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#fff" },
        style: {
          stroke: "#bbb",
          strokeDasharray: "5 5",
        },
      },
    ];

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, []);

  const onNodesChange = useCallback(
    (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );


  return (
    <div className="sd-container">
      <div
        ref={reactFlowWrapper}
        style={{
          width: '100%',
          height: '400px',
          borderRadius: '8px'
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            setReactFlowInstance(instance);
            instance.setCenter(window.innerWidth / 2, 200, {
              zoom: 1,
              duration: 0,
            });
          }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnScroll={false}
          panOnDrag={false}
          translateExtent={[[0, 0], [window.innerWidth, 400]]}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={true}
          minZoom={1}
          maxZoom={1}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeExtent={[
            [0, 0],
            [window.innerWidth, 400],
          ]}
        />
      </div>
    </div>
  );
}

export default StateDiagram;