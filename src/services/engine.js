/**
 * Motor de simulación para auto-transición de procesos.
 * Soporta modos: manual-only, full-auto.
 * Permite pausar, cambiar velocidad y respeta reglas válidas de transición.
 */
import {
  admit,
  assignCPU,
  preempt,
  requestIO,
  ioComplete,
  terminate,
  STATES,
} from "./fsm.js";

// Estado interno del motor
let mode = "manual"; // 'manual', 'auto'
let speed = 6000; // ms base entre transiciones
let timer = null;
let onUpdate = null; // callback para notificar cambios
let processes = [];
let onModeChange = null;
let processTimers = new Map(); // Map de pid -> {timer, nextTransitionTime}

// Temporizador global para detectar inactividad en modo manual
let manualInactivityTimer = null;
let MANUAL_INACTIVITY_TIMEOUT = 45000;

/**
 * Configura el callback para notificar cambios en los procesos.
 * @param {function} cb
 */
export function setUpdateCallback(cb) {
  onUpdate = cb;
}
/**
 * callback para notificar cambios en el modo de ejecución del motor.
 * @param {function} cb
 */
export function setModeChangeCallback(cb) {
  onModeChange = cb;
}

/**
 * Función para permitir cambios en el tiempo de inactividad del motor.
 * @param {function} ms Nuevo tiempo en ms (default 45000 ms)
 */
export function setManualInactivityTimeout(ms) {
  MANUAL_INACTIVITY_TIMEOUT = ms;
  // Si hay un timer activo, reinícialo con el nuevo valor
  resetManualInactivityTimer();
}

/**
 * Configura el modo del motor.
 * @param {'manual'|'auto'} newMode
 */
export function setMode(newMode) {
  mode = newMode;
  if (timer) stop();
  // Limpiar todos los timers de procesos individuales
  stopAllProcessTimers();
  
  if (mode === "auto" && speed > 0) start();
  // Limpiar temporizador de inactividad si no es manual
  if (mode !== "manual") {
    if (manualInactivityTimer) {
      clearTimeout(manualInactivityTimer);
      manualInactivityTimer = null;
    }
  }
  if (typeof onModeChange === "function") {
    onModeChange(mode);
  }
}

/**
 * Configura la velocidad del motor (ms entre pasos).
 * @param {number} newSpeed
 */
export function setSpeed(newSpeed) {
  speed = newSpeed;
  if (timer || processTimers.size > 0) {
    stop();
    stopAllProcessTimers();
    if (speed > 0 && mode === "auto") start();
  }
}

/**
 * Inicia el motor de auto-transición.
 * @param {Array} procList - lista de procesos
 */
export function start(procList = processes) {
  processes = procList;
  if (timer) stop();
  stopAllProcessTimers();
  
  if (speed === 0 || mode === "manual") return;
  
  // Inicia timers independientes para cada proceso
  scheduleAllProcesses();
}

/**
 * Pausa el motor.
 */
export function pause() {
  stop();
  stopAllProcessTimers();
}

/**
 * Detiene el timer interno.
 */
export function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/**
 * Detiene todos los timers de procesos individuales
 */
function stopAllProcessTimers() {
  processTimers.forEach((timerData) => {
    if (timerData.timer) {
      clearTimeout(timerData.timer);
    }
  });
  processTimers.clear();
}

/**
 * Programa todos los procesos para que transicionen de forma independiente
 */
function scheduleAllProcesses() {
  if (!processes || processes.length === 0) return;
  
  processes.forEach((proc) => {
    // Solo programar procesos que no están en estado terminal o que pueden transicionar
    if (proc.state !== STATES.TERMINATED && canAutoTransition(proc.state)) {
      scheduleProcess(proc);
    }
  });
}

/**
 * Verifica si un proceso en un estado dado puede hacer auto-transición
 */
function canAutoTransition(state) {
  return [STATES.NEW, STATES.READY, STATES.RUNNING, STATES.WAITING].includes(state);
}

/**
 * Programa un proceso individual para su próxima transición
 * @param {Object} proc - proceso a programar
 */
function scheduleProcess(proc) {
  // Si el proceso ya tiene un timer, cancelarlo
  if (processTimers.has(proc.pid)) {
    const existing = processTimers.get(proc.pid);
    if (existing.timer) {
      clearTimeout(existing.timer);
    }
  }
  
  // Calcular un tiempo aleatorio basado en la velocidad base
  // Variación entre 0.7x y 1.5x del tiempo base para dar más naturalidad
  const variation = 0.7 + Math.random() * 0.8; // rango [0.7, 1.5]
  const delay = Math.floor(speed * variation);
  
  // Programar la transición
  const timerId = setTimeout(() => {
    executeProcessTransition(proc.pid);
  }, delay);
  
  processTimers.set(proc.pid, {
    timer: timerId,
    nextTransitionTime: Date.now() + delay
  });
}

/**
 * Ejecuta la transición de un proceso específico
 * @param {number} pid - ID del proceso
 */
