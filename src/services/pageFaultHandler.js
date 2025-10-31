/**
 * pageFaultHandler.js
 * Manejador central de fallas de página con algoritmo Clock de reemplazo.
 * Gestiona la asignación de marcos cuando hay page faults y selecciona víctimas cuando la RAM está llena.
 */

import * as Memory from './memory.js';
import * as PageTable from './pageTable.js';
import { getTimestamp } from '../utils/time.js';

// Historial global de eventos de reemplazo
let replacementHistory = [];

/**
 * Maneja una falla de página (Page Fault)
 * Asigna un marco libre si hay disponible, o invoca el algoritmo Clock si la RAM está llena.
 * 
 * @param {string} pid - ID del proceso que causó el page fault
 * @param {number} pageNumber - Número de página que causó el fallo
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @returns {object} Resultado del manejo del page fault
 */
export function handlePageFault(pid, pageNumber, pageTable) {
  if (!pageTable) {
    return {
      success: false,
      error: 'Page table not provided',
      pid,
      pageNumber,
    };
  }

  // Verificar que la página existe en la tabla
  if (pageNumber < 0 || pageNumber >= pageTable.length) {
    return {
      success: false,
      error: 'Invalid page number',
      pid,
      pageNumber,
    };
  }

  // Verificar si la página ya está presente (no debería)
  if (PageTable.isPagePresent(pageTable, pageNumber)) {
    return {
      success: false,
      error: 'Page is already present',
      pid,
      pageNumber,
    };
  }

  // Intentar obtener un marco libre
  const freeFrame = Memory.getFreeFrame();

  if (freeFrame !== null) {
    // Hay marco libre disponible - asignación directa
    const loadResult = loadPageIntoFrame(pid, pageNumber, freeFrame, pageTable);
    
    if (loadResult.success) {
      return {
        success: true,
        frameNumber: freeFrame,
        pageNumber,
        pid,
        replacement: false,
        timestamp: loadResult.timestamp,
      };
    } else {
      return loadResult;
    }
  }

  // No hay marcos libres - ejecutar algoritmo Clock de reemplazo
  const replacementResult = clockReplacement(pid, pageNumber, pageTable);

  return replacementResult;
}

/**
 * Simula la carga de una página desde disco a un marco de memoria
 * Actualiza la tabla de páginas y el marco físico
 * 
 * @param {string} pid - ID del proceso
 * @param {number} pageNumber - Número de página a cargar
 * @param {number} frameNumber - Número de marco donde cargar
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @returns {object} Resultado de la carga
 */
export function loadPageIntoFrame(pid, pageNumber, frameNumber, pageTable) {
  const timestamp = getTimestamp();

  // Verificar que el marco existe
  const frame = Memory.getFrame(frameNumber);
  if (!frame) {
    return {
      success: false,
      error: 'Invalid frame number',
      frameNumber,
    };
  }

  // Verificar que el marco está libre
  if (frame.bitPresente === 1 || frame.pid !== null) {
    return {
      success: false,
      error: 'Frame is not free',
      frameNumber,
      currentOwner: frame.pid,
    };
  }

  // Asignar el marco en la memoria física
  const allocated = Memory.allocateFrame(frameNumber, pid, pageNumber);

  if (!allocated) {
    return {
      success: false,
      error: 'Failed to allocate frame',
      frameNumber,
    };
  }

  // Actualizar la tabla de páginas
  const updated = PageTable.markPagePresent(pageTable, pageNumber, frameNumber);

  if (!updated) {
    // Revertir asignación en memoria
    Memory.freeFrame(frameNumber);
    return {
      success: false,
      error: 'Failed to update page table',
      pageNumber,
    };
  }

  return {
    success: true,
    pid,
    pageNumber,
    frameNumber,
    timestamp,
    simulatedDiskLoad: true, // Indica que se simuló carga desde disco
  };
}

