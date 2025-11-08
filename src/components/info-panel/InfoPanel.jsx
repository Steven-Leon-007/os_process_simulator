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

  return (
    <div className='info-panel'>
      <h3>Procesos ({state.processes.length})</h3>
      {state.processes.map(p => (
        <div
          key={p.pid}
          className={`process-card ${selectedPid === p.pid ? 'selected' : ''}`}
          style={{ borderLeft: `4px solid ${STATE_COLORS[p.state]}` }}
          onClick={() => handleProcessClick(p.pid)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ color: STATE_COLORS[p.state] }}>{p.pid}</strong>
              <span className="small">{p.state}</span>
            </div>
          </div>
          <div className="small">Creado: {formatTimestamp(p.createdAt)}</div>
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
      ))}
    </div>)
}

export default InfoPanel