function executeProcessTransition(pid) {
  // Buscar el proceso actual
  const proc = processes.find((p) => p.pid === pid);
  
  if (!proc || proc.state === STATES.TERMINATED) {
    // Limpiar timer si el proceso ya no existe o está terminado
    processTimers.delete(pid);
    return;
  }
  
  let updated = false;
  let newProc = null;
  
  // Transiciones automáticas según el estado
  try {
    switch (proc.state) {
      case STATES.NEW:
        newProc = admit(proc, "auto");
        updated = true;
        break;
      
      case STATES.READY:
        newProc = assignCPU(proc, "auto");
        updated = true;
        break;
      
      case STATES.RUNNING:
        const r = Math.random();
        if (r < 0.33) {
          newProc = terminate(proc, "auto");
        } else if (r < 0.66) {
          newProc = requestIO(proc, "auto");
        } else {
          newProc = preempt(proc, "auto"); // vuelve a READY
        }
        updated = true;
        break;
      
      case STATES.WAITING:
        newProc = ioComplete(proc, "auto");
        updated = true;
        break;
    }
    
    if (updated && newProc) {
      // Actualizar el proceso en la lista
      const index = processes.findIndex((p) => p.pid === pid);
      if (index !== -1) {
        processes[index] = newProc;
      }
      
      // Notificar cambios
      if (typeof onUpdate === "function") {
        const cloned = processes.map((p) => ({ ...p }));
        onUpdate(cloned);
      }
      
      // Reprogramar el proceso si no está terminado y puede seguir transicionando
      if (newProc.state !== STATES.TERMINATED && canAutoTransition(newProc.state)) {
        scheduleProcess(newProc);
      } else {
        // Limpiar timer si el proceso terminó
        processTimers.delete(pid);
      }
    }
  } catch (error) {
    console.error(`Error en transición automática del proceso ${pid}:`, error);
    processTimers.delete(pid);
  }
}

/**
 * Realiza un paso de simulación según el modo.
 * Aplica transiciones automáticas válidas.
 * DEPRECATED: Ahora se usa scheduleProcess en su lugar
 */
export function step() {
  if (!processes || processes.length === 0) return;
  let updated = false;

  // Transiciones automáticas (solo uno por estado)
  const AUTO_TRANSITIONS = {
    [STATES.NEW]: (proc) => admit(proc, "auto"),
    [STATES.READY]: (proc) => assignCPU(proc, "auto"),
    [STATES.RUNNING]: (proc) => {
      const r = Math.random();
      if (r < 0.33) return terminate(proc, "auto");
      if (r < 0.66) return requestIO(proc, "auto");
      return preempt(proc, "auto"); // vuelve a READY
    },

    [STATES.WAITING]: (proc) => ioComplete(proc, "auto"),
  };

  // Agrupa procesos por estado
  const stateGroups = {};
  processes.forEach((proc) => {
    if (!stateGroups[proc.state]) stateGroups[proc.state] = [];
    stateGroups[proc.state].push(proc);
  });

  Object.keys(AUTO_TRANSITIONS).forEach((state) => {
    const group = stateGroups[state];
    if (group && group.length > 0 && mode === "auto") {
      // Solo el primero de cada estado transiciona
      AUTO_TRANSITIONS[state](group[0]);
      updated = true;
    }
  });
  if (updated && typeof onUpdate === "function") {
    // Enviar copia profunda para forzar re-render en React
    const cloned = processes.map((p) => ({ ...p }));
    onUpdate(cloned);
  }
}

// Reinicia el temporizador global de inactividad en modo manual
export function resetManualInactivityTimer() {
  // Limpia cualquier timer activo primero
  if (manualInactivityTimer) {
    clearTimeout(manualInactivityTimer);
    manualInactivityTimer = null;
  }
  // Si está desactivado, no hagas nada más
  if (MANUAL_INACTIVITY_TIMEOUT === Infinity) return;
  if (mode !== "manual") return;
  manualInactivityTimer = setTimeout(() => {
    if (mode === "manual") {
      setMode("auto");
    }
  }, MANUAL_INACTIVITY_TIMEOUT);
}
/**
 * Resetear la simulación a estado inicial.
 */
export function reset() {
  processes = [];
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  stopAllProcessTimers();
  if (manualInactivityTimer) {
    clearTimeout(manualInactivityTimer);
    manualInactivityTimer = null;
  }
  mode = "manual";
  if (typeof onUpdate === "function") onUpdate(processes);
  if (typeof onModeChange === "function") onModeChange(mode);
}

/**
 * Actualiza la lista de procesos (ej: si cambia desde el contexto)
 * @param {Array} procList
 */
export function setProcesses(procList) {
  const oldPids = new Set(processes.map(p => p.pid));
  const newPids = new Set(procList.map(p => p.pid));
  
  processes = procList;
  
  // Si estamos en modo auto, programar nuevos procesos
  if (mode === "auto") {
    procList.forEach((proc) => {
      // Solo programar procesos nuevos que no existían antes
      if (!oldPids.has(proc.pid) && canAutoTransition(proc.state)) {
        scheduleProcess(proc);
      }
    });
    
    // Limpiar timers de procesos que ya no existen
    processTimers.forEach((_, pid) => {
      if (!newPids.has(pid)) {
        const timerData = processTimers.get(pid);
        if (timerData && timerData.timer) {
          clearTimeout(timerData.timer);
        }
        processTimers.delete(pid);
      }
    });
  }
}

/**
 * Limpia el motor y callback
 */
export function resetEngine() {
  stop(); // detiene el setInterval
  stopAllProcessTimers(); // detiene todos los timers de procesos
  processes = [];
  onUpdate = null;
  mode = "manual";
  speed = 6000;

  // limpia el temporizador de inactividad manual si estaba activo
  if (manualInactivityTimer) {
    clearTimeout(manualInactivityTimer);
    manualInactivityTimer = null;
  }
}

// Exporta el estado actual del motor
export function getEngineState() {
  return { mode, speed, running: !!timer };
}
