import React, { createContext, useContext } from 'react'
import useSimulation from '../hooks/useSimulation'

const SimulationContext = createContext(null)

export function SimulationProvider({ children }) {
    const sim = useSimulation()
    return <SimulationContext.Provider value={sim}>{children}</SimulationContext.Provider>
}


export function useSim() {
    const ctx = useContext(SimulationContext)
    if (!ctx) throw new Error('useSim must be used inside SimulationProvider')
    return ctx
}