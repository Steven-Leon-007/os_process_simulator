import React from 'react'
import { useSim } from '../../context/SimulationContext'

const ControlBar = () => {

  const { create, state, admit, assignCPU, terminate } = useSim()
  const firstPid = state.processes.length ? state.processes[0].pid : null

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="button" onClick={() => create(0)}>Crear</button>
      <button className="button" onClick={() => admit(firstPid)} disabled={!firstPid}>Admitir (primer)</button>
      <button className="button" onClick={() => assignCPU(firstPid)} disabled={!firstPid}>Asignar CPU</button>
      <button className="button" onClick={() => terminate(firstPid)} disabled={!firstPid}>Terminar</button>
    </div>
  )
}

export default ControlBar