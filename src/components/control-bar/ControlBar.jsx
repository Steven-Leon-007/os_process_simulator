
import React, { useState } from 'react';
import { useSim } from '../../context/SimulationContext';

const SPEEDS = [6000, 3000, 1666, 1500]; // ms para x0.5, x1.0, x1.5, x2.0
const SPEED_LABELS = ['x0.5', 'x1.0', 'x1.5', 'x2.0'];


const ControlBar = () => {
  const { create, speed, setSpeed, mode, setMode, state } = useSim();
  const [showSlider, setShowSlider] = useState(false);

  const handleManual = () => {
    setMode && setMode('manual');
    setShowSlider(false);
  };

  const handleAuto = () => {
    setMode && setMode('auto');
    setShowSlider(true);
  };

  const getCurrentSpeedIndex = () => {
    const idx = SPEEDS.indexOf(speed);
    return idx !== -1 ? idx : 1;
  };

  function downloadCSV(processes) {
    const header = 'PID;Priority;PC;CpuRegisters;Syscalls;De;Para;Timestamp;Causa\n';
    const rows = processes.flatMap(p =>
      p.history.length > 0
        ? p.history.map(h =>
            `${p.pid};${h.priority};${h.pc};"${JSON.stringify(h.cpuRegisters)}";"${JSON.stringify(h.syscalls)}";${h.from};${h.to};${h.timestamp};${h.cause}`
          )
        : [`${p.pid};${p.priority};${p.pc};"${JSON.stringify(p.cpuRegisters)}";"${JSON.stringify(p.syscalls)}";${p.state};${p.state};${p.createdAt};Creado`]
    ).join('\n');
    const csvContent = header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'procesos_historial.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <button className="button" onClick={() => create(0)}>Crear</button>
      <button className={mode === 'manual' ? 'button active' : 'button'} onClick={handleManual}>Manual</button>
      <span style={{ display: 'flex', alignItems: 'center' }}>
        <button className={mode === 'auto' ? 'button active' : 'button'} onClick={handleAuto}>Automático</button>
        {showSlider && (
          <input
            type="range"
            min={0}
            max={SPEEDS.length - 1}
            step={1}
            value={getCurrentSpeedIndex()}
            onChange={e => setSpeed && setSpeed(SPEEDS[parseInt(e.target.value)])}
            style={{ marginLeft: 8 }}
          />
        )}
        {showSlider && (
          <span style={{ marginLeft: 8 }}>{SPEED_LABELS[getCurrentSpeedIndex()]}</span>
        )}
      </span>
      <button className="button" onClick={() => downloadCSV(state.processes)}>
        Descargar CSV
      </button>

    </div>
  );
};

export default ControlBar;