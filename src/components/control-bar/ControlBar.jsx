import React from 'react'
import { useSim } from '../../context/SimulationContext'
import "./ControlBar.css"

const ControlBar = () => {

  const { create } = useSim();

  return (
    <div className='control-bar-container'>
      <button className="create-button" onClick={() => create(0)}>Crear proceso</button>
    </div>
  )
}

export default ControlBar