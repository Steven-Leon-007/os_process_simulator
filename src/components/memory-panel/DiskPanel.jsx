import React, { useState, useEffect } from 'react';
import { useSim } from '../../context/SimulationContext';
import './DiskPanel.css';

const DiskPanel = () => {
  const { getDiskSnapshot, getDiskStats, memoryState } = useSim();
  const [diskSnapshot, setDiskSnapshot] = useState(null);
  const [diskStats, setDiskStats] = useState(null);

  // Actualizar snapshot del disco cuando cambie el estado de memoria
  // (esto incluye cambios después de operaciones async como escrituras dirty)
  useEffect(() => {
    const snapshot = getDiskSnapshot();
    const stats = getDiskStats();
    setDiskSnapshot(snapshot);
    setDiskStats(stats);
  }, [memoryState, getDiskSnapshot, getDiskStats]); // Dependencia de memoryState para actualizar en tiempo real

  if (!diskSnapshot || !diskStats) {
    return (
      <div className="disk-panel">
        <div className="disk-panel-header">
          <h3>Área de Intercambio (Swap/Disco)</h3>
        </div>
        <div className="disk-content">
          <p className="disk-empty">Inicializando disco...</p>
        </div>
      </div>
    );
  }

  // Agrupar páginas por proceso
  const pagesByProcess = {};
  diskSnapshot.pages.forEach(page => {
    if (!pagesByProcess[page.pid]) {
      pagesByProcess[page.pid] = [];
    }
    pagesByProcess[page.pid].push(page);
  });

  return (
    <div className="disk-panel">
      <div className="disk-panel-header">
        <h3>Área de Intercambio (Swap/Disco)</h3>
        <div className="disk-stats">
          <span className="stat">
            <span className="stat-label">Páginas:</span>
            <span className="stat-value">{diskSnapshot.totalPages}</span>
          </span>
          <span className="stat">
            <span className="stat-label">Lecturas:</span>
            <span className="stat-value">{diskStats.readOperations}</span>
          </span>
          <span className="stat">
            <span className="stat-label">Escrituras:</span>
            <span className="stat-value">{diskStats.writeOperations}</span>
          </span>
          <span className="stat">
            <span className="stat-label">I/O Total:</span>
            <span className="stat-value">{diskStats.totalIOTimeSec}s</span>
          </span>
        </div>
      </div>

      <div className="disk-content">
        {diskSnapshot.totalPages === 0 ? (
          <div className="disk-empty">
            <p>No hay páginas en el área de intercambio</p>
            <small>Las páginas aparecerán aquí cuando sean expulsadas de RAM o reservadas para carga futura</small>
          </div>
        ) : (
          <div className="disk-pages-container">
            {Object.keys(pagesByProcess).map(pid => (
              <div key={pid} className="disk-process-group">
                <div className="disk-process-header">
                  <span className="disk-process-pid">Proceso {pid}</span>
                  <span className="disk-process-count">
                    {pagesByProcess[pid].length} página{pagesByProcess[pid].length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="disk-pages-grid">
                  {pagesByProcess[pid].map(page => (
                    <div 
                      key={`${page.pid}-${page.pageNumber}`}
                      className={`disk-page ${page.isDirty ? 'dirty' : 'clean'}`}
                      title={`Proceso: ${page.pid}\nPágina: ${page.pageNumber}\nEstado: ${page.isDirty ? 'Modificada (Dirty)' : 'Limpia (Clean)'}\nÚltimo acceso: ${page.lastAccess || 'N/A'}`}
                    >
                      <div className="disk-page-header">
                        <span className="disk-page-number">P{page.pageNumber}</span>
                        {page.isDirty && (
                          <span className="disk-page-badge dirty-badge" title="Página modificada">D</span>
                        )}
                      </div>
                      <div className="disk-page-info">
                        <small>{page.isDirty ? 'Dirty' : 'Clean'}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="disk-legend">
        <div className="legend-item">
          <div className="legend-color disk-clean"></div>
          <span>Limpia (Clean)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color disk-dirty"></div>
          <span>Modificada (Dirty)</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge">D</span>
          <span>Dirty Bit</span>
        </div>
      </div>

      <div className="disk-operations-summary">
        <div className="disk-op-item">
          <span className="disk-op-label">Total Operaciones:</span>
          <span className="disk-op-value">{diskStats.totalOperations}</span>
        </div>
        <div className="disk-op-item">
          <span className="disk-op-label">Escrituras Dirty:</span>
          <span className="disk-op-value">{diskStats.dirtyWrites}</span>
        </div>
        <div className="disk-op-item">
          <span className="disk-op-label">Escrituras Clean:</span>
          <span className="disk-op-value">{diskStats.cleanWrites}</span>
        </div>
      </div>
    </div>
  );
};

export default DiskPanel;
