import { getTimestamp } from "../utils/time.js";
import * as MMU from "./mmu.js";
import * as Disk from "./disk.js";

// Configuración de callbacks para notificar cambios
let transitionConfig = {
  onMemoryUpdate: null, // Callback para notificar actualizaciones de memoria
};

/**
 * Configura el callback de actualización de memoria
 * @param {Function} callback - Función a llamar cuando se actualice la memoria
 */
export function setMemoryUpdateCallback(callback) {
  transitionConfig.onMemoryUpdate = callback;
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
    
    // Simular accesos a memoria cuando el proceso está en ejecución
    // Hacerlo de forma no bloqueante (fire-and-forget) pero notificar cuando termine
    simulateMemoryAccess(process).then(memoryAccessResult => {
      if (memoryAccessResult) {
        // Si hubo un page fault, registrarlo
        if (memoryAccessResult.pageFault) {
          process.memory.pageFaults += 1;
          process.syscalls.push({
            type: "PAGE_FAULT",
            at: getTimestamp(),
            pageNumber: memoryAccessResult.pageNumber,
            handled: memoryAccessResult.handled,
          });
        }
        process.memory.memoryAccesses += 1;
        
        // Notificar cambio de memoria después de operaciones async (especialmente escrituras dirty)
        // Esto asegura que la UI se actualice después de escrituras al disco
        if (transitionConfig.onMemoryUpdate) {
          transitionConfig.onMemoryUpdate();
        }
      }
    }).catch(err => {
      console.error('Error in memory access simulation:', err);
    });
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
  const maxAddress = process.memory.numPages * pageSize;

  // Generar dirección lógica aleatoria dentro del espacio de direcciones del proceso
  const logicalAddress = Math.floor(Math.random() * maxAddress);

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
    // Page Fault detectado - intentar manejarlo
    const faultResult = await MMU.handlePageFault(process.pid, translationResult.pageNumber);

    if (faultResult.success && isWrite) {
      // Si el acceso original era ESCRITURA, marcar como dirty después de cargar
      // (Comportamiento realista: escritura que causó page fault marca página como dirty)
      MMU.markPageAsModified(process.pid, translationResult.pageNumber);
      
      // IMPORTANTE: Actualizar el disco para reflejar que la página es dirty
      // Si la página fue allocatePage() como clean, ahora debe ser dirty en disco también
      await Disk.writePage(process.pid, translationResult.pageNumber, null, true);
    }

    return {
      success: faultResult.success,
      pageFault: true,
      pageNumber: translationResult.pageNumber,
      logicalAddress,
      handled: faultResult.success,
      isWrite, // Indica el tipo de acceso original
      faultResult,
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
