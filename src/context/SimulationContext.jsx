import React, { createContext, useContext, useState, useEffect } from 'react';
import useSimulation from '../hooks/useSimulation';
import * as engine from '../services/engine.js';

const SimulationContext = createContext(null)

export function SimulationProvider({ children }) {
    const sim = useSimulation()
    const [mode, setMode] = useState('manual');
    const [speed, setSpeed] = useState(3000);

    // Crear procesos automáticamente cada 7 segundos en modo automático
    useEffect(() => {
        if (mode !== 'auto') return;
        const interval = setInterval(() => {
            sim.create(); // Puedes pasar prioridad si lo deseas
        }, 7000);
        return () => clearInterval(interval);
    }, [mode, sim.create]);

    // Sincroniza procesos con el motor cada vez que cambian
    useEffect(() => {
        engine.setProcesses(sim.state.processes);
    }, [sim.state.processes]);

    // Actualiza procesos en la UI cuando el motor los cambie
    useEffect(() => {
        engine.setUpdateCallback((newProcesses) => {
            sim.dispatch({ type: 'SET', payload: { processes: newProcesses } });
        });
    }, []);

    // Cambia el modo en el motor y en el contexto
    const handleSetMode = (newMode) => {
        setMode(newMode);
        engine.setMode(newMode);
    };

    // Cambia la velocidad en el motor y en el contexto
    const handleSetSpeed = (newSpeed) => {
        setSpeed(newSpeed);
        engine.setSpeed(newSpeed);
    };

    return (
        <SimulationContext.Provider value={{
            ...sim,
            mode,
            setMode: handleSetMode,
            speed,
            setSpeed: handleSetSpeed
        }}>
            {children}
        </SimulationContext.Provider>
    );
}


export function useSim() {
    const ctx = useContext(SimulationContext)
    if (!ctx) throw new Error('useSim must be used inside SimulationProvider')
    return ctx
}