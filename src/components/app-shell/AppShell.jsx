import React, { useState } from "react";
import StateDiagram from "../state-diagram/StateDiagram";
import ControlBar from "../control-bar/ControlBar";
import "./AppShell.css";
import { useSound } from '../../context/SoundContext';

const AppShell = () => {
  const { soundEnabled, setSoundEnabled } = useSound();
  const [showDetails, setShowDetails] = useState(false);

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
      </div>
      <div className="main-wrapper">
        <StateDiagram showDetails={showDetails} />
        <ControlBar />
      </div>
    </div>
  );
};

export default AppShell;
