import React from 'react'
import { useSim } from '../../context/SimulationContext'
import { formatTimestamp } from '../../utils/time'
import './InfoPanel.css'
import { STATE_COLORS } from '../state-diagram/utils/constants';

const InfoPanel = ({ selectedPid, onProcessSelect }) => {
  const { state } = useSim()
  
  const handleProcessClick = (pid) => {
    if (onProcessSelect) {
      onProcessSelect(pid);
    }
  };

  // Función para verificar si un proceso está bloqueado por I/O de disco
  const isDiskIOBlocked = (process) => {
    // Un proceso está bloqueado por I/O si está en WAITING y su última transición fue por disk-io
    if (process.state !== 'Waiting') return false;
    
    // Verificar si la última entrada del historial es por disk-io
    if (process.history && process.history.length > 0) {
      const lastTransition = process.history[process.history.length - 1];
      return lastTransition.cause && lastTransition.cause.includes('disk-io');
    }
    
    return false;
  };

  // Función para obtener el último syscall de tipo DISK_IO
  const getLastDiskIOSyscall = (process) => {
    if (!process.syscalls) return null;
    
    for (let i = process.syscalls.length - 1; i >= 0; i--) {
      const syscall = process.syscalls[i];
      if (syscall.type === "DISK_IO_START" || syscall.type === "DISK_IO_END") {
        return syscall;
      }
    }
    return null;
  };

  return (
    <div className='info-panel'>
      <h3>Procesos ({state.processes.length})</h3>
      {state.processes.map(p => {
        const isDiskBlocked = isDiskIOBlocked(p);
        const lastDiskIO = getLastDiskIOSyscall(p);
        
        return (
          <div
            key={p.pid}
            className={`process-card ${selectedPid === p.pid ? 'selected' : ''} ${isDiskBlocked ? 'disk-io-blocked' : ''}`}
            style={{ borderLeft: `4px solid ${STATE_COLORS[p.state]}` }}
            onClick={() => handleProcessClick(p.pid)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: STATE_COLORS[p.state] }}>{p.pid}</strong>
                <span className="small">{p.state}</span>
                {isDiskBlocked && (
                  <span className="disk-io-badge" title="Bloqueado por I/O de disco">
                    DISK I/O
                  </span>
                )}
              </div>
            </div>
            <div className="small">Creado: {formatTimestamp(p.createdAt)}</div>
            {isDiskBlocked && lastDiskIO && lastDiskIO.type === "DISK_IO_START" && (
              <div className="small disk-io-info" style={{ color: '#ff9800', marginTop: 4 }}>
                🔄 I/O de disco en progreso (página {lastDiskIO.pageNumber})
              </div>
            )}
            {!isDiskBlocked && lastDiskIO && lastDiskIO.type === "DISK_IO_END" && lastDiskIO.hadDiskIO && (
              <div className="small disk-io-info" style={{ color: '#4caf50', marginTop: 4 }}>
                ✓ Último I/O: {lastDiskIO.duration}ms (página {lastDiskIO.pageNumber})
              </div>
            )}
            <details style={{ marginTop: 6 }}>
              <summary className="small">Historial ({p.history.length})</summary>
              <ul>
                {p.history.map((h, i) => (
                  <li key={i} className="small">
                    {h.from} → {h.to} @ {formatTimestamp(h.timestamp)} ({h.cause})
                  </li>
                ))}
              </ul>
            </details>
          </div>
        );
      })}
    </div>)
}

export default InfoPanel