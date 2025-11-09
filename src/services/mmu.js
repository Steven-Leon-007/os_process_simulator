/**
 * mmu.js
 * Simula la Unidad de Gestión de Memoria (MMU).
 * Traduce direcciones lógicas a físicas y maneja fallas de página.
 */

import * as Memory from './memory.js';
import * as PageTable from './pageTable.js';
import * as PageFaultHandler from './pageFaultHandler.js';
import * as Disk from './disk.js';

// Almacén de tablas de páginas por proceso
const processPageTables = new Map();

// Configuración de la MMU
let mmuConfig = {
  pageSize: 4096, // Tamaño de página por defecto en bytes
  onPageFault: null, // Callback para manejar fallas de página
};

/**
 * Inicializa la MMU con la configuración especificada
 * @param {number} pageSize - Tamaño de página en bytes
 * @param {Function} onPageFaultCallback - Callback ejecutado cuando ocurre un page fault
 */
export function initializeMMU(pageSize = 4096, onPageFaultCallback = null) {
  mmuConfig.pageSize = pageSize;
  mmuConfig.onPageFault = onPageFaultCallback;
}

/**
 * Registra un nuevo proceso con su tabla de páginas
 * @param {string} pid - ID del proceso
 * @param {number} numPages - Número de páginas lógicas del proceso
 * @returns {boolean} true si se registró correctamente
 */
export function registerProcess(pid, numPages) {
  if (processPageTables.has(pid)) {
    return false; // Proceso ya registrado
  }

  const pageTable = PageTable.createPageTable(numPages);
  processPageTables.set(pid, pageTable);

  return true;
}

/**
 * Elimina el registro de un proceso y libera sus recursos
 * Incluye liberación de páginas en disco (swap space)
 * @param {string} pid - ID del proceso
 * @returns {boolean} true si se eliminó correctamente
 */
export function unregisterProcess(pid) {
  if (!processPageTables.has(pid)) {
    return false;
  }

  // Liberar páginas del disco
  Disk.freePagesByPID(pid);

  processPageTables.delete(pid);
  return true;
}

/**
 * Obtiene la tabla de páginas de un proceso
 * @param {string} pid - ID del proceso
 * @returns {Array|null} Tabla de páginas o null si el proceso no existe
 */
export function getProcessPageTable(pid) {
  return processPageTables.get(pid) || null;
}

/**
 * Traduce una dirección lógica a dirección física
 * @param {string} pid - ID del proceso
 * @param {number} logicalAddress - Dirección lógica a traducir
 * @returns {object} Resultado de la traducción con formato:
 *   { success: boolean, physicalAddress?: number, pageFault?: boolean, pageNumber?: number, offset?: number }
 */
export function translateAddress(pid, logicalAddress) {
  const pageTable = processPageTables.get(pid);

  if (!pageTable) {
    return {
      success: false,
      error: 'Process not found',
    };
  }

  // Calcular número de página y desplazamiento
  const pageNumber = Math.floor(logicalAddress / mmuConfig.pageSize);
  const offset = logicalAddress % mmuConfig.pageSize;

  // Verificar que la página existe en la tabla
  if (pageNumber < 0 || pageNumber >= pageTable.length) {
    return {
      success: false,
      error: 'Invalid page number',
      pageNumber,
      offset,
    };
  }

  // Verificar si la página está presente en memoria
  const isPresent = PageTable.isPagePresent(pageTable, pageNumber);

  if (!isPresent) {
    // Page Fault
    return {
      success: false,
      pageFault: true,
      pageNumber,
      offset,
      logicalAddress,
    };
  }

  // Obtener el número de marco
  const frameNumber = PageTable.getFrameNumber(pageTable, pageNumber);

  if (frameNumber === null) {
    return {
      success: false,
      error: 'Frame number is null despite page being present',
      pageNumber,
      offset,
    };
  }

  // Calcular dirección física
  const physicalAddress = frameNumber * mmuConfig.pageSize + offset;

  // Marcar la página como usada (para algoritmo Clock)
  PageTable.markPageUsed(pageTable, pageNumber);

  // Actualizar bit de uso en el marco físico
  Memory.updateFrameBits(frameNumber, { bitUso: 1 });

  return {
    success: true,
    physicalAddress,
    pageNumber,
    frameNumber,
    offset,
    logicalAddress,
  };
}

