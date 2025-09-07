import { getTimestamp } from "../utils/time.js";

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
 * @returns Un objeto que representa el proceso
 */
export function createProcess(pid, priority) {
  const now = getTimestamp();
  return {
    pid,
    state: STATES.NEW,
    createdAt: now,
    stateEnteredAt: now,
    priority,
    pc: 0,
    cpuRegisters: {},
    syscalls: [],
    history: [],
  };
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
    priority: process.priority
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
