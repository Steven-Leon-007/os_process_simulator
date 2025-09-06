import React, { useRef, useEffect, useState, useCallback } from "react";
import { ReactFlow, Handle, Position, MarkerType, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from "framer-motion";
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

// ---------------------- nodos personalizados ----------------------
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

// Process node envuelto en motion para fade-in cuando aparece (mount)
const ProcessNode = ({ data }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="process-node"
      style={{ borderColor: data.color }}
    >
      <div className="process-pid">P{data.pid}</div>
      <div className="process-state">{data.state}</div>
    </motion.div>
  );
};

const nodeTypes = {
  stateNode: StateNode,
  processNode: ProcessNode,
};
// -----------------------------------------------------------------

const StateDiagram = () => {
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [positions, setPositions] = useState(getPositions(window.innerWidth));
  const [positionOverrides, setPositionOverrides] = useState({});
  const [processPositionOverrides, setProcessPositionOverrides] = useState({});

  const [baseNodes, setBaseNodes] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const { state: simState, admit, assignCPU, terminate, preempt, requestIO, ioComplete } = useSim();
  const [menu, setMenu] = useState(null);
  const menuRef = useRef(null);

  // --- NUEVO: estado para animaciones voladoras ---
  const [flying, setFlying] = useState([]); // array de { pid, from:{x,y}, to:{x,y}, color, key }
  const flyingRef = useRef([]);
  const [hiddenPids, setHiddenPids] = useState(new Set()); // pids ocultos durante animación
  // ---------------------------------------------------

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
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenu(null);
      }
    };

    if (menu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menu]);

  useEffect(() => {
    const initialNodes = Object.entries(STATES).map(([key, value]) => ({
      id: value,
      type: "stateNode",
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

  // --- Construcción de nodes: omitimos los procesos que están en 'hiddenPids' para que no aparezcan duplicados durante anim. ---
  useEffect(() => {
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

        // si está animando lo omitimos (lo mostramos en overlay flying)
        if (hiddenPids.has(pidStr)) return;

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
            draggable: false,
          });
          return;
        }

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
          draggable: false,
        });
      });
    });

    setNodes([...baseNodes, ...processNodes]);
  }, [simState.processes, baseNodes, positions, positionOverrides, processPositionOverrides, hiddenPids]);

  const onNodesChange = useCallback(
    (changes) => {
      setNodes((ns) => {
        let updatedNodes = applyNodeChanges(changes, ns);

        changes.forEach((change) => {
          if (change.type === "position" || change.type === "positioned") {
            const movedNode = ns.find((n) => n.id === change.id);

            if (movedNode?.type === "stateNode") {
              const stateName = movedNode.data.id;

              updatedNodes = updatedNodes.map((node) => {
                if (node.type === "processNode" &&
                  node.data.state === stateName &&
                  !processPositionOverrides[node.id]) {
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
      setPositionOverrides(prev => ({ ...prev, [node.id]: newPos }));
      setBaseNodes(prev =>
        prev.map(n => (n.id === node.id ? { ...n, position: newPos } : n))
      );
    } else if (node.type === "processNode") {
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

  // Organización de acciones por estado (igual que antes)
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

  // -------------------- DETECCIÓN DE TRANSICIONES Y ANIMACIÓN --------------------
  const prevProcessesRef = useRef([]);
  useEffect(() => {
    const prev = prevProcessesRef.current || [];
    const prevByPid = Object.fromEntries(prev.map(p => [p.pid.toString(), p]));
    const nowByPid = Object.fromEntries(simState.processes.map(p => [p.pid.toString(), p]));

    // Para cada PID en now, ver si cambió de estado
    simState.processes.forEach((proc) => {
      const pidStr = proc.pid.toString();
      const prevProc = prevByPid[pidStr];
      if (prevProc && prevProc.state !== proc.state) {
        // Encontramos una transición: prevProc.state -> proc.state
        const fromState = prevProc.state;
        const toState = proc.state;

        // Buscar nodo con id = pidStr en nodes para tomar su posición actual (si existe)
        const currNode = nodes.find(n => n.id === pidStr && n.type === 'processNode');
        const fromPos = currNode ? { x: currNode.position.x, y: currNode.position.y } : (positionOverrides[fromState] || positions[fromState]);

        // Calcular posición destino (la misma lógica que usamos para componer nodes)
        const grouped = {};
        simState.processes.forEach((p) => {
          const st = p.state;
          if (!grouped[st]) grouped[st] = [];
          grouped[st].push(p);
        });
        // posición destino base
        const basePosTo = positionOverrides[toState] || positions[toState] || { x: 100, y: 100 };
        const arrAtDest = grouped[toState] || [];
        // vamos a colocar la animación apuntando a la próxima plaza (simple heurística)
        const idxDest = arrAtDest.findIndex(p => p.pid.toString() === pidStr);
        const perRowDest = (toState === "Terminated") ? 2 : 3;
        const gapXDest = (toState === "Terminated") ? 60 : 42;
        const gapY = 42;
        const offsetXDest = (idxDest >= 0) ? (idxDest % perRowDest) * gapXDest : 0;
        const offsetYDest = (idxDest >= 0) ? Math.floor(idxDest / perRowDest) * gapY + 70 : 70;

        const toPos = { x: basePosTo.x + offsetXDest, y: basePosTo.y + offsetYDest };

        // Lanzar la animación: ocultar el nodo real, crear overlay flying, pintar flecha destino
        triggerProcessTransition(pidStr, fromState, toState, fromPos, toPos);
      }
    });

    prevProcessesRef.current = simState.processes.map(p => ({ ...p }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simState.processes, nodes, positions, positionOverrides, processPositionOverrides, edges]);

  // función que orquesta la animación
  const triggerProcessTransition = (pidStr, fromState, toState, fromPos, toPos) => {
    const animationDuration = 2000; // ms
    const arrowHighlightDuration = Math.round(animationDuration * 0.85);

    // 1) ocultar nodo real
    setHiddenPids(prev => {
      const s = new Set(prev);
      s.add(pidStr);
      return s;
    });

    // 2) agregar flying overlay
    const key = `${pidStr}-${Date.now()}`;
    const newFlying = { pid: pidStr, from: fromPos, to: toPos, color: STATE_COLORS[toState] || '#999', key };
    flyingRef.current = [...flyingRef.current, newFlying];
    setFlying([...flyingRef.current]);

    // 3) colorear la flecha (edge) que conecte fromState -> toState (si existe)
    // guardamos estilo original para restaurar
    setEdges(prevEdges => {
      return prevEdges.map(e => {
        if (e.source === fromState && e.target === toState) {
          const original = e.style?.stroke || '#bbb';
          // attach original to element for restore via custom property
          return {
            ...e,
            __originalStroke: original,
            style: { ...e.style, stroke: STATE_COLORS[toState], strokeWidth: 3 }
          };
        }
        return e;
      });
    });

    // 4) programar la restauración y la limpieza
    setTimeout(() => {
      // restaurar edge color
      setEdges(prevEdges => prevEdges.map(e => {
        if (e.source === fromState && e.target === toState) {
          const orig = e.__originalStroke || '#bbb';
          const copy = { ...e };
          delete copy.__originalStroke;
          return { ...copy, style: { ...copy.style, stroke: orig, strokeWidth: 2 } };
        }
        return e;
      }));
    }, arrowHighlightDuration);

    // cuando termine la animación, limpiar overlay y mostrar nodo ya en su nuevo estado (simState ya cambia en el contexto)
    setTimeout(() => {
      // quitar flying
      flyingRef.current = flyingRef.current.filter(f => f.key !== key);
      setFlying([...flyingRef.current]);
      // permitir que node aparezca (saldrá en su nuevo lugar porque simState cambió)
      setHiddenPids(prev => {
        const s = new Set(prev);
        s.delete(pidStr);
        return s;
      });
    }, animationDuration + 40);
  };
  // --------------------------------------------------------------------

  return (
    <div className="sd-container">
      <div
        ref={reactFlowWrapper}
        style={{
          width: '100%',
          height: '550px',
          borderRadius: '8px',
          position: 'relative',
          overflow: 'hidden'
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

        {/* Overlay de animaciones voladoras */}
        <div className="flying-overlay" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1200 }}>
          {flying.map(f => {
            // convertimos coords (que usamos como posiciones relativas al reactflowWrapper)
            const fromX = f.from.x;
            const fromY = f.from.y;
            const toX = f.to.x;
            const toY = f.to.y;

            return (
              <motion.div
                key={f.key}
                className="flying-process"
                initial={{ x: fromX, y: fromY, opacity: 1, scale: 1 }}
                animate={{ x: toX, y: toY, opacity: 0 }}
                transition={{ duration: 2, ease: "easeInOut" }}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '2rem',
                  height: '2rem',
                  borderRadius: 6,
                  border: '2px solid #666',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--color-secondary)',
                  zIndex: 1300,
                  boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 11 }}>P{f.pid}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Menú contextual para procesos */}
        {menu && (
          <div
            ref={menuRef}
            className="process-menu"
            style={{
              left: menu.x,
              top: menu.y,
            }}
          >
            <div className="menu-title">P{menu.pid}</div>
            <div className="menu-actions">
              {(() => {
                const proc = simState.processes.find(
                  (p) => p.pid.toString() === menu.pid.toString()
                );
                if (!proc) return <div className="menu-empty">No encontrado</div>;
                const actions = ACTIONS_BY_STATE[proc.state] || [];
                if (actions.length === 0)
                  return <div className="menu-empty">Sin acciones</div>;
                return actions.map((a, i) => (
                  <button
                    key={i}
                    className="menu-btn"
                    onClick={() => handleAction(a)}
                    style={{
                      backgroundColor: a.color || "#999",
                    }}
                  >
                    {a.label}
                  </button>
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
