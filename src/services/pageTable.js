/**
 * pageTable.js
 * Define la estructura de tabla de páginas por proceso.
 * Cada proceso tiene su propia tabla de páginas para traducir direcciones lógicas a físicas.
 */

/**
 * Crea una nueva tabla de páginas para un proceso
 * @param {number} numPages - Número de páginas lógicas del proceso
 * @returns {Array} Tabla de páginas inicializada
 */
export function createPageTable(numPages) {
  return Array.from({ length: numPages }, (_, index) => ({
    pageNumber: index,
    frameNumber: null, // null indica que la página no está en memoria
    bitPresente: 0, // 0 = no está en memoria, 1 = está en memoria
    bitUso: 0, // Para el algoritmo Clock
    bitModificado: 0, // 0 = no modificada, 1 = modificada (dirty)
  }));
}

/**
 * Actualiza una entrada específica de la tabla de páginas
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @param {number} pageNumber - Número de página a actualizar
 * @param {object} updates - Objeto con los campos a actualizar
 * @returns {boolean} true si se actualizó correctamente, false si la página no existe
 */
export function updatePageEntry(pageTable, pageNumber, updates) {
  if (pageNumber < 0 || pageNumber >= pageTable.length) {
    return false;
  }

  const entry = pageTable[pageNumber];

  if (updates.frameNumber !== undefined) {
    entry.frameNumber = updates.frameNumber;
  }

  if (updates.bitPresente !== undefined) {
    entry.bitPresente = updates.bitPresente;
  }

  if (updates.bitUso !== undefined) {
    entry.bitUso = updates.bitUso;
  }

  if (updates.bitModificado !== undefined) {
    entry.bitModificado = updates.bitModificado;
  }

  return true;
}

/**
 * Obtiene una entrada específica de la tabla de páginas
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @param {number} pageNumber - Número de página a consultar
 * @returns {object|null} Entrada de la tabla o null si no existe
 */
export function getPageEntry(pageTable, pageNumber) {
  if (pageNumber < 0 || pageNumber >= pageTable.length) {
    return null;
  }

  return { ...pageTable[pageNumber] };
}

/**
 * Verifica si una página está presente en memoria
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @param {number} pageNumber - Número de página a verificar
 * @returns {boolean} true si está presente, false en caso contrario
 */
export function isPagePresent(pageTable, pageNumber) {
  if (pageNumber < 0 || pageNumber >= pageTable.length) {
    return false;
  }

  return pageTable[pageNumber].bitPresente === 1;
}

/**
 * Obtiene el número de marco asociado a una página
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @param {number} pageNumber - Número de página
 * @returns {number|null} Número de marco o null si no está en memoria
 */
export function getFrameNumber(pageTable, pageNumber) {
  const entry = getPageEntry(pageTable, pageNumber);
  return entry && entry.bitPresente === 1 ? entry.frameNumber : null;
}

/**
 * Marca una página como presente en memoria y la asocia a un marco
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @param {number} pageNumber - Número de página
 * @param {number} frameNumber - Número de marco físico asignado
 * @returns {boolean} true si se marcó correctamente
 */
export function markPagePresent(pageTable, pageNumber, frameNumber) {
  return updatePageEntry(pageTable, pageNumber, {
    frameNumber,
    bitPresente: 1,
    bitUso: 1, // Marcada como usada al cargar
  });
}

/**
 * Marca una página como no presente (expulsada de memoria)
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @param {number} pageNumber - Número de página
 * @returns {boolean} true si se marcó correctamente
 */
export function markPageAbsent(pageTable, pageNumber) {
  return updatePageEntry(pageTable, pageNumber, {
    frameNumber: null,
    bitPresente: 0,
    bitUso: 0,
  });
}

/**
 * Marca una página como modificada (dirty)
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @param {number} pageNumber - Número de página
 * @returns {boolean} true si se marcó correctamente
 */
export function markPageModified(pageTable, pageNumber) {
  return updatePageEntry(pageTable, pageNumber, {
    bitModificado: 1,
  });
}

/**
 * Marca una página como usada (para el algoritmo Clock)
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @param {number} pageNumber - Número de página
 * @returns {boolean} true si se marcó correctamente
 */
export function markPageUsed(pageTable, pageNumber) {
  return updatePageEntry(pageTable, pageNumber, {
    bitUso: 1,
  });
}

/**
 * Limpia el bit de uso de una página (para el algoritmo Clock)
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @param {number} pageNumber - Número de página
 * @returns {boolean} true si se limpió correctamente
 */
export function clearPageUseBit(pageTable, pageNumber) {
  return updatePageEntry(pageTable, pageNumber, {
    bitUso: 0,
  });
}

/**
 * Reinicia completamente una tabla de páginas (limpia todas las entradas)
 * @param {Array} pageTable - Tabla de páginas a reiniciar
 */
export function resetPageTable(pageTable) {
  pageTable.forEach((entry, index) => {
    entry.pageNumber = index;
    entry.frameNumber = null;
    entry.bitPresente = 0;
    entry.bitUso = 0;
    entry.bitModificado = 0;
  });
}

/**
 * Cuenta cuántas páginas están presentes en memoria
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @returns {number} Cantidad de páginas presentes
 */
export function countPresentPages(pageTable) {
  return pageTable.filter((entry) => entry.bitPresente === 1).length;
}

/**
 * Obtiene todas las páginas presentes en memoria
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @returns {Array} Lista de entradas presentes
 */
export function getPresentPages(pageTable) {
  return pageTable
    .filter((entry) => entry.bitPresente === 1)
    .map((entry) => ({ ...entry }));
}

/**
 * Obtiene una copia completa de la tabla de páginas
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @returns {Array} Copia de la tabla de páginas
 */
export function getPageTableSnapshot(pageTable) {
  return pageTable.map((entry) => ({ ...entry }));
}

/**
 * Busca qué página está asociada a un marco específico
 * @param {Array} pageTable - Tabla de páginas del proceso
 * @param {number} frameNumber - Número de marco a buscar
 * @returns {number|null} Número de página o null si no se encuentra
 */
export function findPageByFrame(pageTable, frameNumber) {
  const entry = pageTable.find(
    (e) => e.frameNumber === frameNumber && e.bitPresente === 1
  );
  return entry ? entry.pageNumber : null;
}
