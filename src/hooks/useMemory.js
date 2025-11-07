/**
 * useMemory.js
 * Hook personalizado para acceder y gestionar el estado de memoria
 * desde componentes de UI.
 */

import { useEffect, useState, useCallback } from 'react';
import { useSim } from '../context/SimulationContext';

/**
 * Hook para acceder al estado de memoria del sistema
 * @returns {object} Estado y funciones de memoria
 */
export default function useMemory() {
  const {
    memoryState,
    updateMemoryState,
    refreshMemory,
    getMemorySnapshot,
    getProcessMemoryStats,
    getProcessPageTable,
    getAllPageTables,
    getReplacementHistory,
    getReplacementStats,
    getClockState,
    isMemoryFull,
    state: simState,
  } = useSim();

  const [localMemoryState, setLocalMemoryState] = useState(memoryState);
  const [pageTables, setPageTables] = useState({});
  const [clockState, setClockState] = useState(null);
  const [replacementStats, setReplacementStats] = useState(null);

  // Actualizar estado local cuando cambie el estado global
  useEffect(() => {
    setLocalMemoryState(memoryState);
  }, [memoryState]);

  // Actualizar tablas de páginas cuando cambien los procesos
  useEffect(() => {
    const tables = getAllPageTables();
    setPageTables(tables);
  }, [simState.processes, memoryState]);

  // Actualizar estado del Clock
  useEffect(() => {
    const state = getClockState();
    setClockState(state);
  }, [memoryState]);

  // Actualizar estadísticas de reemplazo
  useEffect(() => {
    const stats = getReplacementStats();
    setReplacementStats(stats);
  }, [memoryState]);

  // Obtener información de un marco específico
  const getFrameInfo = useCallback((frameNumber) => {
    if (!localMemoryState || !localMemoryState.frames) return null;
    return localMemoryState.frames[frameNumber] || null;
  }, [localMemoryState]);

  // Obtener marcos de un proceso específico
  const getProcessFrames = useCallback((pid) => {
    if (!localMemoryState || !localMemoryState.frames) return [];
    return localMemoryState.frames.filter(
      frame => frame.pid === pid && frame.bitPresente === 1
    );
  }, [localMemoryState]);

  // Obtener marcos libres
  const getFreeFrames = useCallback(() => {
    if (!localMemoryState || !localMemoryState.frames) return [];
    return localMemoryState.frames.filter(
      frame => frame.bitPresente === 0
    );
  }, [localMemoryState]);

  // Obtener marcos ocupados
  const getOccupiedFrames = useCallback(() => {
    if (!localMemoryState || !localMemoryState.frames) return [];
    return localMemoryState.frames.filter(
      frame => frame.bitPresente === 1
    );
  }, [localMemoryState]);

  // Verificar si un marco está libre
  const isFrameFree = useCallback((frameNumber) => {
    const frame = getFrameInfo(frameNumber);
    return frame ? frame.bitPresente === 0 : false;
  }, [getFrameInfo]);

  // Obtener estadísticas de memoria de un proceso
  const getProcessStats = useCallback((pid) => {
    return getProcessMemoryStats(pid);
  }, [getProcessMemoryStats]);

  // Obtener tabla de páginas de un proceso
  const getPageTable = useCallback((pid) => {
    return pageTables[pid] || null;
  }, [pageTables]);

  // Forzar actualización de todos los estados
  const refresh = useCallback(() => {
    refreshMemory();
    const tables = getAllPageTables();
    setPageTables(tables);
    const state = getClockState();
    setClockState(state);
    const stats = getReplacementStats();
    setReplacementStats(stats);
  }, [refreshMemory, getAllPageTables, getClockState, getReplacementStats]);

  return {
    // Estado de memoria
    memoryState: localMemoryState,
    frames: localMemoryState?.frames || [],
    totalFrames: localMemoryState?.totalFrames || 0,
    pageSize: localMemoryState?.pageSize || 0,
    usedFrames: localMemoryState?.usedFrames || 0,
    freeFrames: localMemoryState?.freeFrames || 0,
    
    // Tablas de páginas
    pageTables,
    getPageTable,
    
    // Estado del algoritmo Clock
    clockState,
    clockPointer: clockState?.clockPointer || 0,
    
    // Estadísticas
    replacementStats,
    isMemoryFull: isMemoryFull(),
    
    // Funciones de consulta
    getFrameInfo,
    getProcessFrames,
    getFreeFrames,
    getOccupiedFrames,
    isFrameFree,
    getProcessStats,
    
    // Funciones de actualización
    updateMemoryState,
    refresh,
    
    // Acceso directo a funciones del contexto
    getReplacementHistory,
    getMemorySnapshot,
  };
}
