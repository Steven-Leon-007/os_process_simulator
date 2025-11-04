import React, { useState } from "react";
import { useSim } from "../../context/SimulationContext";
import "./ControlBar.css";
import InfoPanel from "../info-panel/InfoPanel";
import MemoryPanel from "../memory-panel/MemoryPanel";
import useAudio from "../../hooks/useAudio";
import createProcessSfx from "../../assets/effects/create_process.mp3";
import { useSound } from "../../context/SoundContext";

const SPEEDS = [6000, 3000, 1666, 1500]; // ms para x0.5, x1.0, x1.5, x2.0
const SPEED_LABELS = ["x0.5", "x1.0", "x1.5", "x2.0"];

const ControlBar = ({ showMemory = false }) => {
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
      "PID;Priority;PC;CpuRegisters;Syscalls;De;Para;Timestamp;Causa\n";
    const rows = processes
      .flatMap((p) =>
        p.history.length > 0
          ? p.history.map(
              (h) =>
                `${p.pid};${h.priority};${h.pc};"${JSON.stringify(
                  h.cpuRegisters
                )}";"${JSON.stringify(h.syscalls)}";${h.from};${h.to};${
                  h.timestamp
                };${h.cause}`
            )
          : [
              `${p.pid};${p.priority};${p.pc};"${JSON.stringify(
                p.cpuRegisters
              )}";"${JSON.stringify(p.syscalls)}";${p.state};${p.state};${
                p.createdAt
              };Creado`,
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
    <div className="control-bar">
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

      {showMemory ? <MemoryPanel /> : <InfoPanel />}
    </div>
  );
};

export default ControlBar;