/**
 * Maneja una falla de página (Page Fault)
 * Utiliza el PageFaultHandler para gestionar la asignación y reemplazo
 * @param {string} pid - ID del proceso
 * @param {number} pageNumber - Número de página que causó el fallo
 * @returns {Promise<object>} Resultado del manejo de la falla
 */
export async function handlePageFault(pid, pageNumber) {
  const pageTable = processPageTables.get(pid);

  if (!pageTable) {
    return {
      success: false,
      error: 'Process not found',
    };
  }

  // Verificar que la página existe
  if (pageNumber < 0 || pageNumber >= pageTable.length) {
    return {
      success: false,
      error: 'Invalid page number',
    };
  }

  // Ejecutar callback personalizado si existe
  if (mmuConfig.onPageFault) {
    const callbackResult = await mmuConfig.onPageFault(pid, pageNumber);
    return {
      success: true,
      handled: true,
      callbackResult,
      pageNumber,
    };
  }

  // Usar el PageFaultHandler para manejar el page fault
  const result = await PageFaultHandler.handlePageFault(pid, pageNumber, pageTable);

  // Si hubo reemplazo y se requiere actualizar la tabla de la víctima
  if (result.success && result.replacement && result.requiresVictimTableUpdate) {
    const victimPid = result.victim.pid;
    const victimPageNumber = result.victim.pageNumber;
    const victimPageTable = processPageTables.get(victimPid);

    if (victimPageTable) {
      PageFaultHandler.updateVictimPageTable(victimPageTable, victimPageNumber);
    }
  }

  return result;
}

/**
 * Asigna marcos de memoria a las páginas de un proceso
 * @param {string} pid - ID del proceso
 * @param {number} numPages - Número de páginas a asignar
 * @returns {object} Resultado de la asignación
 */
export function allocateFramesForProcess(pid, numPages) {
  const pageTable = processPageTables.get(pid);

  if (!pageTable) {
    return {
      success: false,
      error: 'Process not found',
    };
  }

  const allocatedFrames = [];
  const failedPages = [];

  for (let pageNumber = 0; pageNumber < numPages; pageNumber++) {
    // Verificar si la página ya está asignada (evitar duplicados en StrictMode)
    if (PageTable.isPagePresent(pageTable, pageNumber)) {
      const existingFrame = PageTable.getFrameNumber(pageTable, pageNumber);
      allocatedFrames.push({ pageNumber, frameNumber: existingFrame });
      continue;
    }

    // Buscar marco libre
    const freeFrame = Memory.getFreeFrame();

    if (freeFrame === null) {
      failedPages.push(pageNumber);
      continue;
    }

    // Asignar el marco
    const allocated = Memory.allocateFrame(freeFrame, pid, pageNumber);

    if (allocated) {
      PageTable.markPagePresent(pageTable, pageNumber, freeFrame);
      allocatedFrames.push({ pageNumber, frameNumber: freeFrame });
    } else {
      failedPages.push(pageNumber);
    }
  }

  return {
    success: failedPages.length === 0,
    allocatedFrames,
    failedPages,
    pid,
  };
}

/**
 * Libera todos los marcos de memoria asignados a un proceso
 * También libera las páginas del disco
 * @param {string} pid - ID del proceso
 * @returns {object} Resultado de la liberación
 */
export function freeFramesOfProcess(pid) {
  const pageTable = processPageTables.get(pid);

  if (!pageTable) {
    return {
      success: false,
      error: 'Process not found',
    };
  }

  const freedFrames = [];

  // Obtener todas las páginas presentes
  const presentPages = PageTable.getPresentPages(pageTable);

  // Liberar cada marco
  presentPages.forEach((entry) => {
    if (entry.frameNumber !== null) {
      const freed = Memory.freeFrame(entry.frameNumber);
      if (freed) {
        PageTable.markPageAbsent(pageTable, entry.pageNumber);
        freedFrames.push(entry.frameNumber);
      }
    }
  });

  // Liberar páginas del disco
  const diskResult = Disk.freePagesByPID(pid);

  return {
    success: true,
    freedFrames,
    count: freedFrames.length,
    diskPagesFreed: diskResult.pagesFreed,
    pid,
  };
}

/**
 * Marca una página como modificada (para escrituras)
 * @param {string} pid - ID del proceso
 * @param {number} pageNumber - Número de página
 * @returns {boolean} true si se marcó correctamente
 */
