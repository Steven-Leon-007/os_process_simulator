import React, { useState } from "react";
import { useSim } from "../../context/SimulationContext";
import "./ControlBar.css";
import InfoPanel from "../info-panel/InfoPanel";
import MemoryPanel from "../memory-panel/MemoryPanel";
import DiskPanel from "../memory-panel/DiskPanel";
import useAudio from "../../hooks/useAudio";
import createProcessSfx from "../../assets/effects/create_process.mp3";
import { useSound } from "../../context/SoundContext";

const SPEEDS = [15000, 10000, 6000, 4000, 2500]; // ms para x0.25, x0.5, x0.75, x1.0, x1.5
const SPEED_LABELS = ["x0.25", "x0.5", "x0.75", "x1.0", "x1.5"];

const ControlBar = ({ showMemory = false, selectedPid, onSelectProcess, onClockAnimationComplete }) => {
  const { create, speed, setSpeed, mode, setMode, state, pause } = useSim();
  const { soundEnabled } = useSound();
  const playCreate = useAudio(createProcessSfx, soundEnabled);

  const handleCreate = () => {
    create();
    playCreate();
  };

  const handleManual = () => {
    setMode && setMode("manual");
  };

  const handleAuto = () => {
    setMode && setMode("auto");
  };

  const handlePause = () => {
    setMode && setMode("pause");
  };

  const getCurrentSpeedIndex = () => {
    const idx = SPEEDS.indexOf(speed);
    return idx !== -1 ? idx : 1;
  };

  function downloadCSV(processes) {
    const header =
      "PID;Priority;PC;CpuRegisters;Syscalls;De;Para;Timestamp;Causa;PageFaultsTotales;AccesosMemoriaTotales;PaginasVirtuales\n";
    const rows = processes
      .flatMap((p) =>
        p.history.length > 0
          ? p.history.map(
            (h) =>
              `${p.pid};${h.priority};${h.pc};"${JSON.stringify(
                h.cpuRegisters
              )}";"${JSON.stringify(h.syscalls)}";${h.from};${h.to};${h.timestamp
              };${h.cause};${p.memory?.pageFaults || 0};${p.memory?.memoryAccesses || 0};${p.memory?.numPages || 0}`
          )
          : [
            `${p.pid};${p.priority};${p.pc};"${JSON.stringify(
              p.cpuRegisters
            )}";"${JSON.stringify(p.syscalls)}";${p.state};${p.state};${p.createdAt
            };Creado;${p.memory?.pageFaults || 0};${p.memory?.memoryAccesses || 0};${p.memory?.numPages || 0}`,
          ]
      )
      .join("\n");
    const csvContent = header + rows;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "procesos_historial.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`control-bar ${showMemory ? 'with-memory' : ''}`}>
      <div className="buttons">
        <div className="upper-buttons">
          <button className="button create-button" onClick={handleCreate}>
            Crear
          </button>
          <button
            className="button export"
            onClick={() => downloadCSV(state.processes)}
          >
            Exportar CSV
          </button>
        </div>
        <button
          className={
            mode === "manual" ? "button manual active" : "button manual"
          }
          disabled={mode === "manual"}
          onClick={handleManual}
        >
          Manual
        </button>

        <button
          className={mode === "auto" ? "button auto active" : "button auto"}
          disabled={mode === "auto"}
          onClick={handleAuto}
        >
          Automático
        </button>

        <button
          className={mode === "pause" ? "button pause active" : "button pause"}
          disabled={mode === "pause"}
          onClick={handlePause}
        >
          ❚❚
        </button>
        {mode === "auto" && (
          <div className="slider-container">
            <input
              type="range"
              min={0}
              max={SPEEDS.length - 1}
              step={1}
              value={getCurrentSpeedIndex()}
              onChange={(e) =>
                setSpeed && setSpeed(SPEEDS[parseInt(e.target.value)])
              }
            />
            <span>{SPEED_LABELS[getCurrentSpeedIndex()]}</span>
          </div>
        )}
      </div>

      {showMemory ? (
        <div className="show-memory-container">
          <MemoryPanel onClockAnimationComplete={onClockAnimationComplete} />
          <DiskPanel />
        </div>
      ) : (
        <InfoPanel 
          selectedPid={selectedPid}
          onProcessSelect={onSelectProcess}
        />
      )}
    </div>
  );
};

export default ControlBar;
