/**
 * Motor de simulación para auto-transición de procesos.
 * Soporta modos: manual-only, semi-auto, full-auto.
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
let mode = "manual"; // 'manual', 'semi-auto', 'auto'
let speed = 1000; // ms entre transiciones (0 = pausa)
let timer = null;
let onUpdate = null; // callback para notificar cambios
let processes = [];

/**
 * Configura el callback para notificar cambios en los procesos.
 * @param {function} cb
 */
export function setUpdateCallback(cb) {
  onUpdate = cb;
}

/**
 * Configura el modo del motor.
 * @param {'manual'|'semi-auto'|'auto'} newMode
 */
export function setMode(newMode) {
  mode = newMode;
  if (timer) stop();
  if (mode !== "manual" && speed > 0) start();
}

/**
 * Configura la velocidad del motor (ms entre pasos).
 * @param {number} newSpeed
 */
export function setSpeed(newSpeed) {
  speed = newSpeed;
  if (timer) {
    stop();
    if (speed > 0 && mode !== "manual") start();
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

  // Mapas de transiciones automáticas
  const AUTO_TRANSITIONS = {
    [STATES.NEW]: (proc) => admit(proc, "auto"),
    [STATES.READY]: (proc) => assignCPU(proc, "auto"),
    [STATES.RUNNING]: (proc) =>
      Math.random() < 0.5 ? terminate(proc, "auto") : requestIO(proc, "auto"),
    [STATES.WAITING]: (proc) => ioComplete(proc, "auto"),
  };

  const SEMI_AUTO_TRANSITIONS = {
    [STATES.NEW]: (proc) => admit(proc, "semi-auto"),
    [STATES.READY]: (proc) => assignCPU(proc, "semi-auto"),
    // Otros estados requieren intervención manual
  };

  processes.forEach((proc) => {
    if (mode === "auto" && AUTO_TRANSITIONS[proc.state]) {
      AUTO_TRANSITIONS[proc.state](proc);
      updated = true;
    } else if (mode === "semi-auto" && SEMI_AUTO_TRANSITIONS[proc.state]) {
      SEMI_AUTO_TRANSITIONS[proc.state](proc);
      updated = true;
    }
    // Modo manual: solo avanza si se llama manualmente
  });
  if (updated && typeof onUpdate === "function") {
    onUpdate(processes);
  }
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
  stop();
  processes = [];
  onUpdate = null;
  mode = "manual";
  speed = 1000;
}

// Exporta el estado actual del motor
export function getEngineState() {
  return { mode, speed, running: !!timer };
}
