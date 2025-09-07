import React from 'react'
import StateDiagram from '../state-diagram/StateDiagram'
import InfoPanel from '../info-panel/InfoPanel'
import ControlBar from '../control-bar/ControlBar'
import "./AppShell.css";

const AppShell = () => {
  return (
    <div className="app-shell">
      <div className="header">
        <div><strong>OS Simulator - By Nata, Steven and Mileth</strong></div>
      </div>
      <div className="main-wrapper">
        <StateDiagram />
        <ControlBar />
      </div>

      <div className="info"><InfoPanel /></div>
    </div>
  )
}

export default AppShell