export function markPageAsModified(pid, pageNumber) {
  const pageTable = processPageTables.get(pid);

  if (!pageTable) {
    return false;
  }

  // Marcar en la tabla de páginas
  PageTable.markPageModified(pageTable, pageNumber);

  // Marcar en el marco físico si está presente
  const frameNumber = PageTable.getFrameNumber(pageTable, pageNumber);
  if (frameNumber !== null) {
    Memory.updateFrameBits(frameNumber, { bitModificado: 1 });
  }

  return true;
}

/**
 * Obtiene estadísticas de memoria para un proceso
 * @param {string} pid - ID del proceso
 * @returns {object|null} Estadísticas o null si el proceso no existe
 */
export function getProcessMemoryStats(pid) {
  const pageTable = processPageTables.get(pid);

  if (!pageTable) {
    return null;
  }

  const totalPages = pageTable.length;
  const presentPages = PageTable.countPresentPages(pageTable);
  const absentPages = totalPages - presentPages;

  const presentEntries = PageTable.getPresentPages(pageTable);
  const modifiedPages = presentEntries.filter((e) => e.bitModificado === 1).length;

  return {
    pid,
    totalPages,
    presentPages,
    absentPages,
    modifiedPages,
    pageTableSize: totalPages,
  };
}

/**
 * Obtiene una instantánea completa del estado de la MMU
 * @returns {object} Estado de la MMU
 */
export function getMMUSnapshot() {
  const processes = Array.from(processPageTables.keys());
  const processStats = processes.map((pid) => ({
    pid,
    stats: getProcessMemoryStats(pid),
    pageTable: PageTable.getPageTableSnapshot(processPageTables.get(pid)),
  }));

  return {
    config: { ...mmuConfig, onPageFault: mmuConfig.onPageFault ? 'defined' : null },
    totalProcesses: processes.length,
    processes: processStats,
  };
}

/**
 * Reinicia completamente la MMU (útil para tests)
 */
export function resetMMU() {
  processPageTables.clear();
  mmuConfig = {
    pageSize: 4096,
    onPageFault: null,
  };
}

/**
 * Obtiene el tamaño de página configurado
 * @returns {number} Tamaño de página en bytes
 */
export function getPageSize() {
  return mmuConfig.pageSize;
}

/**
 * Verifica si un proceso está registrado en la MMU
 * @param {string} pid - ID del proceso
 * @returns {boolean} true si está registrado
 */
export function isProcessRegistered(pid) {
  return processPageTables.has(pid);
}

/**
 * Obtiene el historial de reemplazos de páginas
 * @returns {Array} Historial de eventos de reemplazo
 */
export function getReplacementHistory() {
  return PageFaultHandler.getReplacementHistory();
}

/**
 * Obtiene estadísticas de reemplazo de páginas
 * @returns {object} Estadísticas de reemplazo
 */
export function getReplacementStats() {
  return PageFaultHandler.getReplacementStats();
}

/**
 * Obtiene el estado actual del algoritmo Clock
 * @returns {object} Estado del algoritmo Clock
 */
export function getClockState() {
  return PageFaultHandler.getClockState();
}

/**
 * Obtiene los pasos del último recorrido del algoritmo Clock
 * @returns {Array} Array de pasos { frameNumber, action }
 */
export function getClockSteps() {
  return PageFaultHandler.getClockSteps();
}

/**
 * Limpia los pasos del algoritmo Clock
 */
export function clearClockSteps() {
  return PageFaultHandler.clearClockSteps();
}

/**
 * Verifica si la memoria está completamente llena
 * @returns {boolean} true si no hay marcos libres
 */
export function isMemoryFull() {
  return PageFaultHandler.isMemoryFull();
}

/**
 * Obtiene las estadísticas de operaciones del disco
 * @returns {object} Estadísticas del disco
 */
export function getDiskStats() {
  return Disk.getDiskStats();
}

/**
 * Obtiene el historial de operaciones del disco
 * @returns {Array} Historial de operaciones de disco
 */
export function getDiskOperations() {
  return Disk.getDiskOperations();
}

/**
 * Obtiene el snapshot del swap space
 * @returns {object} Estado del swap space
 */
export function getSwapSnapshot() {
  return Disk.getSwapSnapshot();
}