/**
 * Algoritmo Clock de reemplazo de páginas
 * Busca una víctima recorriendo circularmente los marcos, usando el bit de uso.
 * 
 * @param {string} newPid - ID del proceso que necesita el marco
 * @param {number} newPageNumber - Número de página a cargar
 * @param {Array} newPageTable - Tabla de páginas del proceso que necesita el marco
 * @returns {object} Resultado del reemplazo
 */
export function clockReplacement(newPid, newPageNumber, newPageTable) {
  const timestamp = getTimestamp();
  const memSnapshot = Memory.getMemorySnapshot();
  const totalFrames = memSnapshot.totalFrames;

  let attempts = 0;
  const maxAttempts = totalFrames * 2; // Dos vueltas completas como máximo

  let victimFrame = null;
  let clockPointer = Memory.getClockPointer();

  // Algoritmo Clock: buscar víctima
  while (attempts < maxAttempts) {
    const frame = Memory.getFrame(clockPointer);

    if (!frame || frame.bitPresente === 0) {
      // Marco libre encontrado (no debería llegar aquí, pero por seguridad)
      victimFrame = clockPointer;
      break;
    }

    // Verificar bit de uso
    if (frame.bitUso === 0) {
      // Víctima encontrada
      victimFrame = clockPointer;
      break;
    } else {
      // Dar segunda oportunidad: limpiar bit de uso
      Memory.updateFrameBits(clockPointer, { bitUso: 0 });
    }

    // Avanzar el puntero circularmente
    clockPointer = (clockPointer + 1) % totalFrames;
    attempts++;
  }

  // Verificar que se encontró víctima
  if (victimFrame === null) {
    return {
      success: false,
      error: 'No victim frame found after maximum attempts',
      attempts,
    };
  }

  // Obtener información de la víctima
  const victimFrameData = Memory.getFrame(victimFrame);
  const victimPid = victimFrameData.pid;
  const victimPageNumber = victimFrameData.pageNumber;
  const wasDirty = victimFrameData.bitModificado === 1;

  // Guardar snapshot del estado antes del reemplazo
  const beforeState = {
    frameNumber: victimFrame,
    pid: victimPid,
    pageNumber: victimPageNumber,
    bitModificado: victimFrameData.bitModificado,
    bitUso: victimFrameData.bitUso,
  };

  // Obtener tabla de páginas de la víctima
  // Nota: Necesitamos acceso a todas las tablas de páginas
  // Como no tenemos acceso directo aquí, registraremos el evento sin actualizar la tabla de la víctima
  // La actualización se hará desde donde se tenga acceso a todas las tablas

  // Liberar el marco (esto limpia todos los bits)
  Memory.freeFrame(victimFrame);

  // Cargar la nueva página en el marco liberado
  const loadResult = loadPageIntoFrame(newPid, newPageNumber, victimFrame, newPageTable);

  if (!loadResult.success) {
    return {
      success: false,
      error: 'Failed to load new page after eviction',
      evictedFrame: victimFrame,
      loadError: loadResult.error,
    };
  }

  // Actualizar el puntero del Clock
  const newPointer = (victimFrame + 1) % totalFrames;
  Memory.setClockPointer(newPointer);

  // Registrar el evento de reemplazo en el historial global
  const replacementEvent = {
    timestamp,
    type: 'PAGE_REPLACEMENT',
    algorithm: 'CLOCK',
    victim: {
      pid: victimPid,
      pageNumber: victimPageNumber,
      frameNumber: victimFrame,
      wasDirty,
      ...beforeState,
    },
    loaded: {
      pid: newPid,
      pageNumber: newPageNumber,
      frameNumber: victimFrame,
    },
    clockPointer: newPointer,
    attempts,
  };

  replacementHistory.push(replacementEvent);

  return {
    success: true,
    replacement: true,
    frameNumber: victimFrame,
    pageNumber: newPageNumber,
    pid: newPid,
    victim: {
      pid: victimPid,
      pageNumber: victimPageNumber,
      wasDirty,
    },
    timestamp,
    clockPointerAfter: newPointer,
    attempts,
    requiresVictimTableUpdate: true, // Indica que la tabla de la víctima debe actualizarse
  };
}

