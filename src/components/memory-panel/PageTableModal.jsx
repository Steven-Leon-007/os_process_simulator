import React, { useEffect } from 'react';
import { useSim } from '../../context/SimulationContext';
import useMemory from '../../hooks/useMemory';
import './PageTableModal.css';

/**
 * Modal que muestra la tabla de páginas de un proceso específico
 * @param {string} pid - PID del proceso a mostrar
 * @param {function} onClose - Callback para cerrar el modal
 */
const PageTableModal = ({ pid, onClose }) => {
  const { state } = useSim();
  const { getPageTable } = useMemory();

  // Obtener la tabla de páginas del proceso
  const pageTable = pid ? getPageTable(pid) : null;
  const selectedProcess = state.processes.find(p => p.pid === pid);

  // Cerrar con tecla ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!pid) return null;

  return (
    <div className="page-table-modal-overlay" onClick={onClose}>
      <div className="page-table-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header del Modal */}
        <div className="modal-header">
          <h2>Tabla de Páginas - Proceso {pid}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Contenido del Modal */}
        <div className="modal-body">
          {!pageTable && (
            <div className="modal-empty">
              <p>No se encontró la tabla de páginas del proceso {pid}</p>
            </div>
          )}

          {pageTable && (
            <>
              {/* Estadísticas del proceso */}
              {selectedProcess && (
                <div className="modal-stats">
                  <div className="modal-stat-item">
                    <span className="modal-stat-label">Proceso:</span>
                    <span className="modal-stat-value">{selectedProcess.pid}</span>
                  </div>
                  <div className="modal-stat-item">
                    <span className="modal-stat-label">Estado:</span>
                    <span className="modal-stat-value">{selectedProcess.state}</span>
                  </div>
                  {selectedProcess.memory && (
                    <>
                      <div className="modal-stat-item">
                        <span className="modal-stat-label">Páginas totales:</span>
                        <span className="modal-stat-value">{selectedProcess.memory.numPages}</span>
                      </div>
                      <div className="modal-stat-item">
                        <span className="modal-stat-label">Páginas cargadas:</span>
                        <span className="modal-stat-value">{selectedProcess.memory.loadedPages}</span>
                      </div>
                      <div className="modal-stat-item">
                        <span className="modal-stat-label">Page Faults:</span>
                        <span className="modal-stat-value">{selectedProcess.memory.pageFaults}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tabla de páginas en formato grid */}
              <div className="modal-page-table-grid">
                <div className="modal-grid-header">
                  <div className="modal-header-cell">Página</div>
                  <div className="modal-header-cell">Marco</div>
                  <div className="modal-header-cell">Presente</div>
                  <div className="modal-header-cell">Uso</div>
                  <div className="modal-header-cell">Modificado</div>
                </div>

                <div className="modal-page-entries">
                  {pageTable.map((entry, index) => {
                    const isPresent = entry.bitPresente === 1;
                    const isUsed = entry.bitUso === 1;
                    const isModified = entry.bitModificado === 1;

                    return (
                      <div 
                        key={index}
                        className={`modal-page-entry ${isPresent ? 'present' : 'absent'}`}
                      >
                        <div className="modal-entry-cell page-number">
                          <span className="page-label">P{entry.pageNumber}</span>
                        </div>

                        <div className="modal-entry-cell frame-number">
                          {isPresent ? (
                            <span className="frame-label">F{entry.frameNumber}</span>
                          ) : (
                            <span className="not-loaded">—</span>
                          )}
                        </div>

                        <div className="modal-entry-cell bit-cell">
                          <span className={`bit-indicator ${isPresent ? 'active' : 'inactive'}`}>
                            {isPresent ? '✓' : '✗'}
                          </span>
                        </div>

                        <div className="modal-entry-cell bit-cell">
                          <span className={`bit-indicator ${isUsed ? 'active' : 'inactive'}`}>
                            {isUsed ? '✓' : '✗'}
                          </span>
                        </div>

                        <div className="modal-entry-cell bit-cell">
                          <span className={`bit-indicator ${isModified ? 'active' : 'inactive'}`}>
                            {isModified ? '✓' : '✗'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leyenda */}
              <div className="modal-legend">
                <div className="modal-legend-item">
                  <div className="legend-indicator present"></div>
                  <span>Página en RAM</span>
                </div>
                <div className="modal-legend-item">
                  <div className="legend-indicator absent"></div>
                  <span>Página ausente</span>
                </div>
                <div className="modal-legend-item">
                  <span className="bit-indicator active" style={{ fontSize: '0.9rem' }}>✓</span>
                  <span>Bit activo</span>
                </div>
                <div className="modal-legend-item">
                  <span className="bit-indicator inactive" style={{ fontSize: '0.9rem' }}>✗</span>
                  <span>Bit inactivo</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer con hint */}
        <div className="modal-footer">
          <span className="modal-hint">Presiona ESC o haz clic fuera para cerrar</span>
        </div>
      </div>
    </div>
  );
};

export default PageTableModal;
