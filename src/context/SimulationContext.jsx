import React, { createContext, useContext, useState, useEffect } from 'react';
import useSimulation from '../hooks/useSimulation';
import * as engine from '../services/engine.js';
import * as Memory from '../services/memory.js';
import * as MMU from '../services/mmu.js';

const SimulationContext = createContext(null)

export function SimulationProvider({ children }) {
    const sim = useSimulation()
    const [mode, setMode] = useState('manual');
    const [speed, setSpeed] = useState(3000);

    // Inicializar memoria y MMU al montar el componente
    useEffect(() => {
        const TOTAL_FRAMES = 16; // 16 marcos de memoria física
        const PAGE_SIZE = 4096; // 4KB por página
        
        Memory.initializeMemory(TOTAL_FRAMES, PAGE_SIZE);
        MMU.initializeMMU(PAGE_SIZE);
        
        console.log('Memory initialized:', Memory.getMemorySnapshot());
    }, []);

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

    useEffect(() => {
        engine.setModeChangeCallback((newMode) => {
            setMode(newMode);
        });
        // Limpia el callback al desmontar
        return () => engine.setModeChangeCallback(null);
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

    // Obtener snapshot de memoria
    const getMemorySnapshot = () => {
        return Memory.getMemorySnapshot();
    };

    // Obtener estadísticas de memoria de un proceso
    const getProcessMemoryStats = (pid) => {
        return MMU.getProcessMemoryStats(pid);
    };

    // Obtener tabla de páginas de un proceso
    const getProcessPageTable = (pid) => {
        return MMU.getProcessPageTable(pid);
    };

    return (
        <SimulationContext.Provider value={{
            ...sim,
            mode,
            setMode: handleSetMode,
            speed,
            setSpeed: handleSetSpeed,
            pause: engine.pause,
            reset: engine.reset,
            // Funciones de memoria
            getMemorySnapshot,
            getProcessMemoryStats,
            getProcessPageTable,
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