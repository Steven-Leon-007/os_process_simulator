/**
 * pageFaultHandler.js
 * Manejador central de fallas de página con algoritmo Clock de reemplazo.
 * Gestiona la asignación de marcos cuando hay page faults y selecciona víctimas cuando la RAM está llena.
 */

import * as Memory from './memory.js';
import * as PageTable from './pageTable.js';
import * as Disk from './disk.js';
import { getTimestamp } from '../utils/time.js';

// Historial global de eventos de reemplazo
let replacementHistory = [];

// Array para almacenar los pasos del algoritmo Clock
let clockSteps = [];

/**
 * Obtiene los pasos del último recorrido del algoritmo Clock
 * @returns {Array} Array de pasos { frameNumber, action }
 */
export function getClockSteps() {
  return [...clockSteps];
}

/**
 * Limpia los pasos del algoritmo Clock
 */
export function clearClockSteps() {
  clockSteps = [];
}

/**
 * Maneja una falla de página (Page Fault)
 * Asigna un marco libre si hay disponible, o invoca el algoritmo Clock si la RAM está llena.
 * 
 * @param {string} pid - ID del proceso que causó el page fault
 * @param {number} pageNumber - Número de página que causó el fallo
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @returns {Promise<object>} Resultado del manejo del page fault
 */
export async function handlePageFault(pid, pageNumber, pageTable) {
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
    const loadResult = await loadPageIntoFrame(pid, pageNumber, freeFrame, pageTable);
    
    if (loadResult.success) {
      // Registrar evento de carga sin reemplazo
      const loadEvent = {
        timestamp: loadResult.timestamp,
        type: 'PAGE_LOAD',
        loaded: {
          pid,
          pageNumber,
          frameNumber: freeFrame,
          origin: loadResult.origin, // RAM o DISK
        },
        replacement: false,
        diskOperation: loadResult.diskOperation,
        hadDiskIO: loadResult.hadDiskIO,
      };
      
      replacementHistory.push(loadEvent);

      return {
        success: true,
        frameNumber: freeFrame,
        pageNumber,
        pid,
        replacement: false,
        origin: loadResult.origin,
        timestamp: loadResult.timestamp,
        diskOperation: loadResult.diskOperation,
        hadDiskIO: loadResult.hadDiskIO, // Propagar la bandera de I/O de disco
      };
    } else {
      return loadResult;
    }
  }

  // No hay marcos libres - ejecutar algoritmo Clock de reemplazo
  const replacementResult = await clockReplacement(pid, pageNumber, pageTable);

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
 * @returns {Promise<object>} Resultado de la carga
 */
