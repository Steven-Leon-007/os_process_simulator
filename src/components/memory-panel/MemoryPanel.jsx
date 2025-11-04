import React, { useState } from 'react';
import useMemory from '../../hooks/useMemory';
import './MemoryPanel.css';

const MemoryPanel = () => {
  const { frames, totalFrames, usedFrames, freeFrames, clockState } = useMemory();
  const [hoveredFrame, setHoveredFrame] = useState(null);

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
          const isFree = !frame.bitPresente;
          const isModified = frame.bitModificado;
          const isUsed = frame.bitUso;

          return (
            <div
              key={frame.frameNumber}
              className={`frame ${isFree ? 'free' : 'occupied'} ${isClockPointer ? 'clock-pointer' : ''} ${isModified ? 'modified' : ''}`}
              onMouseEnter={() => setHoveredFrame(frame.frameNumber)}
              onMouseLeave={() => setHoveredFrame(null)}
            >
              <div className="frame-number">F{frame.frameNumber}</div>
              
              {!isFree && (
                <div className="frame-content">
                  <div className="frame-pid">{frame.pid}</div>
                  <div className="frame-page">P{frame.pageNumber}</div>
                </div>
              )}

              {isFree && (
                <div className="frame-empty">
                  <span>—</span>
                </div>
              )}

              <div className="frame-bits">
                <span className={`bit ${isUsed ? 'bit-active' : 'bit-inactive'}`} title="Bit de Uso">
                  U
                </span>
                <span className={`bit ${frame.bitPresente ? 'bit-active' : 'bit-inactive'}`} title="Bit Presente">
                  P
                </span>
                <span className={`bit ${isModified ? 'bit-active' : 'bit-inactive'}`} title="Bit Modificado">
                  M
                </span>
              </div>

              {isClockPointer && (
                <div className="clock-indicator">
                  <span>🕐</span>
                </div>
              )}

              {hoveredFrame === frame.frameNumber && (
                <div className="frame-tooltip">
                  <div className="tooltip-row">
                    <span className="tooltip-label">Frame:</span>
                    <span className="tooltip-value">{frame.frameNumber}</span>
                  </div>
                  {!isFree && (
                    <>
                      <div className="tooltip-row">
                        <span className="tooltip-label">PID:</span>
                        <span className="tooltip-value">{frame.pid}</span>
                      </div>
                      <div className="tooltip-row">
                        <span className="tooltip-label">Página:</span>
                        <span className="tooltip-value">{frame.pageNumber}</span>
                      </div>
                    </>
                  )}
                  <div className="tooltip-divider"></div>
                  <div className="tooltip-row">
                    <span className="tooltip-label">Uso:</span>
                    <span className="tooltip-value">{frame.bitUso ? '1' : '0'}</span>
                  </div>
                  <div className="tooltip-row">
                    <span className="tooltip-label">Presente:</span>
                    <span className="tooltip-value">{frame.bitPresente ? '1' : '0'}</span>
                  </div>
                  <div className="tooltip-row">
                    <span className="tooltip-label">Modificado:</span>
                    <span className="tooltip-value">{frame.bitModificado ? '1' : '0'}</span>
                  </div>
                </div>
              )}
            </div>
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
        <div className="legend-item">
          <div className="legend-icon">🕐</div>
          <span>Clock Pointer</span>
        </div>
      </div>
    </div>
  );
};

export default MemoryPanel;
