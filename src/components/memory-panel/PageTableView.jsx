import React, { useState } from 'react';
import { useSim } from '../../context/SimulationContext';
import useMemory from '../../hooks/useMemory';
import './PageTableView.css';

/**
 * Componente que visualiza la tabla de páginas de un proceso seleccionado
 */
const PageTableView = () => {
  const { state } = useSim();
  const { getPageTable } = useMemory();
  const [selectedPid, setSelectedPid] = useState(null);

  // Obtener la tabla de páginas del proceso seleccionado
  const pageTable = selectedPid ? getPageTable(selectedPid) : null;

  // Obtener información del proceso seleccionado
  const selectedProcess = state.processes.find(p => p.pid === selectedPid);

  const handleProcessSelect = (e) => {
    setSelectedPid(e.target.value || null);
  };

  return (
    <div className="page-table-view">
      {/* Header con selector de proceso */}
      <div className="page-table-header">
        <h3>Tabla de Páginas</h3>
        <select 
          className="process-selector"
          value={selectedPid || ''}
          onChange={handleProcessSelect}
        >
          <option value="">Seleccionar proceso...</option>
          {state.processes.map(process => (
            <option key={process.pid} value={process.pid}>
              {process.pid} - {process.state}
            </option>
          ))}
        </select>
      </div>

      {/* Contenido principal */}
      {!selectedPid && (
        <div className="page-table-empty">
          <p>Selecciona un proceso para ver su tabla de páginas</p>
        </div>
      )}

      {selectedPid && !pageTable && (
        <div className="page-table-empty">
          <p>No se encontró la tabla de páginas del proceso {selectedPid}</p>
        </div>
      )}

      {selectedPid && pageTable && (
        <>
          {/* Estadísticas del proceso */}
          {selectedProcess && (
            <div className="page-table-stats">
              <div className="stat-item">
                <span className="stat-label">Proceso:</span>
                <span className="stat-value">{selectedProcess.pid}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Estado:</span>
                <span className="stat-value">{selectedProcess.state}</span>
              </div>
              {selectedProcess.memory && (
                <>
                  <div className="stat-item">
                    <span className="stat-label">Páginas totales:</span>
                    <span className="stat-value">{selectedProcess.memory.numPages}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Páginas cargadas:</span>
                    <span className="stat-value">{selectedProcess.memory.loadedPages}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Page Faults:</span>
                    <span className="stat-value">{selectedProcess.memory.pageFaults}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tabla de páginas en formato grid */}
          <div className="page-table-grid">
            <div className="page-table-grid-header">
              <div className="grid-header-cell">Página</div>
              <div className="grid-header-cell">Marco</div>
              <div className="grid-header-cell">Presente</div>
              <div className="grid-header-cell">Uso</div>
              <div className="grid-header-cell">Modificado</div>
            </div>

            <div className="page-table-entries">
              {pageTable.map((entry, index) => {
                const isPresent = entry.bitPresente === 1;
                const isUsed = entry.bitUso === 1;
                const isModified = entry.bitModificado === 1;

                return (
                  <div 
                    key={index}
                    className={`page-entry ${isPresent ? 'present' : 'absent'}`}
                  >
                    <div className="page-entry-cell page-number">
                      <span className="page-label">P{entry.pageNumber}</span>
                    </div>

                    <div className="page-entry-cell frame-number">
                      {isPresent ? (
                        <span className="frame-label">F{entry.frameNumber}</span>
                      ) : (
                        <span className="not-loaded">—</span>
                      )}
                    </div>

                    <div className="page-entry-cell bit-cell">
                      <span className={`bit-indicator ${isPresent ? 'active' : 'inactive'}`}>
                        {isPresent ? '✓' : '✗'}
                      </span>
                    </div>

                    <div className="page-entry-cell bit-cell">
                      <span className={`bit-indicator ${isUsed ? 'active' : 'inactive'}`}>
                        {isUsed ? '✓' : '✗'}
                      </span>
                    </div>

                    <div className="page-entry-cell bit-cell">
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
          <div className="page-table-legend">
            <div className="legend-item">
              <div className="legend-indicator present"></div>
              <span>Página en RAM</span>
            </div>
            <div className="legend-item">
              <div className="legend-indicator absent"></div>
              <span>Página ausente</span>
            </div>
            <div className="legend-item">
              <span className="bit-indicator active" style={{ fontSize: '0.9rem' }}>✓</span>
              <span>Bit activo</span>
            </div>
            <div className="legend-item">
              <span className="bit-indicator inactive" style={{ fontSize: '0.9rem' }}>✗</span>
              <span>Bit inactivo</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PageTableView;