export async function loadPageIntoFrame(pid, pageNumber, frameNumber, pageTable) {
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

  // Verificar si la página existe en el disco (swap)
  const pageInSwap = Disk.pageExistsInSwap(pid, pageNumber);
  let origin = 'RAM'; // Por defecto, asumimos que es una página nueva
  let diskOperation = null;
  let hadDiskIO = false; // Nueva bandera para rastrear si hubo I/O de disco real

  if (pageInSwap) {
    // La página existe en swap, hay que leerla desde el disco
    origin = 'DISK';
    hadDiskIO = true; // Operación de DISK_READ
    const readResult = await Disk.readPage(pid, pageNumber);
    
    if (!readResult.success) {
      return {
        success: false,
        error: 'Failed to read page from disk',
        pid,
        pageNumber,
        diskError: readResult.error,
        hadDiskIO,
      };
    }
    
    diskOperation = readResult.operation;
  } else {
    // Es una página nueva, asignar espacio en el disco
    const allocResult = Disk.allocatePage(pid, pageNumber);
    
    if (!allocResult.success) {
      // No es crítico si falla la asignación, continuar
      console.warn('Failed to allocate page in disk:', allocResult.error);
    } else {
      diskOperation = allocResult.operation;
    }
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
    origin, // 'RAM' o 'DISK'
    diskOperation, // Operación de disco ejecutada (DISK_READ o DISK_ALLOCATE)
    simulatedDiskLoad: true, // Indica que se simuló carga desde disco
    hadDiskIO, // Nueva bandera que indica si hubo I/O de disco real (DISK_READ)
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
/**
 * Algoritmo Clock de reemplazo de páginas
 * Busca una víctima dando "segunda oportunidad" a las páginas con bit de uso = 1
 * 
 * @param {string} newPid - ID del proceso que necesita el marco
 * @param {number} newPageNumber - Número de página a cargar
 * @param {Array} newPageTable - Tabla de páginas del proceso que necesita el marco
 * @returns {Promise<object>} Resultado del reemplazo
 */
export async function clockReplacement(newPid, newPageNumber, newPageTable) {
  const timestamp = getTimestamp();
  const memSnapshot = Memory.getMemorySnapshot();
  const totalFrames = memSnapshot.totalFrames;

  let attempts = 0;
  const maxAttempts = totalFrames * 2; // Dos vueltas completas como máximo

  let victimFrame = null;
  let clockPointer = Memory.getClockPointer();

  // Limpiar pasos anteriores
  clockSteps = [];

  // Algoritmo Clock: buscar víctima
  while (attempts < maxAttempts) {
    const frame = Memory.getFrame(clockPointer);

    // Registrar que estamos evaluando este frame
    clockSteps.push({ frameNumber: clockPointer, action: 'evaluating' });

    if (!frame || frame.bitPresente === 0) {
      // Marco libre encontrado (no debería llegar aquí, pero por seguridad)
      victimFrame = clockPointer;
      clockSteps.push({ frameNumber: clockPointer, action: 'victim_found' });
      break;
    }

    // Verificar bit de uso
    if (frame.bitUso === 0) {
      // Víctima encontrada
      victimFrame = clockPointer;
      clockSteps.push({ frameNumber: clockPointer, action: 'victim_found' });
      break;
    } else {
      // Dar segunda oportunidad: limpiar bit de uso
      Memory.updateFrameBits(clockPointer, { bitUso: 0 });
      clockSteps.push({ frameNumber: clockPointer, action: 'second_chance' });
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

  // Si la página víctima está modificada (dirty bit = 1), escribir al disco
  let diskWriteOperation = null;
  let hadDiskWrite = false; // Bandera para DISK_WRITE
  if (wasDirty) {
    hadDiskWrite = true;
    const writeResult = await Disk.writePage(
      victimPid, 
      victimPageNumber, 
      null, // data simulado 
      true  // isDirty = true
    );
    
    if (writeResult.success) {
      diskWriteOperation = writeResult.operation;
    } else {
      console.error('Failed to write dirty page to disk:', writeResult.error);
    }
  }

  // Liberar el marco (esto limpia todos los bits)
  Memory.freeFrame(victimFrame);

  // Cargar la nueva página en el marco liberado
  const loadResult = await loadPageIntoFrame(newPid, newPageNumber, victimFrame, newPageTable);

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
      origin: loadResult.origin, // RAM o DISK
    },
    clockPointer: newPointer,
    attempts,
    diskOperations: {
      write: diskWriteOperation, // DISK_WRITE si wasDirty
      read: loadResult.diskOperation, // DISK_READ o DISK_ALLOCATE
    },
    hadDiskIO: hadDiskWrite || loadResult.hadDiskIO, // Hubo I/O si hubo WRITE o READ
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
    origin: loadResult.origin,
    timestamp,
    clockPointerAfter: newPointer,
    attempts,
    diskOperations: {
      write: diskWriteOperation,
      read: loadResult.diskOperation,
    },
    hadDiskIO: hadDiskWrite || loadResult.hadDiskIO, // Propagar bandera de I/O
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
  
  // Filtrar solo eventos de reemplazo (que tienen victim)
  const replacements = replacementHistory.filter(e => e.type === 'PAGE_REPLACEMENT');
  const loads = replacementHistory.filter(e => e.type === 'PAGE_LOAD');
  
  const dirtyReplacements = replacements.filter(e => e.victim?.wasDirty).length;
  const cleanReplacements = replacements.length - dirtyReplacements;

  // Calcular promedio de intentos del algoritmo Clock (solo para reemplazos)
  const avgAttempts = replacements.length > 0
    ? replacements.reduce((sum, e) => sum + (e.attempts || 0), 0) / replacements.length
    : 0;

  // Contar reemplazos por proceso
  const victimsByProcess = {};
  const loadsByProcess = {};

  replacementHistory.forEach(event => {
    if (event.victim) {
      victimsByProcess[event.victim.pid] = (victimsByProcess[event.victim.pid] || 0) + 1;
    }
    if (event.loaded) {
      loadsByProcess[event.loaded.pid] = (loadsByProcess[event.loaded.pid] || 0) + 1;
    }
  });

  return {
    totalEvents: total,
    totalReplacements: replacements.length,
    totalLoads: loads.length,
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
