import React, { useState, useEffect } from "react";
import StateDiagram from "../state-diagram/StateDiagram";
import ControlBar from "../control-bar/ControlBar";
import "./AppShell.css";
import { useSound } from '../../context/SoundContext';
import { setManualInactivityTimeout } from '../../services/engine';
import { useSim } from "../../context/SimulationContext";
import MemoryPanel from '../memory-panel/MemoryPanel';
import PageTableModal from '../memory-panel/PageTableModal';
import SwapAnimationOverlay from '../memory-panel/SwapAnimationOverlay';

const INACTIVITY_MIN = 0;
const INACTIVITY_MAX = 300;
const INACTIVITY_STEP = 5;
const INACTIVITY_DEFAULT = 0;

const AppShell = () => {
  const { soundEnabled, setSoundEnabled } = useSound();
  const [showDetails, setShowDetails] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [selectedPid, setSelectedPid] = useState(null);
  const [replacementHistory, setReplacementHistory] = useState([]);
  const [pendingSwapAnimation, setPendingSwapAnimation] = useState(null);
  const [modalPid, setModalPid] = useState(null);

  const { reset, getReplacementHistory, memoryState, getClockSteps } = useSim();

  const [inactivity, setInactivity] = useState(INACTIVITY_DEFAULT);

  // Detectar nuevos eventos de reemplazo y esperar a que el Clock termine
  useEffect(() => {
    const history = getReplacementHistory();
    const steps = getClockSteps();
    
    // Si hay un nuevo evento de reemplazo (con algoritmo Clock)
    if (history.length > replacementHistory.length) {
      const newEvent = history[history.length - 1];
      
      // Si es un reemplazo con Clock, esperar a que la animación del Clock termine
      if (newEvent.type === 'PAGE_REPLACEMENT' && steps && steps.length > 0) {
        setPendingSwapAnimation(newEvent);
      } else {
        // Si es una carga simple (PAGE_LOAD), mostrar inmediatamente
        setReplacementHistory(history);
      }
    } else {
      setReplacementHistory(history);
    }
  }, [memoryState, getReplacementHistory, getClockSteps]);

  // Callback cuando la animación del Clock termina
  const handleClockAnimationComplete = () => {
    if (pendingSwapAnimation) {
      // Agregar el evento pendiente al historial para mostrar la animación
      setReplacementHistory(prev => [...prev, pendingSwapAnimation]);
      setPendingSwapAnimation(null);
    }
  };

  const handleInactivityChange = (e) => {
    const value = Number(e.target.value);
    setInactivity(value);
    setManualInactivityTimeout(value === 0 ? Infinity : value * 1000);
  };

  const handleSelectProcess = (pid) => {
    setSelectedPid(pid);
    setModalPid(pid);
  };

  const handleCloseModal = () => {
    setModalPid(null);
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
        <StateDiagram 
          showDetails={showDetails} 
          showMemory={showMemory}
          onSelectProcess={handleSelectProcess}
        />
        <ControlBar 
          showMemory={showMemory}
          selectedPid={selectedPid}
          onSelectProcess={setSelectedPid}
          onClockAnimationComplete={handleClockAnimationComplete}
        />
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

      {/* Modal para mostrar tabla de páginas */}
      {modalPid && (
        <PageTableModal 
          pid={modalPid} 
          onClose={handleCloseModal}
        />
      )}

      {/* Overlay de animaciones de swap - siempre visible */}
      <SwapAnimationOverlay replacementHistory={replacementHistory} />
    </div>
  );
};

export default AppShell;
