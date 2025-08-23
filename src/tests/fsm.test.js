import { describe, test, expect, beforeEach } from "vitest";
import {
  createProcess,
  admit,
  assignCPU,
  preempt,
  requestIO,
  ioComplete,
  terminate,
} from "../services/fsm.js";
import { generatePID, resetPID } from "../services/pidGenerator.js";

describe("FSM Core", () => {
  beforeEach(() => {
    resetPID(); // reinicia PIDs antes de cada prueba
  });

  // ✅ --- PRUEBAS VÁLIDAS ---
  test("New → Ready (admit)", () => {
    const p = createProcess(generatePID());
    admit(p, "test");
    expect(p.state).toBe("Ready");
  });

  test("Ready → Running (assignCPU)", () => {
    const p = createProcess(generatePID());
    admit(p);
    assignCPU(p);
    expect(p.state).toBe("Running");
  });

  test("Running → Waiting → Ready (I/O)", () => {
    const p = createProcess(generatePID());
    admit(p);
    assignCPU(p);
    requestIO(p);
    expect(p.state).toBe("Waiting");
    ioComplete(p);
    expect(p.state).toBe("Ready");
  });

  test("Running → Terminated (terminate)", () => {
    const p = createProcess(generatePID());
    admit(p);
    assignCPU(p);
    terminate(p);
    expect(p.state).toBe("Terminated");
  });

  test("Running → Ready (preempt)", () => {
    const p = createProcess(generatePID());
    admit(p);
    assignCPU(p);
    preempt(p);
    expect(p.state).toBe("Ready");
  });

  // ❌ --- PRUEBAS INVÁLIDAS ---
  test("New → Terminated debe fallar", () => {
    const p = createProcess(generatePID());
    expect(() => terminate(p)).toThrow();
  });

  test("Ready → Waiting debe fallar (no puedes pedir I/O sin CPU)", () => {
    const p = createProcess(generatePID());
    admit(p);
    expect(() => requestIO(p)).toThrow();
  });

  test("Waiting → Terminated debe fallar (no permitido)", () => {
    const p = createProcess(generatePID());
    admit(p);
    assignCPU(p);
    requestIO(p);
    expect(() => terminate(p)).toThrow();
  });

  test("Terminated → cualquier otro estado debe fallar", () => {
    const p = createProcess(generatePID());
    admit(p);
    assignCPU(p);
    terminate(p);
    expect(() => assignCPU(p)).toThrow();
    expect(() => admit(p)).toThrow();
    expect(() => requestIO(p)).toThrow();
  });

  // 📜 --- HISTORIAL ---
  test("Cada transición válida se guarda en el history", () => {
    const p = createProcess(generatePID());
    admit(p, "admit test");
    assignCPU(p, "assign test");
    requestIO(p, "I/O test");

    expect(p.history.length).toBe(3);
    expect(p.history[0]).toMatchObject({ from: "New", to: "Ready" });
    expect(p.history[1]).toMatchObject({ from: "Ready", to: "Running" });
    expect(p.history[2]).toMatchObject({ from: "Running", to: "Waiting" });
  });
});
