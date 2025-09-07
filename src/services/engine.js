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

// Mapa para temporizadores de inactividad por proceso
let inactivityTimers = {};

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
  // Limpiar temporizadores de inactividad si no es manual
  if (mode !== "manual") {
    Object.values(inactivityTimers).forEach(clearTimeout);
    inactivityTimers = {};
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

  // Transiciones automáticas
  const AUTO_TRANSITIONS = {
    [STATES.NEW]: (proc) => admit(proc, "auto"),
    [STATES.READY]: (proc) => assignCPU(proc, "auto"),
    [STATES.RUNNING]: (proc) =>
      Math.random() < 0.5 ? terminate(proc, "auto") : requestIO(proc, "auto"),
    [STATES.WAITING]: (proc) => ioComplete(proc, "auto"),
  };

  processes.forEach((proc) => {
    if (mode === "auto" && AUTO_TRANSITIONS[proc.state]) {
      AUTO_TRANSITIONS[proc.state](proc);
      updated = true;
    }
    // En modo manual, no avanza automáticamente aquí
  });
  if (updated && typeof onUpdate === "function") {
    // Enviar copia profunda para forzar re-render en React
    const cloned = processes.map(p => ({ ...p }));
    onUpdate(cloned);
  }
}

// Lógica para avance por inactividad en modo manual
function setProcessActivity(proc) {
  if (mode !== "manual") return;
  // Reinicia el temporizador de inactividad para este proceso
  if (inactivityTimers[proc.pid]) {
    clearTimeout(inactivityTimers[proc.pid]);
  }
  inactivityTimers[proc.pid] = setTimeout(() => {
    // Solo avanza si sigue en modo manual y el proceso sigue en el mismo estado
    if (mode === "manual") {
      // Solo avanza si hay transición automática posible
      const AUTO_TRANSITIONS = {
        [STATES.NEW]: (p) => admit(p, "manual-inactivity"),
        [STATES.READY]: (p) => assignCPU(p, "manual-inactivity"),
        [STATES.RUNNING]: (p) => terminate(p, "manual-inactivity"),
        [STATES.WAITING]: (p) => ioComplete(p, "manual-inactivity"),
      };
        if (AUTO_TRANSITIONS[proc.state]) {
          AUTO_TRANSITIONS[proc.state](proc);
          if (typeof onUpdate === "function") {
            const cloned = processes.map(p => ({ ...p }));
            onUpdate(cloned);
          }
        }
    }
  }, 10000); // 10 segundos
}

// Debes llamar a setProcessActivity(proc) cada vez que el usuario interactúe con el proceso manualmente

/**
 * Actualiza la lista de procesos (ej: si cambia desde el contexto)
 * @param {Array} procList
 */
export function setProcesses(procList) {
  processes = procList;
  // Reiniciar temporizadores de inactividad si estamos en modo manual
  if (mode === "manual") {
    processes.forEach(proc => setProcessActivity(proc));
  }
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
  Object.values(inactivityTimers).forEach(clearTimeout);
  inactivityTimers = {};
}

// Exporta el estado actual del motor
export function getEngineState() {
  return { mode, speed, running: !!timer };
}
