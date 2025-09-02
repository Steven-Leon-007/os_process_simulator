import React from 'react'
import { useSim } from '../../context/SimulationContext'

const ControlBar = () => {

  const { create } = useSim()

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="button" onClick={() => create(0)}>Crear</button>
    </div>
  )
}

export default ControlBar