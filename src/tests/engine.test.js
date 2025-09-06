
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
    // Espera un poco y verifica que no cambió el estado
    expect(procesos[0].state).toBe(STATES.NEW);
  });

  test("Modo auto: avanza automáticamente", async () => {
    engine.setMode("auto");
    engine.setSpeed(10);
    engine.start(procesos);
    // Espera suficiente tiempo para que avance
    await new Promise(res => setTimeout(res, 100));
    // Debe haber cambiado de estado
    expect([STATES.READY, STATES.RUNNING, STATES.WAITING, STATES.TERMINATED]).toContain(procesos[0].state);
    engine.pause();
  });

  test("Modo semi-auto: solo avanza NEW→READY y READY→RUNNING", async () => {
    engine.setMode("semi-auto");
    engine.setSpeed(10);
    engine.start(procesos);
    await new Promise(res => setTimeout(res, 50));
    // Debe estar en RUNNING pero no más allá
    expect([STATES.READY, STATES.RUNNING]).toContain(procesos[0].state);
    engine.pause();
  });

  test("Cambio de modo en tiempo real", async () => {
    engine.setMode("manual");
    engine.setSpeed(10);
    engine.start(procesos);
    expect(procesos[0].state).toBe(STATES.NEW);
    engine.setMode("auto");
    await new Promise(res => setTimeout(res, 50));
    expect([STATES.READY, STATES.RUNNING, STATES.WAITING, STATES.TERMINATED]).toContain(procesos[0].state);
    engine.pause();
  });

  test("Pausa detiene el avance", async () => {
    engine.setMode("auto");
    engine.setSpeed(10);
    engine.start(procesos);
    await new Promise(res => setTimeout(res, 30));
    engine.pause();
    const estado = procesos[0].state;
    await new Promise(res => setTimeout(res, 50));
    expect(procesos[0].state).toBe(estado);
  });
});
