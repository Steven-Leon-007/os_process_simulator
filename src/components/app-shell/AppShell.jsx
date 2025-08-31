import React from 'react'
import StateDiagram from '../state-diagram/StateDiagram'
import InfoPanel from '../info-panel/InfoPanel'
import ControlBar from '../control-bar/ControlBar'

const AppShell = () => {
  return (
    <div className="app-shell">
      <div className="header">
        <div><strong>OS Simulator - By Nata, Steven and Mileth</strong></div>
        <div className="controls"><ControlBar /></div>
      </div>
      <StateDiagram />

      <div className="info"><InfoPanel /></div>
    </div>
  )
}

export default AppShell