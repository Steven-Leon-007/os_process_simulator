/**
 * disk.js
 * Módulo de simulación del área de swap/disco.
 * Almacena páginas no presentes en memoria y simula operaciones de I/O.
 */

import { getTimestamp } from '../utils/time.js';

// Estructura de datos del disco (swap space)
let swapSpace = new Map(); // Key: `${pid}-${pageNumber}`, Value: pageData

// Configuración del disco
let diskConfig = {
  ioDelayMs: 1500, // Tiempo de I/O simulado en miliseconds (mínimo 1.5s)
  enabled: true, // Permite activar/desactivar delays para testing
};

// Estadísticas y logs de operaciones de disco
let diskOperations = [];

/**
 * Inicializa el módulo de disco con la configuración especificada
 * @param {number} ioDelayMs - Tiempo de delay para operaciones de I/O en ms (default: 1500)
 * @param {boolean} enabled - Habilitar delays (default: true)
 */
export function initializeDisk(ioDelayMs = 1500, enabled = true) {
  diskConfig.ioDelayMs = ioDelayMs;
  diskConfig.enabled = enabled;
  swapSpace.clear();
  diskOperations = [];
}

/**
 * Simula un delay de I/O (tiempo de acceso al disco)
 * @returns {Promise<void>}
 */
function simulateIODelay() {
  if (!diskConfig.enabled) {
    return Promise.resolve();
  }
  return new Promise(resolve => setTimeout(resolve, diskConfig.ioDelayMs));
}

/**
 * Genera la clave única para una página en el swap space
 * @param {string} pid - ID del proceso
 * @param {number} pageNumber - Número de página
 * @returns {string} Clave única
 */
function getSwapKey(pid, pageNumber) {
  return `${pid}-${pageNumber}`;
}

/**
 * Lee una página desde el disco (swap in)
 * Simula tiempo de I/O y registra la operación
 * 
 * @param {string} pid - ID del proceso
 * @param {number} pageNumber - Número de página a leer
 * @returns {Promise<object>} Resultado de la operación
 */
export async function readPage(pid, pageNumber) {
  const startTime = getTimestamp();
  const key = getSwapKey(pid, pageNumber);

  // Simular delay de I/O
  await simulateIODelay();

  const pageData = swapSpace.get(key);

  const operation = {
    type: 'DISK_READ',
    pid,
    pageNumber,
    timestamp: startTime,
    endTime: getTimestamp(),
    duration: diskConfig.ioDelayMs,
    success: !!pageData,
  };

  diskOperations.push(operation);

  if (!pageData) {
    return {
      success: false,
      error: 'Page not found in swap space',
      pid,
      pageNumber,
      operation,
    };
  }

  // Actualizar último acceso
  pageData.lastAccess = getTimestamp();

  return {
    success: true,
    pid,
    pageNumber,
    data: pageData.data,
    isDirty: pageData.isDirty,
    operation,
  };
}

/**
 * Escribe una página al disco (swap out)
 * Simula tiempo de I/O y registra la operación
 * 
 * @param {string} pid - ID del proceso
 * @param {number} pageNumber - Número de página a escribir
 * @param {any} data - Datos de la página (puede ser simulado)
 * @param {boolean} isDirty - Indica si la página fue modificada
 * @returns {Promise<object>} Resultado de la operación
 */
export async function writePage(pid, pageNumber, data = null, isDirty = false) {
  const startTime = getTimestamp();
  const key = getSwapKey(pid, pageNumber);

  // Simular delay de I/O
  await simulateIODelay();

  const pageData = {
    pid,
    pageNumber,
    data: data || { simulated: true, content: `Page ${pageNumber} of process ${pid}` },
    isDirty,
    lastAccess: getTimestamp(),
    inUse: true,
  };

  swapSpace.set(key, pageData);

  const operation = {
    type: 'DISK_WRITE',
    pid,
    pageNumber,
    timestamp: startTime,
    endTime: getTimestamp(),
    duration: diskConfig.ioDelayMs,
    isDirty,
    success: true,
  };

  diskOperations.push(operation);

  return {
    success: true,
    pid,
    pageNumber,
    isDirty,
    operation,
  };
}

/**
 * Asigna espacio en el disco para una página (sin escribir datos aún)
 * Útil para preallocación o reserva de espacio
 * 
 * @param {string} pid - ID del proceso
 * @param {number} pageNumber - Número de página a asignar
 * @returns {object} Resultado de la asignación
 */
export function allocatePage(pid, pageNumber) {
  const key = getSwapKey(pid, pageNumber);

  if (swapSpace.has(key)) {
    return {
      success: false,
      error: 'Page already allocated',
      pid,
      pageNumber,
    };
  }

  const pageData = {
    pid,
    pageNumber,
    data: null,
    isDirty: false,
    lastAccess: getTimestamp(),
    inUse: true,
  };

  swapSpace.set(key, pageData);

  const operation = {
    type: 'DISK_ALLOCATE',
    pid,
    pageNumber,
    timestamp: getTimestamp(),
    success: true,
  };

  diskOperations.push(operation);

  return {
    success: true,
    pid,
    pageNumber,
    operation,
  };
}

/**
 * Libera todas las páginas de un proceso del disco
 * Se debe llamar cuando un proceso termina
 * 
 * @param {string} pid - ID del proceso
 * @returns {object} Resultado de la liberación
 */
