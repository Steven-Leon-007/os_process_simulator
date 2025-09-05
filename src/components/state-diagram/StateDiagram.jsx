import React, { useRef, useEffect, useState, useCallback } from "react";
import { ReactFlow, Handle, Position, MarkerType, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { STATES } from '../../services/fsm'
import "./StateDiagram.css"
import { useSim } from "../../context/SimulationContext";

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
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [positions, setPositions] = useState(getPositions(window.innerWidth));
  const [positionOverrides, setPositionOverrides] = useState({});
  const [processPositionOverrides, setProcessPositionOverrides] = useState({});

  // nodos base (estados del sistema)
  const [baseNodes, setBaseNodes] = useState([]);
  // nodos combinados (estados + procesos)
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const { state: simState, admit, assignCPU, terminate, preempt, requestIO, ioComplete } = useSim();
  const [menu, setMenu] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("stateNodePositions");
      if (saved) setPositionOverrides(JSON.parse(saved));

      const savedProcessPositions = localStorage.getItem("processNodePositions");
      if (savedProcessPositions) setProcessPositionOverrides(JSON.parse(savedProcessPositions));
    } catch (e) {
      console.warn("no se pudieron cargar posiciones guardadas", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("stateNodePositions", JSON.stringify(positionOverrides));
      localStorage.setItem("processNodePositions", JSON.stringify(processPositionOverrides));
    } catch (e) {
      console.warn("no se pudieron guardar posiciones", e);
    }
  }, [positionOverrides, processPositionOverrides]);

  useEffect(() => {
    const handleResize = () => {
      setPositions(getPositions(window.innerWidth));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const initialNodes = Object.entries(STATES).map(([key, value]) => ({
      id: value,
      type: "stateNode",
      // si el usuario movió el nodo, usamos el override; si no, la posición por defecto
      position: positionOverrides[value] || positions[value],
      data: {
        label: value,
        color: STATE_COLORS[value],
        id: value
      },
      draggable: true,
    }));

    setBaseNodes(initialNodes);
  }, [positions, positionOverrides]);

  useEffect(() => {
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

    setEdges(initialEdges);
  }, []);

  useEffect(() => {
    // agrupar procesos por estado para posicionarlos en filas/columnas debajo del estado correspondiente
    const grouped = {};
    simState.processes.forEach((p) => {
      const st = p.state;
      if (!grouped[st]) grouped[st] = [];
      grouped[st].push(p);
    });

    const processNodes = [];
    Object.entries(grouped).forEach(([stateName, arr]) => {
      var horizontalGap = (stateName == "Terminated") ? 60 : 42;
      var perRowProcesses = (stateName == "Terminated") ? 2 : 3;

      arr.forEach((proc, idx) => {
        const pidStr = proc.pid.toString();

        // Si ya tenemos una posición guardada para este proceso, la usamos
        if (processPositionOverrides[pidStr]) {
          processNodes.push({
            id: pidStr,
            type: "processNode",
            position: processPositionOverrides[pidStr],
            data: {
              pid: proc.pid,
              state: proc.state,
              index: idx,
              color: STATE_COLORS[proc.state] || '#999'
            },
            draggable: true,
          });
          return;
        }

        // Si no hay posición guardada, calcularla basada en el estado
        const basePos = positionOverrides[stateName] || positions[stateName] || { x: 100, y: 100 };
        const perRow = perRowProcesses;
        const gapX = horizontalGap;
        const gapY = 42;
        const offsetX = (idx % perRow) * gapX;
        const offsetY = Math.floor(idx / perRow) * gapY + 70;

        processNodes.push({
          id: pidStr,
          type: "processNode",
          position: { x: basePos.x + offsetX, y: basePos.y + offsetY },
          data: {
            pid: proc.pid,
            state: proc.state,
            index: idx,
            color: STATE_COLORS[proc.state] || '#999'
          },
          draggable: true,
        });
      });
    });

    // los nodes totales son nodos base + procesos
    setNodes([...baseNodes, ...processNodes]);
  }, [simState.processes, baseNodes, positions, positionOverrides, processPositionOverrides]);

  const onNodesChange = useCallback(
    (changes) => {
      setNodes((ns) => {
        let updatedNodes = applyNodeChanges(changes, ns);

        // Buscar cambios en nodos
        changes.forEach((change) => {
          if (change.type === "position" || change.type === "positioned") {
            const movedNode = ns.find((n) => n.id === change.id);

            if (movedNode?.type === "stateNode") {
              const stateName = movedNode.data.id;

              // Buscar procesos de este estado que no tengan posición override
              updatedNodes = updatedNodes.map((node) => {
                if (node.type === "processNode" &&
                  node.data.state === stateName &&
                  !processPositionOverrides[node.id]) {
                  // reposicionar proceso relativo al nuevo basePos
                  const idx = parseInt(node.data.index, 10);
                  const gapX = stateName === "Terminated" ? 60 : 42;
                  const perRow = stateName === "Terminated" ? 2 : 3;
                  const gapY = 42;
                  const offsetX = (idx % perRow) * gapX;
                  const offsetY = Math.floor(idx / perRow) * gapY + 70;

                  return {
                    ...node,
                    position: {
                      x: movedNode.position.x + offsetX,
                      y: movedNode.position.y + offsetY,
                    },
                  };
                }
                return node;
              });
            }
          }
        });

        return updatedNodes;
      });
    },
    [processPositionOverrides]
  );

  const onNodeDragStop = useCallback((event, node) => {
    if (node.type === "stateNode") {
      const newPos = node.position;
      // actualizar el override (para reconstrucciones futuras)
      setPositionOverrides(prev => ({ ...prev, [node.id]: newPos }));
      // actualizar también baseNodes inmediato para evitar "parpadeos"
      setBaseNodes(prev =>
        prev.map(n => (n.id === node.id ? { ...n, position: newPos } : n))
      );
    } else if (node.type === "processNode") {
      // Guardar la posición del proceso movido
      setProcessPositionOverrides(prev => ({
        ...prev,
        [node.id]: node.position
      }));
    }
  }, []);

  const onEdgesChange = useCallback(
    (changes) => setEdges((es) => applyEdgeChanges(changes, es)),
    [],
  );

  // Acciones posibles por estado (mapea a funciones del contexto)
  const ACTIONS_BY_STATE = {
    [STATES.NEW]: [
      { label: "Admitir", fn: (pid) => admit(pid), color: STATE_COLORS[STATES.READY] },
    ],
    [STATES.READY]: [
      { label: "Asignar CPU", fn: (pid) => assignCPU(pid), color: STATE_COLORS[STATES.RUNNING] },
    ],
    [STATES.RUNNING]: [
      { label: "Terminar", fn: (pid) => terminate(pid), color: STATE_COLORS[STATES.TERMINATED] },
      { label: "Request I/O", fn: (pid) => requestIO(pid), color: STATE_COLORS[STATES.WAITING] },
      { label: "Preempt", fn: (pid) => preempt(pid), color: STATE_COLORS[STATES.READY] },
    ],
    [STATES.WAITING]: [
      { label: "I/O Complete", fn: (pid) => ioComplete(pid), color: STATE_COLORS[STATES.READY] },
    ],
    [STATES.TERMINATED]: [],
  };

  const onNodeClick = useCallback((event, node) => {
    // solo abrimos menú para nodos de proceso
    if (node.type === 'processNode') {
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      const x = event.clientX - (bounds?.left || 0);
      const y = event.clientY - (bounds?.top || 0);
      setMenu({ pid: node.id, x, y });
    } else {
      setMenu(null);
    }
  }, []);

  const handleAction = async (action) => {
    if (!menu) return;
    const pid = menu.pid;
    try {
      await action.fn(pid);
    } catch (e) {
      console.error('Acción falló', e);
    } finally {
      setMenu(null);
    }
  };

  return (
    <div className="sd-container">
      <div
        ref={reactFlowWrapper}
        style={{
          width: '100%',
          height: '500px',
          borderRadius: '8px',
          position: 'relative'
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            setReactFlowInstance(instance);
            instance.setCenter(window.innerWidth / 2, 200, { zoom: 1, duration: 0 });
          }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnScroll={false}
          panOnDrag={false}
          translateExtent={[[0, 0], [window.innerWidth, 500]]}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={true}
          minZoom={1}
          maxZoom={1}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeExtent={[
            [0, 0],
            [window.innerWidth, 500],
          ]}
        />
        {/* Menú contextual para procesos */}
        {menu && (
          <div
            className="process-menu"
            style={{
              left: menu.x,
              top: menu.y,
            }}
          >
            <div className="menu-title">P{menu.pid}</div>
            <div className="menu-actions">
              {(() => {
                const proc = simState.processes.find(p => p.pid.toString() === menu.pid.toString());
                if (!proc) return <div className="menu-empty">No encontrado</div>;
                const actions = ACTIONS_BY_STATE[proc.state] || [];
                if (actions.length === 0) return <div className="menu-empty">Sin acciones</div>;
                return actions.map((a, i) => (
                  <button key={i} className={`menu-btn`} onClick={() => handleAction(a)} style={{
                    backgroundColor: a.color || "#999",
                  }}>{a.label}</button>
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StateDiagram;