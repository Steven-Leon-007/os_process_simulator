import React, { useState } from "react";
import StateDiagram from "../state-diagram/StateDiagram";
import ControlBar from "../control-bar/ControlBar";
import "./AppShell.css";
import { useSound } from '../../context/SoundContext';
import { setManualInactivityTimeout } from '../../services/engine';
import { useSim } from "../../context/SimulationContext";
import MemoryPanel from '../memory-panel/MemoryPanel';

const INACTIVITY_MIN = 0;
const INACTIVITY_MAX = 300;
const INACTIVITY_STEP = 5;
const INACTIVITY_DEFAULT = 45;

const AppShell = () => {
  const { soundEnabled, setSoundEnabled } = useSound();
  const [showDetails, setShowDetails] = useState(false);
  const [showMemory, setShowMemory] = useState(false);

  const { reset } = useSim();

  const [inactivity, setInactivity] = useState(INACTIVITY_DEFAULT);

  const handleInactivityChange = (e) => {
    const value = Number(e.target.value);
    setInactivity(value);
    setManualInactivityTimeout(value === 0 ? Infinity : value * 1000);
  };

  return (
    <div className="app-shell">
      <div className="header">
        <div className="title">
          <strong>OS Simulator - By Nata, Steven and Mileth</strong>
        </div>
        <div className="toggle-container">
          <input
            type="checkbox"
            name="details"
            id="details"
            checked={showDetails}
            onChange={(e) => setShowDetails(e.target.checked)}
          />
          <span>Mostrar detalles técnicos</span>
        </div>
        <div className="toggle-container">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={e => setSoundEnabled(e.target.checked)}
            id="toggle-sound"
          />
          <span>Efectos de sonido</span>
        </div>
        <div className="toggle-container">
          <input
            type="checkbox"
            checked={showMemory}
            onChange={e => setShowMemory(e.target.checked)}
            id="toggle-memory"
          />
          <span>Mostrar memoria</span>
        </div>
      </div>
      <div className="main-wrapper">
        <StateDiagram showDetails={showDetails} />
        <ControlBar showMemory={showMemory} />
      </div>
      <div className="footer-options">
        <label className="inactivity-slider">
          <span>Inactividad para automático:</span>
          <input
            type="range"
            min={INACTIVITY_MIN}
            max={INACTIVITY_MAX}
            step={INACTIVITY_STEP}
            value={inactivity}
            onChange={handleInactivityChange}
            style={{ flex: 1, margin: "0 8px" }}
          />
          <span style={{ minWidth: 60 }}>
            {inactivity === 0 ? "Desactivado" : `${inactivity} s`}
          </span>
        </label>
        <button className="button clear" onClick={reset}>
          Limpiar procesos
        </button>
      </div>
    </div>
  );
};

export default AppShell;