export function freePagesByPID(pid) {
  const keysToDelete = [];

  // Buscar todas las páginas del proceso
  for (const [key, pageData] of swapSpace.entries()) {
    if (pageData.pid === pid) {
      keysToDelete.push(key);
    }
  }

  // Eliminar las páginas
  keysToDelete.forEach(key => swapSpace.delete(key));

  const operation = {
    type: 'DISK_FREE_PROCESS',
    pid,
    pagesFreed: keysToDelete.length,
    timestamp: getTimestamp(),
    success: true,
  };

  diskOperations.push(operation);

  return {
    success: true,
    pid,
    pagesFreed: keysToDelete.length,
    operation,
  };
}

/**
 * Verifica si una página existe en el disco
 * @param {string} pid - ID del proceso
 * @param {number} pageNumber - Número de página
 * @returns {boolean} true si la página existe en swap
 */
export function pageExistsInSwap(pid, pageNumber) {
  const key = getSwapKey(pid, pageNumber);
  return swapSpace.has(key);
}

/**
 * Obtiene información de una página en el disco sin leerla
 * No simula I/O, solo consulta metadatos
 * 
 * @param {string} pid - ID del proceso
 * @param {number} pageNumber - Número de página
 * @returns {object|null} Información de la página o null si no existe
 */
export function getPageInfo(pid, pageNumber) {
  const key = getSwapKey(pid, pageNumber);
  const pageData = swapSpace.get(key);

  if (!pageData) {
    return null;
  }

  return {
    pid: pageData.pid,
    pageNumber: pageData.pageNumber,
    isDirty: pageData.isDirty,
    lastAccess: pageData.lastAccess,
    inUse: pageData.inUse,
  };
}

/**
 * Obtiene el historial completo de operaciones del disco
 * Para integración con reportEngine
 * 
 * @returns {Array} Array de operaciones de disco
 */
export function getDiskOperations() {
  return [...diskOperations];
}

/**
 * Obtiene estadísticas de uso del disco
 * @returns {object} Estadísticas del disco
 */
export function getDiskStats() {
  const totalOperations = diskOperations.length;
  const readOps = diskOperations.filter(op => op.type === 'DISK_READ').length;
  const writeOps = diskOperations.filter(op => op.type === 'DISK_WRITE').length;
  const allocateOps = diskOperations.filter(op => op.type === 'DISK_ALLOCATE').length;
  const freeOps = diskOperations.filter(op => op.type === 'DISK_FREE_PROCESS').length;

  // Calcular operaciones de escritura por dirty bit
  const dirtyWrites = diskOperations.filter(
    op => op.type === 'DISK_WRITE' && op.isDirty
  ).length;
  const cleanWrites = writeOps - dirtyWrites;

  // Tiempo total de I/O
  const totalIOTime = diskOperations
    .filter(op => op.duration)
    .reduce((sum, op) => sum + op.duration, 0);

  // Páginas por proceso en swap
  const pagesByProcess = {};
  for (const [_, pageData] of swapSpace.entries()) {
    pagesByProcess[pageData.pid] = (pagesByProcess[pageData.pid] || 0) + 1;
  }

  return {
    totalOperations,
    readOperations: readOps,
    writeOperations: writeOps,
    dirtyWrites,
    cleanWrites,
    allocateOperations: allocateOps,
    freeOperations: freeOps,
    totalIOTimeMs: totalIOTime,
    totalIOTimeSec: (totalIOTime / 1000).toFixed(2),
    currentSwapPages: swapSpace.size,
    pagesByProcess,
    ioDelayMs: diskConfig.ioDelayMs,
  };
}

/**
 * Obtiene un snapshot del estado actual del swap space
 * @returns {object} Estado del swap space
 */
export function getSwapSnapshot() {
  const pages = [];
  
  for (const [key, pageData] of swapSpace.entries()) {
    pages.push({
      pid: pageData.pid,
      pageNumber: pageData.pageNumber,
      isDirty: pageData.isDirty,
      lastAccess: pageData.lastAccess,
      inUse: pageData.inUse,
    });
  }

  return {
    totalPages: swapSpace.size,
    pages,
    timestamp: getTimestamp(),
  };
}

/**
 * Limpia el historial de operaciones de disco
 * No afecta el contenido del swap space
 */
export function clearDiskOperations() {
  diskOperations = [];
}

/**
 * Limpia completamente el swap space
 * Elimina todas las páginas almacenadas
 */
export function clearSwapSpace() {
  swapSpace.clear();
}

/**
 * Reinicia completamente el módulo de disco
 * Limpia swap space y operaciones
 */
export function resetDisk() {
  swapSpace.clear();
  diskOperations = [];
}

/**
 * Configura el delay de I/O en tiempo de ejecución
 * @param {number} delayMs - Nuevo delay en milisegundos
 */
export function setIODelay(delayMs) {
  if (delayMs >= 0) {
    diskConfig.ioDelayMs = delayMs;
  }
}

/**
 * Habilita o deshabilita los delays de I/O
 * Útil para testing
 * @param {boolean} enabled - true para habilitar, false para deshabilitar
 */
export function setIODelayEnabled(enabled) {
  diskConfig.enabled = enabled;
}

/**
 * Obtiene la configuración actual del disco
 * @returns {object} Configuración del disco
 */
export function getDiskConfig() {
  return { ...diskConfig };
}
