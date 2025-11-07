/**
 * memory.js
 * Módulo responsable de representar la memoria física (RAM) del sistema.
 * Gestiona marcos de página, bits de control y el puntero del algoritmo Clock.
 */

let memoryState = {
  totalFrames: 0,
  pageSize: 0,
  frames: [],
  clockPointer: 0,
};

/**
 * Inicializa la memoria física con la cantidad de marcos y tamaño de página especificados
 * @param {number} totalFrames - Número total de marcos de página
 * @param {number} pageSize - Tamaño de cada página en bytes
 * @returns {object} Estado inicial de la memoria
 */
export function initializeMemory(totalFrames, pageSize) {
  memoryState = {
    totalFrames,
    pageSize,
    frames: Array.from({ length: totalFrames }, (_, index) => ({
      frameNumber: index,
      pid: null,
      pageNumber: null,
      bitUso: 0,
      bitPresente: 0,
      bitModificado: 0,
    })),
    clockPointer: 0,
  };

  return { ...memoryState };
}

/**
 * Busca y retorna el primer marco libre disponible
 * @returns {number|null} Número de marco libre o null si no hay disponibles
 */
export function getFreeFrame() {
  const freeFrame = memoryState.frames.find(
    (frame) => frame.pid === null && frame.bitPresente === 0
  );

  return freeFrame ? freeFrame.frameNumber : null;
}

/**
 * Asigna un marco específico a un proceso y página
 * @param {number} frameNumber - Número del marco a asignar
 * @param {string} pid - ID del proceso
 * @param {number} pageNumber - Número de página lógica
 * @returns {boolean} true si se asignó correctamente, false si el marco no existe o está ocupado
 */
export function allocateFrame(frameNumber, pid, pageNumber) {
  if (frameNumber < 0 || frameNumber >= memoryState.totalFrames) {
    return false;
  }

  const frame = memoryState.frames[frameNumber];

  // Verificar que el marco esté libre
  if (frame.pid !== null || frame.bitPresente === 1) {
    return false;
  }

  // Asignar el marco
  frame.pid = pid;
  frame.pageNumber = pageNumber;
  frame.bitPresente = 1;
  frame.bitUso = 1; // Marcado como usado al asignar
  frame.bitModificado = 0; // Inicialmente no modificado

  return true;
}

/**
 * Libera un marco específico, limpiando toda su información
 * @param {number} frameNumber - Número del marco a liberar
 * @returns {boolean} true si se liberó correctamente, false si el marco no existe
 */
export function freeFrame(frameNumber) {
  if (frameNumber < 0 || frameNumber >= memoryState.totalFrames) {
    return false;
  }

  const frame = memoryState.frames[frameNumber];

  // Limpiar el marco
  frame.pid = null;
  frame.pageNumber = null;
  frame.bitPresente = 0;
  frame.bitUso = 0;
  frame.bitModificado = 0;

  return true;
}

/**
 * Obtiene el estado actual del puntero del algoritmo Clock
 * @returns {number} Posición actual del puntero
 */
export function getClockPointer() {
  return memoryState.clockPointer;
}

/**
 * Actualiza el puntero del algoritmo Clock
 * @param {number} newPointer - Nueva posición del puntero
 */
export function setClockPointer(newPointer) {
  if (newPointer >= 0 && newPointer < memoryState.totalFrames) {
    memoryState.clockPointer = newPointer;
  }
}

/**
 * Avanza el puntero del Clock de forma circular
 * @returns {number} Nueva posición del puntero
 */
export function advanceClockPointer() {
  memoryState.clockPointer =
    (memoryState.clockPointer + 1) % memoryState.totalFrames;
  return memoryState.clockPointer;
}

/**
 * Actualiza los bits de control de un marco específico
 * @param {number} frameNumber - Número del marco
 * @param {object} bits - Objeto con los bits a actualizar {bitUso, bitModificado}
 * @returns {boolean} true si se actualizó correctamente
 */
export function updateFrameBits(frameNumber, bits) {
  if (frameNumber < 0 || frameNumber >= memoryState.totalFrames) {
    return false;
  }

  const frame = memoryState.frames[frameNumber];

  if (bits.bitUso !== undefined) {
    frame.bitUso = bits.bitUso;
  }

  if (bits.bitModificado !== undefined) {
    frame.bitModificado = bits.bitModificado;
  }

  return true;
}

/**
 * Obtiene información completa de un marco específico
 * @param {number} frameNumber - Número del marco
 * @returns {object|null} Información del marco o null si no existe
 */
export function getFrame(frameNumber) {
  if (frameNumber < 0 || frameNumber >= memoryState.totalFrames) {
    return null;
  }

  return { ...memoryState.frames[frameNumber] };
}

/**
 * Obtiene una instantánea completa del estado actual de la memoria
 * @returns {object} Estado completo de la memoria
 */
export function getMemorySnapshot() {
  return {
    totalFrames: memoryState.totalFrames,
    pageSize: memoryState.pageSize,
    clockPointer: memoryState.clockPointer,
    frames: memoryState.frames.map((frame) => ({ ...frame })),
    usedFrames: memoryState.frames.filter((f) => f.bitPresente === 1).length,
    freeFrames: memoryState.frames.filter((f) => f.bitPresente === 0).length,
  };
}

/**
 * Cuenta cuántos marcos están ocupados por un proceso específico
 * @param {string} pid - ID del proceso
 * @returns {number} Cantidad de marcos ocupados
 */
export function getFrameCountByProcess(pid) {
  return memoryState.frames.filter(
    (frame) => frame.pid === pid && frame.bitPresente === 1
  ).length;
}

/**
 * Obtiene todos los marcos asignados a un proceso específico
 * @param {string} pid - ID del proceso
 * @returns {Array} Lista de marcos del proceso
 */
export function getFramesByProcess(pid) {
  return memoryState.frames
    .filter((frame) => frame.pid === pid && frame.bitPresente === 1)
    .map((frame) => ({ ...frame }));
}

/**
 * Reinicia completamente el estado de la memoria (útil para tests)
 */
export function resetMemory() {
  memoryState = {
    totalFrames: 0,
    pageSize: 0,
    frames: [],
    clockPointer: 0,
  };
}
