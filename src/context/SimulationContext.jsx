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
    const [memoryState, setMemoryState] = useState(null);
    const [memoryVersion, setMemoryVersion] = useState(0);

    // Inicializar memoria y MMU al montar el componente
    useEffect(() => {
        const TOTAL_FRAMES = 12; // 12 marcos de memoria física (grid 4x4 con centro 2x2 para reloj)
        const PAGE_SIZE = 4096; // 4KB por página
        
        Memory.initializeMemory(TOTAL_FRAMES, PAGE_SIZE);
        MMU.initializeMMU(PAGE_SIZE);
        
        // Inicializar estado de memoria
        const initialState = Memory.getMemorySnapshot();
        setMemoryState(initialState);
        
        console.log('Memory initialized:', initialState);
    }, []);

    // Callback para actualizar memoria (se ejecuta desde el reducer)
    useEffect(() => {
        const onMemoryChange = () => {
            const snapshot = Memory.getMemorySnapshot();
            setMemoryState(snapshot);
        };
        
        // Configurar el callback en el hook de simulación
        sim.setMemoryCallback(onMemoryChange);
    }, [sim.setMemoryCallback]);

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

    // Actualizar estado de memoria cuando cambien los procesos
    useEffect(() => {
        if (sim.state.processes.length > 0) {
            updateMemoryState();
        }
    }, [sim.state.processes, memoryVersion]);

    // Actualiza procesos en la UI cuando el motor los cambie
    useEffect(() => {
        engine.setUpdateCallback((newProcesses) => {
            sim.dispatch({ type: 'SET', payload: { processes: newProcesses } });
            // Actualizar memoria cuando el motor actualice procesos
            updateMemoryState();
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

    // Actualizar estado de memoria desde los servicios
    const updateMemoryState = () => {
        const snapshot = Memory.getMemorySnapshot();
        setMemoryState(snapshot);
    };

    // Forzar actualización de memoria (para llamadas manuales)
    const refreshMemory = () => {
        setMemoryVersion(prev => prev + 1);
        updateMemoryState();
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

    // Obtener todas las tablas de páginas
    const getAllPageTables = () => {
        const pageTables = {};
        sim.state.processes.forEach(process => {
            const pageTable = MMU.getProcessPageTable(process.pid);
            if (pageTable) {
                pageTables[process.pid] = pageTable;
            }
        });
        return pageTables;
    };

    // Obtener historial de reemplazos
    const getReplacementHistory = () => {
        return MMU.getReplacementHistory();
    };

    // Obtener estadísticas de reemplazo
    const getReplacementStats = () => {
        return MMU.getReplacementStats();
    };

    // Obtener estado del algoritmo Clock
    const getClockState = () => {
        return MMU.getClockState();
    };

    // Obtener pasos del último recorrido del algoritmo Clock
    const getClockSteps = () => {
        return MMU.getClockSteps();
    };

    // Limpiar pasos del algoritmo Clock
    const clearClockSteps = () => {
        return MMU.clearClockSteps();
    };

    // Verificar si la memoria está llena
    const isMemoryFull = () => {
        return MMU.isMemoryFull();
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
            // Estado de memoria reactivo
            memoryState,
            updateMemoryState,
            refreshMemory,
            // Funciones de memoria
            getMemorySnapshot,
            getProcessMemoryStats,
            getProcessPageTable,
            getAllPageTables,
            getReplacementHistory,
            getReplacementStats,
            getClockState,
            getClockSteps,
            clearClockSteps,
            isMemoryFull,
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