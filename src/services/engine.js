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
let speed = 3000; // ms entre transiciones (0 = pausa)
let timer = null;
let onUpdate = null; // callback para notificar cambios
let processes = [];
let onModeChange = null;

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
  if (timer) {
    stop();
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
  if (speed === 0 || mode === "manual") return;
  timer = setInterval(() => {
    step();
  }, speed);
}

/**
 * Pausa el motor.
 */
export function pause() {
  stop();
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
 * Realiza un paso de simulación según el modo.
 * Aplica transiciones automáticas válidas.
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
  processes = procList;
}

/**
 * Limpia el motor y callback
 */
export function resetEngine() {
  stop(); // detiene el setInterval
  processes = [];
  onUpdate = null;
  mode = "manual";
  speed = 1000;

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
