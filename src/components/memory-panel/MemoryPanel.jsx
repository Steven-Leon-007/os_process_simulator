import React, { useState, useEffect } from 'react';
import { useSim } from '../../context/SimulationContext';
import useMemory from '../../hooks/useMemory';
import MemoryFrame from './MemoryFrame';
import ClockCenter from './ClockCenter';
import './MemoryPanel.css';

const MemoryPanel = ({ onClockAnimationComplete }) => {
  const { frames, totalFrames, usedFrames, freeFrames, clockState } = useMemory();
  const { getClockSteps, clearClockSteps, memoryState } = useSim();
  const [animatingFrame, setAnimatingFrame] = useState(null);
  const [frameAction, setFrameAction] = useState(null);

  // Detectar cambios en memoria y animar los pasos del Clock
  useEffect(() => {
    const steps = getClockSteps();
    
    if (steps && steps.length > 0) {
      // Animar cada paso secuencialmente
      let currentStep = 0;

      const animateNextStep = () => {
        if (currentStep >= steps.length) {
          // Terminar animación
          setTimeout(() => {
            setAnimatingFrame(null);
            setFrameAction(null);
            clearClockSteps();
            
            // Notificar que la animación del Clock terminó
            if (onClockAnimationComplete) {
              onClockAnimationComplete();
            }
          }, 400);
          return;
        }

        const step = steps[currentStep];
        setAnimatingFrame(step.frameNumber);
        setFrameAction(step.action);

        // Duración según la acción
        const duration = step.action === 'victim_found' ? 500 : 300;
        
        currentStep++;
        setTimeout(animateNextStep, duration);
      };

      animateNextStep();
    }
  }, [memoryState, getClockSteps, clearClockSteps, onClockAnimationComplete]);

  // Handlers opcionales para eventos de los frames
  const handleFrameClick = (frameNumber, frameData) => {
    console.log(`Frame ${frameNumber} clicked:`, frameData);
  };

  const handleFrameHover = (frameNumber, isHovering) => {
    // Puedes agregar lógica adicional aquí si lo necesitas
  };

  return (
    <div className="memory-panel">
      <div className="memory-panel-header">
        <h3>Memoria Física (RAM)</h3>
        <div className="memory-stats">
          <span className="stat">
            <span className="stat-label">Total:</span>
            <span className="stat-value">{totalFrames}</span>
          </span>
          <span className="stat">
            <span className="stat-label">Usado:</span>
            <span className="stat-value used">{usedFrames}</span>
          </span>
          <span className="stat">
            <span className="stat-label">Libre:</span>
            <span className="stat-value free">{freeFrames}</span>
          </span>
        </div>
      </div>

      <div className="memory-grid-container">
        <div className="memory-grid">
          {frames.map((frame, index) => {
            const isClockPointer = clockState?.clockPointer === frame.frameNumber;

            return (
              <MemoryFrame
                key={frame.frameNumber}
                frameNumber={frame.frameNumber}
                pid={frame.pid}
                pageNumber={frame.pageNumber}
                bitUso={frame.bitUso}
                bitPresente={frame.bitPresente}
                bitModificado={frame.bitModificado}
                isClockPointer={isClockPointer}
                onClick={handleFrameClick}
                onHover={handleFrameHover}
              />
            );
          })}
          
          {/* Reloj en el centro del grid (ocupa 2x2) */}
          <ClockCenter 
            clockPointer={animatingFrame !== null ? animatingFrame : clockState?.clockPointer}
            action={frameAction}
          />
        </div>
      </div>

      <div className="memory-legend">
        <div className="legend-item">
          <div className="legend-color free"></div>
          <span>Libre</span>
        </div>
        <div className="legend-item">
          <div className="legend-color occupied"></div>
          <span>Ocupado</span>
        </div>
        <div className="legend-item">
          <div className="legend-color modified"></div>
          <span>Modificado</span>
        </div>
      </div>
    </div>
  );
};

export default MemoryPanel;
