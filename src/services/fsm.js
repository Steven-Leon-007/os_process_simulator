import { getTimestamp } from "../utils/time.js";
import * as MMU from "./mmu.js";
import * as Disk from "./disk.js";

// Configuración de callbacks para notificar cambios
let transitionConfig = {
  onMemoryUpdate: null, // Callback para notificar actualizaciones de memoria
  onProcessUpdate: null, // Callback para notificar actualizaciones de procesos (para bloqueo I/O)
};

/**
 * Configura el callback de actualización de memoria
 * @param {Function} callback - Función a llamar cuando se actualice la memoria
 */
export function setMemoryUpdateCallback(callback) {
  transitionConfig.onMemoryUpdate = callback;
}

/**
 * Configura el callback de actualización de procesos
 * @param {Function} callback - Función a llamar cuando un proceso cambie de estado
 */
export function setProcessUpdateCallback(callback) {
  transitionConfig.onProcessUpdate = callback;
}

/**
 * Estados posibles de un proceso.
 */
export const STATES = {
  /**
   * El proceso acaba de crearse.
   */
  NEW: "New",
  /**
   * El proceso está en la cola de listos y puede ser seleccionado
   * para asignarle la CPU.
   */
  READY: "Ready",
  /**
   * El proceso está actualmente en ejecución.
   */
  RUNNING: "Running",
  /**
   * El proceso está esperando por una operación de I/O.
   */
  WAITING: "Waiting",
  /**
   * El proceso ha finalizado.
   */
  TERMINATED: "Terminated",
};

/**
 * Mapa de transiciones de estado válidas.
 *
 * Las claves son los estados de origen y los valores son arrays de
 * estados de destino posibles.
 */
const VALID_TRANSITIONS = {
  [STATES.NEW]: [STATES.READY],
  [STATES.READY]: [STATES.RUNNING],
  [STATES.RUNNING]: [STATES.READY, STATES.WAITING, STATES.TERMINATED],
  [STATES.WAITING]: [STATES.READY],
  [STATES.TERMINATED]: [], // no hay salida
};

/**
 * Crea un proceso inicial
 *
 * @param {string} pid PID del proceso
 * @param {number} [priority=0] Prioridad del proceso (0-9)
 * @param {number} [numPages=4] Número de páginas lógicas del proceso
 * @param {number} [initialLoadedPages=2] Número de páginas a cargar inicialmente
 * @returns Un objeto que representa el proceso
 */
export function createProcess(pid, priority, numPages = 4, initialLoadedPages = 2) {
  const now = getTimestamp();
  
  // Registrar proceso en la MMU y crear su tabla de páginas
  MMU.registerProcess(pid, numPages);
  
  // Intentar cargar páginas iniciales (puede fallar si no hay marcos libres)
  const allocationResult = MMU.allocateFramesForProcess(pid, initialLoadedPages);
  
  const process = {
    pid: pid,
    state: STATES.NEW,
    createdAt: now,
    stateEnteredAt: now,
    priority: priority ?? 0,
    pc: 0,
    cpuRegisters: {},
    syscalls: [],
    history: [],
    // Información de memoria
    memory: {
      numPages: numPages,
      loadedPages: allocationResult.allocatedFrames.length,
      pageFaults: 0,
      memoryAccesses: 0,
    },
  };

  // Registrar asignación de memoria en syscalls
  if (allocationResult.allocatedFrames.length > 0) {
    process.syscalls.push({
      type: "MEMORY_INIT",
      at: now,
      allocatedFrames: allocationResult.allocatedFrames,
    });
  }

  return process;
}

/**
 * Aplica una transición de estado con validación.
 *
 * Verifica que el estado actual (`fromState`) permita una transición
 * hacia el estado `toState`. Si no es así, lanza un error. De lo
 * contrario, actualiza el estado actual y el historial de
 * transiciones.
 *
 * @param {object} process Proceso que se va a transicionar
 * @param {string} toState Estado de destino
 * @param {string} [cause="manual"] Causa de la transición
 * @returns El proceso transicionado
 */
