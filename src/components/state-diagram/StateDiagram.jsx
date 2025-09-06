import React, { useRef, useEffect, useState, useCallback } from "react";
import { ReactFlow, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { STATES } from '../../services/fsm'
import "./StateDiagram.css"
import { useSim } from "../../context/SimulationContext";
import StateNode from "./nodes/StateNode";
import ProcessNode from "./nodes/ProcessNode";
import { getActionsByState, getPositions, STATE_COLORS } from "./utils/constants";
import FlyingOverlay from "./components/FlyingOverlay";
import ProcessMenu from "./components/ProcessMenu";
import { useProcessNodes } from "./hooks/useProcessNodes";
import { useStateEdges } from "./hooks/useStateEdges";
import { useStateNodes } from "./hooks/useStateNodes";

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

  const [baseNodes, setBaseNodes] = useStateNodes(positions, positionOverrides);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useStateEdges();
  const { state: simState, admit, assignCPU, terminate, preempt, requestIO, ioComplete } = useSim();
  const [menu, setMenu] = useState(null);
  const menuRef = useRef(null);

  // --- estado para animaciones voladoras ---
  const [flying, setFlying] = useState([]);
  const flyingRef = useRef([]);
  const [hiddenPids, setHiddenPids] = useState(new Set()); // pids ocultos durante animación

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


  useProcessNodes({
    simState,
    baseNodes,
    positions,
    positionOverrides,
    processPositionOverrides,
    hiddenPids,
    STATE_COLORS,
    setNodes,
  });
  // --- Construcción de nodes: omitimos los procesos que están en 'hiddenPids' para que no aparezcan duplicados durante anim. ---

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

  const ACTIONS_BY_STATE = getActionsByState(admit, assignCPU, terminate, requestIO, preempt, ioComplete, STATE_COLORS, STATES);

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
        <FlyingOverlay flying={flying} />

        {/* Menú contextual para procesos */}
        <ProcessMenu
          menu={menu}
          menuRef={menuRef}
          simState={simState}
          ACTIONS_BY_STATE={ACTIONS_BY_STATE}
          handleAction={handleAction}
        />
      </div>
    </div>
  );
}

export default StateDiagram;
