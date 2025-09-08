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

// Temporizador global para detectar inactividad en modo manual
let manualInactivityTimer = null;
const MANUAL_INACTIVITY_TIMEOUT = 30000; // 30 segundos

/**
 * Configura el callback para notificar cambios en los procesos.
 * @param {function} cb
 */
export function setUpdateCallback(cb) {
  onUpdate = cb;
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
  if (mode !== "manual") return;
  if (manualInactivityTimer) {
    clearTimeout(manualInactivityTimer);
  }
  manualInactivityTimer = setTimeout(() => {
    // Si sigue en modo manual, cambia a automático
    if (mode === "manual") {
      setMode("auto");
    }
  }, MANUAL_INACTIVITY_TIMEOUT);
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