function transition(process, toState, cause = "manual") {
  const fromState = process.state;
  const allowed = VALID_TRANSITIONS[fromState];

  if (!allowed.includes(toState)) {
    throw new Error(
      `Transición inválida: ${fromState} → ${toState} (PID ${process.pid})`
    );
  }

  const now = getTimestamp();
  // Simulación de cambios en registros y syscalls
  // Ejemplo: cada vez que se asigna CPU, pc aumenta y se modifica un registro
  if (toState === STATES.RUNNING) {
    process.pc += 1;
    process.cpuRegisters["AX"] = (process.cpuRegisters["AX"] || 0) + 10;
    process.syscalls.push({ type: "CPU_ASSIGN", at: now });
    
    // Simular MÚLTIPLES accesos a memoria cuando el proceso está en ejecución
    // Un proceso en ejecución típicamente hace varios accesos a memoria
    const numAccesses = Math.floor(Math.random() * 3) + 2; // Entre 2 y 4 accesos
    
    // Ejecutar accesos secuencialmente con un delay inicial
    // para que la UI tenga tiempo de mostrar el estado RUNNING
    (async () => {
      // Esperar 500ms para que la UI muestre el estado RUNNING
      await new Promise(resolve => setTimeout(resolve, 500));
      
      for (let i = 0; i < numAccesses; i++) {
        try {
          const memoryAccessResult = await simulateMemoryAccess(process);
          
          if (memoryAccessResult) {
            // Si hubo un page fault, registrarlo
            if (memoryAccessResult.pageFault) {
              process.memory.pageFaults += 1;
              process.syscalls.push({
                type: "PAGE_FAULT",
                at: getTimestamp(),
                pageNumber: memoryAccessResult.pageNumber,
                handled: memoryAccessResult.handled,
                hadDiskIO: memoryAccessResult.hadDiskIO || false,
              });
            }
            process.memory.memoryAccesses += 1;
            
            // Notificar cambio de memoria después de operaciones async
            if (transitionConfig.onMemoryUpdate) {
              transitionConfig.onMemoryUpdate();
            }
          }
          
          // Si el proceso ya no está en RUNNING/WAITING, detener accesos
          if (process.state !== STATES.RUNNING && process.state !== STATES.WAITING) {
            break;
          }
        } catch (err) {
          console.error('Error in memory access simulation:', err);
          break;
        }
      }
    })();
  }
  if (toState === STATES.WAITING) {
    process.cpuRegisters["IO_WAIT"] = now;
    process.syscalls.push({ type: "IO_REQUEST", at: now });
  }
  if (toState === STATES.READY && fromState === STATES.WAITING) {
    process.cpuRegisters["IO_DONE"] = now;
    process.syscalls.push({ type: "IO_COMPLETE", at: now });
  }
  if (toState === STATES.TERMINATED) {
    process.cpuRegisters["END"] = now;
    process.syscalls.push({ type: "TERMINATE", at: now });

    // Liberar todos los marcos de memoria del proceso
    const freeResult = MMU.freeFramesOfProcess(process.pid);
    if (freeResult.success) {
      process.syscalls.push({
        type: "MEMORY_FREE",
        at: now,
        freedFrames: freeResult.freedFrames,
        count: freeResult.count,
      });
    }

    // Desregistrar proceso de la MMU
    MMU.unregisterProcess(process.pid);
  }
  // Actualizar historial, guardando el estado actual de pc, cpuRegisters y syscalls
  process.history.push({
    from: fromState,
    to: toState,
    timestamp: now,
    cause,
    pc: process.pc,
    cpuRegisters: JSON.parse(JSON.stringify(process.cpuRegisters)),
    syscalls: JSON.parse(JSON.stringify(process.syscalls)),
    priority: process.priority,
  });

  // Cambiar estado
  process.state = toState;
  process.stateEnteredAt = now;

  return process;
}

