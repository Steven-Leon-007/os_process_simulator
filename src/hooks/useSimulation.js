import { useReducer, useCallback, useRef } from "react";
import * as fsm from "../services/fsm.js";
import { generatePID } from "../services/pidGenerator.js";
import * as engine from "../services/engine.js";

const initialState = {
  processes: [], // array of process objects
  selectedPid: null,
};

function reducer(state, action, memoryCallback) {
  switch (action.type) {
    case "CREATE": {
      // Si ya viene un PID desde afuera, usarlo. Si no, generar uno nuevo
      const pid = action.pid || generatePID();
      const p = fsm.createProcess(
        pid, 
        action.priority ?? 0,
        action.numPages ?? 4,
        action.initialLoadedPages ?? 2
      );
      // Notificar cambio de memoria
      if (memoryCallback) memoryCallback();
      return { ...state, processes: [...state.processes, p], selectedPid: pid };
    }
    case "UPDATE_PROCESS": {
      const updated = state.processes.map((pr) =>
        pr.pid === action.pid ? { ...action.process } : pr
      );
      // Notificar cambio de memoria
      if (memoryCallback) memoryCallback();
      return { ...state, processes: updated };
    }
    case "SELECT":
      return { ...state, selectedPid: action.pid };
    case "SET":
      // Notificar cambio de memoria cuando se actualizan procesos
      if (action.payload?.processes && memoryCallback) {
        memoryCallback();
      }
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export default function useSimulation() {
  const memoryCallbackRef = useRef(null);
  
  const [state, dispatchBase] = useReducer((state, action) => {
    return reducer(state, action, memoryCallbackRef.current);
  }, initialState);

  const dispatch = useCallback((action) => {
    dispatchBase(action);
  }, []);

  const create = useCallback((priority) => {
    const realPriority =
      typeof priority === "number" ? priority : Math.floor(Math.random() * 10);
    
    // Número aleatorio de páginas entre 3 y 6
    const numPages = Math.floor(Math.random() * 4) + 3;
    // Cargar inicialmente entre 1 y 2 páginas
    const initialLoadedPages = Math.floor(Math.random() * 2) + 1;
    
    // Generar PID aquí para evitar doble generación en StrictMode
    const pid = generatePID();
    
    dispatch({ 
      type: "CREATE", 
      pid,  // Pasar el PID generado
      priority: realPriority,
      numPages,
      initialLoadedPages,
    });
    engine.resetManualInactivityTimer();
  }, []);

  const admit = useCallback(
    (pid, cause = "manual") => {
      const proc = state.processes.find((p) => p.pid === pid);
      if (!proc) throw new Error(`PID ${pid} no encontrado`);

      try {
        const newProc = fsm.admit({ ...proc }, cause);
        dispatch({ type: "UPDATE_PROCESS", pid, process: newProc });
        engine.resetManualInactivityTimer();
      } catch (e) {
        console.error(`Error admitting process ${pid}:`, e.message);
        throw e;
      }
    },
    [state.processes]
  );

  const assignCPU = useCallback(
    (pid, cause = "manual") => {
      const proc = state.processes.find((p) => p.pid === pid);
      if (!proc) throw new Error("PID no encontrado");
      const newProc = fsm.assignCPU({ ...proc }, cause);
      dispatch({ type: "UPDATE_PROCESS", pid, process: newProc });
      engine.resetManualInactivityTimer();
    },
    [state.processes]
  );

  const preempt = useCallback(
    (pid, cause = "manual") => {
      const proc = state.processes.find((p) => p.pid === pid);
      if (!proc) throw new Error("PID no encontrado");
      const newProc = fsm.preempt({ ...proc }, cause);
      dispatch({ type: "UPDATE_PROCESS", pid, process: newProc });
      engine.resetManualInactivityTimer();
    },
    [state.processes]
  );

  const requestIO = useCallback(
    (pid, cause = "manual") => {
      const proc = state.processes.find((p) => p.pid === pid);
      if (!proc) throw new Error("PID no encontrado");
      const newProc = fsm.requestIO({ ...proc }, cause);
      dispatch({ type: "UPDATE_PROCESS", pid, process: newProc });
      engine.resetManualInactivityTimer();
    },
    [state.processes]
  );

  const ioComplete = useCallback(
    (pid, cause = "manual") => {
      const proc = state.processes.find((p) => p.pid === pid);
      if (!proc) throw new Error("PID no encontrado");
      const newProc = fsm.ioComplete({ ...proc }, cause);
      dispatch({ type: "UPDATE_PROCESS", pid, process: newProc });
      engine.resetManualInactivityTimer();
    },
    [state.processes]
  );

  const terminate = useCallback(
    (pid, cause = "manual") => {
      const proc = state.processes.find((p) => p.pid === pid);
      if (!proc) throw new Error("PID no encontrado");
      const newProc = fsm.terminate({ ...proc }, cause);
      dispatch({ type: "UPDATE_PROCESS", pid, process: newProc });
      engine.resetManualInactivityTimer();
    },
    [state.processes]
  );

  const accessMemory = useCallback(
    (pid, logicalAddress) => {
      const proc = state.processes.find((p) => p.pid === pid);
      if (!proc) throw new Error("PID no encontrado");
      
      // Crear copia del proceso
      const procCopy = { ...proc };
      
      // Acceder a memoria
      const result = fsm.accessMemory(procCopy, logicalAddress);
      
      // Actualizar el proceso con los cambios (incremento de contadores, etc.)
      dispatch({ type: "UPDATE_PROCESS", pid, process: procCopy });
      
      return result;
    },
    [state.processes]
  );

  const setMemoryCallback = useCallback((callback) => {
    memoryCallbackRef.current = callback;
  }, []);

  return {
    state,
    create,
    admit,
    assignCPU,
    preempt,
    requestIO,
    ioComplete,
    terminate,
    accessMemory,
    dispatch,
    setMemoryCallback,
  };
}
