import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SimulationProvider } from './context/SimulationContext.jsx'
import { SoundProvider } from './context/SoundContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SimulationProvider>
      <SoundProvider>
        <App />
      </SoundProvider>
    </SimulationProvider>
  </StrictMode>,
)