/**
 * Admite un proceso nuevo.
 *
 * El proceso se pone en cola de listos.
 *
 * @param {object} process Proceso a admitir
 * @param {string} [cause="manual"] Causa de la transición
 * @returns El proceso admitido
 */
export function admit(process, cause) {
  return transition(process, STATES.READY, cause);
}

/**
 * Asigna la CPU a un proceso.
 *
 * El proceso pasa a estar en ejecución.
 *
 * @param {object} process Proceso a asignar
 * @param {string} [cause="manual"] Causa de la transición
 * @returns El proceso con la CPU asignada
 */
export function assignCPU(process, cause) {
  return transition(process, STATES.RUNNING, cause);
}

/**
 * Desaloja un proceso de la CPU.
 *
 * El proceso pasa a estar en cola de listos.
 *
 * @param {object} process Proceso a desalojar
 * @param {string} [cause="manual"] Causa de la transición
 * @returns El proceso desalojado
 */
export function preempt(process, cause) {
  return transition(process, STATES.READY, cause);
}

/**
 * Solicita I/O para un proceso.
 *
 * El proceso pasa a estar esperando por I/O.
 *
 * @param {object} process Proceso que solicita I/O
 * @param {string} [cause="manual"] Causa de la transición
 * @returns El proceso esperando por I/O
 */
export function requestIO(process, cause) {
  return transition(process, STATES.WAITING, cause);
}

/**
 * Completa una solicitud de I/O para un proceso.
 *
 * El proceso pasa a estar en cola de listos.
 *
 * @param {object} process Proceso que completa la solicitud de I/O
 * @param {string} [cause="manual"] Causa de la transición
 * @returns El proceso con la solicitud de I/O completa
 */
export function ioComplete(process, cause) {
  return transition(process, STATES.READY, cause);
}

/**
 * Bloquea un proceso por operación de I/O de disco (page fault).
 * 
 * Esta función se llama automáticamente cuando ocurre un DISK_READ o DISK_WRITE
 * durante el manejo de un page fault.
 *
 * @param {object} process Proceso que solicita I/O de disco
 * @param {string} operation Tipo de operación ('DISK_READ' o 'DISK_WRITE')
 * @param {number} pageNumber Número de página involucrada
 * @returns El proceso bloqueado esperando I/O de disco
 */
export function blockForDiskIO(process, operation, pageNumber) {
  const cause = `disk-io:${operation}:page-${pageNumber}`;
  const now = getTimestamp();
  
  // Marcar que el proceso está bloqueado por I/O de disco
  process.cpuRegisters["DISK_IO_BLOCKED"] = now;
  process.cpuRegisters["DISK_IO_OPERATION"] = operation;
  process.cpuRegisters["DISK_IO_PAGE"] = pageNumber;
  
  // Registrar syscall específico de bloqueo por disco
  process.syscalls.push({
    type: "DISK_IO_BLOCK",
    at: now,
    operation,
    pageNumber,
  });
  
  return transition(process, STATES.WAITING, cause);
}

/**
 * Desbloquea un proceso después de completar I/O de disco.
 * 
 * Esta función se llama automáticamente cuando termina la operación de disco.
 *
 * @param {object} process Proceso que completa I/O de disco
 * @param {string} operation Tipo de operación completada
 * @param {number} pageNumber Número de página involucrada
 * @returns El proceso desbloqueado en estado READY
 */
export function unblockFromDiskIO(process, operation, pageNumber) {
  const cause = `disk-io-complete:${operation}:page-${pageNumber}`;
  const now = getTimestamp();
  
  // Limpiar registros de bloqueo de disco
  const blockedAt = process.cpuRegisters["DISK_IO_BLOCKED"];
  const duration = blockedAt ? now - blockedAt : 0;
  
  delete process.cpuRegisters["DISK_IO_BLOCKED"];
  delete process.cpuRegisters["DISK_IO_OPERATION"];
  delete process.cpuRegisters["DISK_IO_PAGE"];
  
  // Registrar syscall específico de desbloqueo por disco
  process.syscalls.push({
    type: "DISK_IO_UNBLOCK",
    at: now,
    operation,
    pageNumber,
    duration,
  });
  
  return transition(process, STATES.READY, cause);
}

