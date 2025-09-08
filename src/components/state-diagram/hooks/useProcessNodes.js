import { useEffect } from "react";

export function useProcessNodes({
  simState,
  baseNodes,
  positions,
  positionOverrides,
  processPositionOverrides,
  hiddenPids,
  STATE_COLORS,
  setNodes,
  showDetails,
}) {
  useEffect(() => {
    const grouped = {};
    simState.processes.forEach((p) => {
      const st = p.state;
      if (!grouped[st]) grouped[st] = [];
      grouped[st].push(p);
    });

    const processNodes = [];
    Object.entries(grouped).forEach(([stateName, arr]) => {
      var horizontalGap = stateName === "Terminated" ? 60 : 42;
      var perRowProcesses = stateName === "Terminated" ? 2 : 3;

      arr.forEach((proc, idx) => {
        const pidStr = proc.pid.toString();
        if (hiddenPids.has(pidStr)) return;

        console.log(`Proceso ${proc.pid}:`, {
          priority: proc.priority,
          type: typeof proc.priority,
          allFields: proc,
        });

        // Datos comunes para todos los nodos
        const commonData = {
          pid: proc.pid,
          state: proc.state,
          stateEnteredAt: proc.stateEnteredAt,
          history: proc.history || [],
          priority: proc.priority ?? 0,
          pc: proc.pc ?? 0,
          cpuRegisters: proc.cpuRegisters || {},
          syscalls: proc.syscalls || [],
          index: idx,
          color: STATE_COLORS[proc.state] || "#999",
          showDetails,
        };

        if (processPositionOverrides[pidStr]) {
          processNodes.push({
            id: pidStr,
            type: "processNode",
            position: processPositionOverrides[pidStr],
            data: commonData, // Usar los mismos datos completos
            draggable: false,
          });
          return;
        }

        const basePos = positionOverrides[stateName] ||
          positions[stateName] || { x: 100, y: 100 };
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
            stateEnteredAt: proc.stateEnteredAt,
            history: proc.history || [],
            priority: proc.priority ?? 0,
            pc: proc.pc ?? 0,
            cpuRegisters: proc.cpuRegisters || {},
            syscalls: proc.syscalls || [],
            index: idx,
            color: STATE_COLORS[proc.state] || "#999",
            showDetails, // default, lo sobreescribo en StateDiagram.jsx
          },
          draggable: false,
        });
      });
    });

    setNodes([...baseNodes, ...processNodes]);
  }, [
    simState.processes,
    baseNodes,
    positions,
    positionOverrides,
    processPositionOverrides,
    hiddenPids,
    STATE_COLORS,
    setNodes,
    showDetails,
  ]);
}
