import React, { useRef, useEffect, useState, useCallback } from "react";
import { ReactFlow, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { STATES } from "../../services/fsm";
import "./StateDiagram.css";
import { useSim } from "../../context/SimulationContext";
import StateNode from "./nodes/StateNode";
import ProcessNode from "./nodes/ProcessNode";
import {
  getActionsByState,
  getPositions,
  STATE_COLORS,
} from "./utils/constants";
import FlyingOverlay from "./components/FlyingOverlay";
import ProcessMenu from "./components/ProcessMenu";
import { useProcessNodes } from "./hooks/useProcessNodes";
import { useStateEdges } from "./hooks/useStateEdges";
import { useStateNodes } from "./hooks/useStateNodes";
import { useProcessTransition } from "./hooks/useProcessTransition";

const nodeTypes = {
  stateNode: StateNode,
  processNode: ProcessNode,
};
// -----------------------------------------------------------------

const StateDiagram = ({ showDetails, showMemory, onSelectProcess }) => {
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [positions, setPositions] = useState(getPositions(window.innerWidth, showMemory));
  const [positionOverrides, setPositionOverrides] = useState({});
  const [processPositionOverrides, setProcessPositionOverrides] = useState({});

  const [baseNodes, setBaseNodes] = useStateNodes(positions, positionOverrides);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useStateEdges();
  const {
    state: simState,
    admit,
    assignCPU,
    terminate,
    preempt,
    requestIO,
    ioComplete,
  } = useSim();
  const [menu, setMenu] = useState(null);
  const menuRef = useRef(null);

  const { flying, hiddenPids } = useProcessTransition({
    simState,
    nodes,
    positions,
    positionOverrides,
    STATE_COLORS,
    setEdges,
    animationDuration: 2000,
  });

  useEffect(() => {
    const handleResize = () => {
      setPositions(getPositions(window.innerWidth, showMemory));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [showMemory]);

  // Actualizar posiciones cuando cambie showMemory
  useEffect(() => {
    setPositions(getPositions(window.innerWidth, showMemory));
  }, [showMemory]);

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
    showDetails,
  });

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
                if (
                  node.type === "processNode" &&
                  node.data.state === stateName &&
                  !processPositionOverrides[node.id]
                ) {
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
      setPositionOverrides((prev) => ({ ...prev, [node.id]: newPos }));
      setBaseNodes((prev) =>
        prev.map((n) => (n.id === node.id ? { ...n, position: newPos } : n))
      );
    } else if (node.type === "processNode") {
      setProcessPositionOverrides((prev) => ({
        ...prev,
        [node.id]: node.position,
      }));
    }
  }, []);

  const onEdgesChange = useCallback(
    (changes) => setEdges((es) => applyEdgeChanges(changes, es)),
    []
  );

  const ACTIONS_BY_STATE = getActionsByState(
    admit,
    assignCPU,
    terminate,
    requestIO,
    preempt,
    ioComplete,
    STATE_COLORS,
    STATES
  );

  const onNodeClick = useCallback((event, node) => {
    if (node.type === "processNode") {
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
      console.error("Acción falló", e);
    } finally {
      setMenu(null);
    }
  };

  const handleViewPageTable = (pid) => {
    setMenu(null);
    onSelectProcess?.(pid);
  };

  return (
    <div className={`sd-container ${showMemory ? 'with-memory' : ''}`}>
      <div
        ref={reactFlowWrapper}
        style={{
          width: "100%",
          height: "700px",
          borderRadius: "8px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            setReactFlowInstance(instance);
          }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnScroll={false}
          panOnDrag={false}
          translateExtent={[
            [0, 0],
            [window.innerWidth * 0.8, 500],
          ]}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          minZoom={1}
          maxZoom={1}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeExtent={[
            [0, 0],
            [window.innerWidth * 0.8, 500],
          ]}
        />

        <FlyingOverlay flying={flying} />

        <ProcessMenu
          menu={menu}
          menuRef={menuRef}
          simState={simState}
          ACTIONS_BY_STATE={ACTIONS_BY_STATE}
          handleAction={handleAction}
          onViewPageTable={handleViewPageTable}
        />
      </div>
    </div>
  );
};

export default StateDiagram;
