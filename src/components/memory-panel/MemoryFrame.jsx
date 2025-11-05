import React, { useState } from 'react';
import './MemoryPanel.css';

/**
 * Genera un color basado en el PID del proceso
 * @param {string} pid - Process ID
 * @returns {string} Color en formato HSL
 */
const getPidColor = (pid) => {
  if (!pid) return null;

  // Generar hash simple del PID
  let hash = 0;
  for (let i = 0; i < pid.length; i++) {
    hash = pid.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convertir a HSL con saturación y luminosidad fijas
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
};

/**
 * Componente que representa un marco individual de memoria
 */
const MemoryFrame = ({
  frameNumber,
  pid,
  pageNumber,
  bitUso,
  bitPresente,
  bitModificado,
  isClockPointer,
  onClick,
  onHover,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const isFree = !bitPresente;
  const isModified = bitModificado;
  const isUsed = bitUso;
  const pidColor = getPidColor(pid);

  const handleMouseEnter = () => {
    setShowTooltip(true);
    if (onHover) {
      onHover(frameNumber, true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
    if (onHover) {
      onHover(frameNumber, false);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(frameNumber, { pid, pageNumber, bitUso, bitPresente, bitModificado });
    }
  };

  return (
    <div
      className={`frame ${isFree ? 'free' : 'occupied'} ${isClockPointer ? 'clock-pointer' : ''} ${isModified ? 'modified' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        borderLeftColor: pidColor || undefined,
        borderLeftWidth: pidColor ? '4px' : undefined,
      }}
    >
      {/* Número del frame */}
      <div className="frame-number">F{frameNumber}</div>

      {/* Contenido del frame (si está ocupado) */}
      {!isFree && (
        <div className="frame-content">
          <div className="frame-pid" style={{ color: pidColor }}>
            {pid}
          </div>
          <div className="frame-page">P{pageNumber}</div>
        </div>
      )}

      {/* Frame vacío */}
      {isFree && (
        <div className="frame-empty">
          <span>—</span>
        </div>
      )}

      {/* Bits de control */}
      <div className="frame-bits">
        <span
          className={`bit ${isUsed ? 'bit-active' : 'bit-inactive'}`}
          title="Bit de Uso"
        >
          U
        </span>
        <span
          className={`bit ${bitPresente ? 'bit-active' : 'bit-inactive'}`}
          title="Bit Presente"
        >
          P
        </span>
        <span
          className={`bit ${isModified ? 'bit-active' : 'bit-inactive'}`}
          title="Bit Modificado"
        >
          M
        </span>
      </div>

      {/* Indicador del Clock Pointer */}
      {isClockPointer && (
        <div className="clock-indicator">
          <span>🕐</span>
        </div>
      )}

      {/* Tooltip con información detallada */}
      {showTooltip && (
        <div className="frame-tooltip">
          <div className="tooltip-row">
            <span className="tooltip-label">Frame:</span>
            <span className="tooltip-value">{frameNumber}</span>
          </div>
          {!isFree && (
            <>
              <div className="tooltip-row">
                <span className="tooltip-label">PID:</span>
                <span className="tooltip-value" style={{ color: pidColor }}>
                  {pid}
                </span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Página:</span>
                <span className="tooltip-value">{pageNumber}</span>
              </div>
            </>
          )}
          <div className="tooltip-divider"></div>
          <div className="tooltip-row">
            <span className="tooltip-label">Uso:</span>
            <span className="tooltip-value">{bitUso ? '1' : '0'}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Presente:</span>
            <span className="tooltip-value">{bitPresente ? '1' : '0'}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Modificado:</span>
            <span className="tooltip-value">{bitModificado ? '1' : '0'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryFrame;
