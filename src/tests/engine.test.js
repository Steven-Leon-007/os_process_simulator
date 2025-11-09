import { describe, test, expect, beforeEach } from "vitest";
import * as engine from "../services/engine.js";
import { createProcess, STATES } from "../services/fsm.js";

describe("Motor de simulación (engine.js)", () => {
  let procesos;
  beforeEach(() => {
    engine.resetEngine();
    procesos = [createProcess("001"), createProcess("002")];
    engine.setProcesses(procesos);
  });

  test("Modo manual: no avanza automáticamente", () => {
    engine.setMode("manual");
    engine.setSpeed(500);
    engine.start(procesos);
    // Sin esperar, el estado debe seguir igual
    expect(procesos[0].state).toBe(STATES.NEW);
  });

  test("Modo auto: avanza automáticamente", async () => {
    engine.setMode("auto");
    engine.setSpeed(10);
    engine.start(procesos);
    await new Promise((res) => setTimeout(res, 100)); // ~10 ciclos
    expect([
      STATES.READY,
      STATES.RUNNING,
      STATES.WAITING,
      STATES.TERMINATED,
    ]).toContain(procesos[0].state);
    engine.pause();
  }, 1000); // timeout del test

  test("Cambio de modo en tiempo real (manual → auto)", async () => {
    engine.setMode("manual");
    engine.setSpeed(10);
    engine.start(procesos);
    expect(procesos[0].state).toBe(STATES.NEW); // no cambia aún
    engine.setMode("auto");
    await new Promise((res) => setTimeout(res, 50));
    expect([
      STATES.READY,
      STATES.RUNNING,
      STATES.WAITING,
      STATES.TERMINATED,
    ]).toContain(procesos[0].state);
    engine.pause();
  }, 1000);

  test("Pausa detiene el avance", async () => {
    engine.setMode("auto");
    engine.setSpeed(10);
    engine.start(procesos);
    await new Promise((res) => setTimeout(res, 30));
    engine.pause();
    const estado = procesos[0].state;
    await new Promise((res) => setTimeout(res, 50));
    expect(procesos[0].state).toBe(estado);
  }, 1000);

  test("resetManualInactivityTimer no cambia el modo si no es manual", () => {
    engine.setMode("auto");
    engine.resetManualInactivityTimer();
    expect(engine.getEngineState().mode).toBe("auto");
  });

  test("setProcesses actualiza procesos pero mantiene su estado", () => {
    const nuevos = [createProcess("003")];
    engine.setProcesses(nuevos);
    expect(nuevos[0].state).toBe(STATES.NEW);
  });

  test("resetEngine vuelve a estado limpio", () => {
    engine.setMode("auto");
    engine.setSpeed(5);
    engine.setProcesses(procesos);
    engine.resetEngine();
    const st = engine.getEngineState();
    expect(st.mode).toBe("manual");
    expect(st.running).toBe(false);
    expect(st.speed).toBe(6000);
  });
});