/**
 * Actualiza la tabla de páginas de la víctima después de un reemplazo
 * Debe llamarse desde donde se tenga acceso a la tabla de páginas de la víctima
 * 
 * @param {Array} victimPageTable - Tabla de páginas del proceso víctima
 * @param {number} victimPageNumber - Número de página expulsada
 * @returns {boolean} true si se actualizó correctamente
 */
export function updateVictimPageTable(victimPageTable, victimPageNumber) {
  if (!victimPageTable) {
    return false;
  }

  return PageTable.markPageAbsent(victimPageTable, victimPageNumber);
}

/**
 * Obtiene el historial completo de reemplazos de páginas
 * @returns {Array} Historial de eventos de reemplazo
 */
export function getReplacementHistory() {
  return [...replacementHistory];
}

/**
 * Obtiene las estadísticas de reemplazo
 * @returns {object} Estadísticas de reemplazo
 */
export function getReplacementStats() {
  const total = replacementHistory.length;
  const dirtyReplacements = replacementHistory.filter(e => e.victim.wasDirty).length;
  const cleanReplacements = total - dirtyReplacements;

  // Calcular promedio de intentos del algoritmo Clock
  const avgAttempts = total > 0
    ? replacementHistory.reduce((sum, e) => sum + e.attempts, 0) / total
    : 0;

  // Contar reemplazos por proceso
  const victimsByProcess = {};
  const loadsByProcess = {};

  replacementHistory.forEach(event => {
    victimsByProcess[event.victim.pid] = (victimsByProcess[event.victim.pid] || 0) + 1;
    loadsByProcess[event.loaded.pid] = (loadsByProcess[event.loaded.pid] || 0) + 1;
  });

  return {
    totalReplacements: total,
    dirtyReplacements,
    cleanReplacements,
    averageClockAttempts: avgAttempts.toFixed(2),
    victimsByProcess,
    loadsByProcess,
  };
}

/**
 * Limpia el historial de reemplazos
 */
export function clearReplacementHistory() {
  replacementHistory = [];
}

/**
 * Reinicia completamente el manejador de fallas de página
 */
export function resetPageFaultHandler() {
  replacementHistory = [];
}

/**
 * Obtiene el último evento de reemplazo
 * @returns {object|null} Último evento o null si no hay historial
 */
export function getLastReplacement() {
  if (replacementHistory.length === 0) {
    return null;
  }
  return { ...replacementHistory[replacementHistory.length - 1] };
}

/**
 * Verifica si la memoria está llena (no hay marcos libres)
 * @returns {boolean} true si no hay marcos libres
 */
export function isMemoryFull() {
  const snapshot = Memory.getMemorySnapshot();
  return snapshot.freeFrames === 0;
}

/**
 * Obtiene información detallada sobre el estado del algoritmo Clock
 * @returns {object} Estado del algoritmo Clock
 */
export function getClockState() {
  const snapshot = Memory.getMemorySnapshot();
  const pointer = Memory.getClockPointer();
  const currentFrame = Memory.getFrame(pointer);

  return {
    clockPointer: pointer,
    totalFrames: snapshot.totalFrames,
    usedFrames: snapshot.usedFrames,
    freeFrames: snapshot.freeFrames,
    currentFrame: currentFrame ? {
      frameNumber: currentFrame.frameNumber,
      pid: currentFrame.pid,
      pageNumber: currentFrame.pageNumber,
      bitUso: currentFrame.bitUso,
      bitModificado: currentFrame.bitModificado,
    } : null,
    memoryFull: snapshot.freeFrames === 0,
  };
}