/**
 * Finaliza un proceso.
 *
 * El proceso pasa a estar en estado Terminated.
 *
 * @param {object} process Proceso a finalizar
 * @param {string} [cause="manual"] Causa de la transición
 * @returns El proceso finalizado
 */
export function terminate(process, cause) {
  return transition(process, STATES.TERMINATED, cause);
}

/**
 * Simula un acceso a memoria durante la ejecución del proceso
 * Genera una dirección lógica aleatoria y la traduce usando la MMU
 *
 * @param {object} process Proceso que accede a memoria
 * @returns {Promise<object|null>} Resultado del acceso a memoria o null si hay error
 */
async function simulateMemoryAccess(process) {
  if (!process.memory) {
    return null;
  }  

  const pageSize = MMU.getPageSize();
  const numPages = process.memory.numPages;
  
  // Obtener tabla de páginas para ver cuáles están cargadas
  const pageTable = MMU.getProcessPageTable(process.pid);
  
  // Decidir si intentar acceder a una página no cargada (para forzar page faults)
  // 50% de probabilidad de acceder a página no cargada si hay páginas sin cargar
  const shouldForcePageFault = Math.random() < 0.8;
  
  let logicalAddress;
  
  if (shouldForcePageFault && pageTable) {
    // Buscar páginas no cargadas
    const unloadedPages = [];
    for (let i = 0; i < pageTable.length; i++) {
      if (pageTable[i].present === 0) {
        unloadedPages.push(i);
      }
    }
    
    if (unloadedPages.length > 0) {
      // Seleccionar una página no cargada aleatoriamente
      const targetPage = unloadedPages[Math.floor(Math.random() * unloadedPages.length)];
      // Generar dirección dentro de esa página
      const offsetInPage = Math.floor(Math.random() * pageSize);
      logicalAddress = targetPage * pageSize + offsetInPage;
    } else {
      // Todas las páginas están cargadas, generar dirección aleatoria
      logicalAddress = Math.floor(Math.random() * numPages * pageSize);
    }
  } else {
    // Generar dirección lógica aleatoria normal
    logicalAddress = Math.floor(Math.random() * numPages * pageSize);
  }

  // DECIDIR TIPO DE ACCESO ANTES DE LA TRADUCCIÓN (como en un OS real)
  // 30% escritura, 70% lectura
  const isWrite = Math.random() < 0.3;

  // Intentar traducir la dirección
  const translationResult = MMU.translateAddress(process.pid, logicalAddress);

  if (translationResult.success) {
    // Página YA está en RAM - completar el acceso
    if (isWrite) {
      // Marcar la página como modificada (dirty bit = 1)
      MMU.markPageAsModified(process.pid, translationResult.pageNumber);
    }
    
    return {
      success: true,
      logicalAddress,
      physicalAddress: translationResult.physicalAddress,
      pageNumber: translationResult.pageNumber,
      frameNumber: translationResult.frameNumber,
      pageFault: false,
      isWrite, // Indica si fue una escritura o lectura
    };
  }

  if (translationResult.pageFault) {
    // Page Fault detectado - el proceso debe bloquearse por I/O de disco
    const pageNumber = translationResult.pageNumber;
    const now = getTimestamp();
    
    // Registrar inicio de operación de I/O de disco
    process.syscalls.push({
      type: "DISK_IO_START",
      at: now,
      pageNumber,
      reason: "PAGE_FAULT",
    });
    
    // BLOQUEAR EL PROCESO: RUNNING → WAITING (transición real)
    // Esto es seguro porque solo se llama desde RUNNING
    const blockedProcess = requestIO(process, `disk-io-page-${pageNumber}`);
    
    // Notificar al contexto que el proceso cambió de estado
    if (transitionConfig.onProcessUpdate) {
      transitionConfig.onProcessUpdate(blockedProcess);
    }
    
    // Dar tiempo a la UI para mostrar el estado WAITING
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Intentar manejar el page fault (esto incluye I/O de disco y toma tiempo)
    const faultResult = await MMU.handlePageFault(process.pid, pageNumber);

    // Registrar fin de operación de I/O de disco
    const endTime = getTimestamp();
    blockedProcess.syscalls.push({
      type: "DISK_IO_END",
      at: endTime,
      pageNumber,
      duration: endTime - now,
      hadDiskIO: faultResult.hadDiskIO || false,
      success: faultResult.success,
    });

    // Después del page fault, marcar como dirty si fue escritura
    if (faultResult.success && isWrite) {
      // Si el acceso original era ESCRITURA, marcar como dirty después de cargar
      MMU.markPageAsModified(process.pid, pageNumber);
      
      // Actualizar el disco para reflejar que la página es dirty
      await Disk.writePage(process.pid, pageNumber, null, true);
    }

    // DESBLOQUEAR EL PROCESO: WAITING → READY (transición real)
    const unblockedProcess = ioComplete(blockedProcess, `disk-io-complete-page-${pageNumber}`);
    
    // Notificar al contexto que el proceso cambió de estado nuevamente
    if (transitionConfig.onProcessUpdate) {
      transitionConfig.onProcessUpdate(unblockedProcess);
    }
    
    // Dar tiempo a la UI para mostrar el estado READY antes de continuar
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: faultResult.success,
      pageFault: true,
      pageNumber,
      logicalAddress,
      handled: faultResult.success,
      isWrite, // Indica el tipo de acceso original
      faultResult,
      hadDiskIO: faultResult.hadDiskIO, // Indica si hubo I/O de disco real
    };
  }

  // Error en la traducción
  return {
    success: false,
    pageFault: false,
    error: translationResult.error,
    logicalAddress,
  };
}

