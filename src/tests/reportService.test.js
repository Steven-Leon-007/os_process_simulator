import { describe, test, expect } from "vitest";
import {
  generateSimulationReport,
  processesToCSV,
} from "../services/reportEngine.js";

const baseProcesses = [
  {
    pid: "001",
    history: [
      { state: "NEW", timestamp: 0 },
      { state: "READY", timestamp: 100 },
      { state: "RUNNING", timestamp: 200 },
      { state: "WAITING", timestamp: 300 },
      { state: "READY", timestamp: 400 },
      { state: "TERMINATED", timestamp: 500 },
    ],
  },
  {
    pid: "002",
    history: [
      { state: "NEW", timestamp: 0 },
      { state: "READY", timestamp: 50 },
      { state: "RUNNING", timestamp: 150 },
      { state: "TERMINATED", timestamp: 250 },
    ],
  },
];

describe("generateSimulationReport - Casos normales", () => {
  test("Reporte contiene encabezado y estados", () => {
    const config = { mode: "auto", speed: 1000 };
    const report = generateSimulationReport(baseProcesses, config);
    expect(report).toContain("Reporte de Simulación");
    expect(report).toContain("Estado,TiempoPromedio(ms),Transiciones");
    expect(report).toContain("NEW");
    expect(report).toContain("READY");
    expect(report).toContain("RUNNING");
    expect(report).toContain("WAITING");
    expect(report).toContain("TERMINATED");
  });

  test("Reporte incluye configuración de modo y velocidad", () => {
    const config = { mode: "manual", speed: 2000 };
    const report = generateSimulationReport(baseProcesses, config);
    expect(report).toContain("Modo: manual, Velocidad: 2000");
  });

  test("Reporte calcula transiciones totales", () => {
    const config = { mode: "auto", speed: 1000 };
    const report = generateSimulationReport(baseProcesses, config);
    expect(report).toMatch(/Total de transiciones,\d+/);
  });

  test("Reporte maneja procesos sin historial suficiente", () => {
    const config = { mode: "auto", speed: 1000 };
    const processes = [
      { pid: "003", history: [{ state: "NEW", timestamp: 0 }] },
    ];
    const report = generateSimulationReport(processes, config);
    expect(report).toContain("Reporte de Simulación");
  });

  test("processesToCSV genera CSV válido", () => {
    const csv = processesToCSV(baseProcesses);
    expect(csv).toContain("pid,from,to,timestamp,cause");
    expect(csv).toContain("001");
    expect(csv).toContain("002");
  });
});

describe("generateSimulationReport - Casos de error", () => {
  test("Procesos sin historial no lanzan error", () => {
    const config = { mode: "auto", speed: 1000 };
    const processes = [{ pid: "004", history: [] }];
    expect(() => generateSimulationReport(processes, config)).not.toThrow();
  });

  test("Procesos con historial nulo no lanzan error", () => {
    const config = { mode: "auto", speed: 1000 };
    const processes = [{ pid: "005", history: null }];
    expect(() => generateSimulationReport(processes, config)).not.toThrow();
  });

  test("Procesos sin campo history no lanzan error", () => {
    const config = { mode: "auto", speed: 1000 };
    const processes = [{ pid: "006" }];
    expect(() => generateSimulationReport(processes, config)).not.toThrow();
  });
});
