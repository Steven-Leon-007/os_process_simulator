import React, { useState } from 'react';
import useMemory from '../../hooks/useMemory';
import MemoryFrame from './MemoryFrame';
import './MemoryPanel.css';

const MemoryPanel = () => {
  const { frames, totalFrames, usedFrames, freeFrames, clockState } = useMemory();

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

      <div className="memory-grid">
        {frames.map((frame) => {
          const isClockPointer = clockState?.pointer === frame.frameNumber;

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