/**
 * Fuerza un acceso a memoria para un proceso específico
 * Útil para testing o simulación manual
 *
 * @param {object} process Proceso que accede a memoria
 * @param {number} logicalAddress Dirección lógica a acceder
 * @returns {Promise<object>} Resultado del acceso incluyendo posibles page faults
 */
export async function accessMemory(process, logicalAddress) {
  const pageSize = MMU.getPageSize();
  const pageNumber = Math.floor(logicalAddress / pageSize);

  // Registrar el acceso
  process.memory.memoryAccesses += 1;

  // Intentar traducir la dirección
  const translationResult = MMU.translateAddress(process.pid, logicalAddress);

  if (translationResult.success) {
    return {
      success: true,
      logicalAddress,
      physicalAddress: translationResult.physicalAddress,
      pageNumber: translationResult.pageNumber,
      frameNumber: translationResult.frameNumber,
      pageFault: false,
    };
  }

  if (translationResult.pageFault) {
    // Page Fault - intentar manejarlo
    process.memory.pageFaults += 1;

    const faultResult = await MMU.handlePageFault(process.pid, pageNumber);

    // Registrar en syscalls
    const now = getTimestamp();
    process.syscalls.push({
      type: "PAGE_FAULT",
      at: now,
      pageNumber,
      logicalAddress,
      handled: faultResult.success,
    });

    // Si se manejó exitosamente, reintentar la traducción
    if (faultResult.success) {
      const retryResult = MMU.translateAddress(process.pid, logicalAddress);
      return {
        success: retryResult.success,
        pageFault: true,
        handled: true,
        pageNumber,
        logicalAddress,
        physicalAddress: retryResult.physicalAddress,
        frameNumber: retryResult.frameNumber,
      };
    }

    return {
      success: false,
      pageFault: true,
      handled: false,
      pageNumber,
      logicalAddress,
      error: faultResult.error,
    };
  }

  return {
    success: false,
    pageFault: false,
    error: translationResult.error,
    logicalAddress,
  };
}
