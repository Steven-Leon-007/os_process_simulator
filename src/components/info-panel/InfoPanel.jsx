import React from 'react'
import { useSim } from '../../context/SimulationContext'
import { formatTimestamp } from '../../utils/time'
import './InfoPanel.css'
const InfoPanel = () => {
  const { state } = useSim()
  return (
    <div className='info-panel'>
      <h3>Procesos ({state.processes.length})</h3>
      {state.processes.map(p => (
        <div key={p.pid} className="process-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div><strong>{p.pid}</strong> <span className="small">{p.state}</span></div>
            <div className="small">{formatTimestamp(p.stateEnteredAt)}</div>
          </div>
          <div className="small">Creado: {formatTimestamp(p.createdAt)}</div>
          <details style={{ marginTop: 6 }}>
            <summary className="small">Historial ({p.history.length})</summary>
            <ul>
              {p.history.map((h, i) => (
                <li key={i} className="small">{h.from} → {h.to} @ {formatTimestamp(h.timestamp)} ({h.cause})</li>
              ))}
            </ul>
          </details>
        </div>
      ))}
    </div>)
}

export default InfoPanel