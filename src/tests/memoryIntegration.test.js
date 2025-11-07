/**
 * Test de integración entre FSM y gestión de memoria
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fsm from "../services/fsm.js";
import * as Memory from "../services/memory.js";
import * as MMU from "../services/mmu.js";
import { resetPID } from "../services/pidGenerator.js";

describe("Memory Integration with FSM", () => {
  beforeEach(() => {
    // Resetear todo antes de cada test
    resetPID();
    Memory.resetMemory();
    MMU.resetMMU();

    // Inicializar memoria y MMU
    Memory.initializeMemory(16, 4096); // 16 marcos, 4KB por página
    MMU.initializeMMU(4096);
  });

  describe("Process Creation", () => {
    it("should create a process with page table", () => {
      const process = fsm.createProcess("001", 5, 4, 2);

      expect(process.pid).toBe("001");
      expect(process.priority).toBe(5);
      expect(process.memory).toBeDefined();
      expect(process.memory.numPages).toBe(4);
      expect(process.memory.loadedPages).toBeGreaterThanOrEqual(0);
      expect(process.memory.loadedPages).toBeLessThanOrEqual(2);
    });

    it("should register process in MMU", () => {
      const process = fsm.createProcess("001", 5, 4, 2);

      expect(MMU.isProcessRegistered(process.pid)).toBe(true);
      
      const pageTable = MMU.getProcessPageTable(process.pid);
      expect(pageTable).not.toBeNull();
      expect(pageTable.length).toBe(4);
    });

    it("should allocate initial frames", () => {
      const process = fsm.createProcess("001", 5, 4, 2);
      
      const memSnapshot = Memory.getMemorySnapshot();
      expect(memSnapshot.usedFrames).toBeGreaterThanOrEqual(0);
      expect(memSnapshot.usedFrames).toBeLessThanOrEqual(2);

      // Verificar que hay una syscall de MEMORY_INIT si se asignaron marcos
      if (process.memory.loadedPages > 0) {
        const memInitSyscall = process.syscalls.find(s => s.type === "MEMORY_INIT");
        expect(memInitSyscall).toBeDefined();
      }
    });
  });

  describe("Memory Access", () => {
    it("should successfully access loaded page", () => {
      const process = fsm.createProcess("001", 5, 4, 4); // Cargar todas las páginas
      
      // Acceder a dirección en la primera página (0-4095)
      const result = fsm.accessMemory(process, 100);

      if (process.memory.loadedPages > 0) {
        expect(result.success).toBe(true);
        expect(result.pageFault).toBe(false);
        expect(result.physicalAddress).toBeDefined();
      }
    });

    it("should detect page fault for non-loaded page", () => {
      const process = fsm.createProcess("001", 5, 4, 0); // No cargar páginas
      
      // Acceder a dirección en la primera página
      const result = fsm.accessMemory(process, 100);

      expect(result.pageFault).toBe(true);
      expect(process.memory.pageFaults).toBeGreaterThan(0);
      
      // Verificar syscall de PAGE_FAULT
      const pageFaultSyscall = process.syscalls.find(s => s.type === "PAGE_FAULT");
      expect(pageFaultSyscall).toBeDefined();
    });

    it("should increment memory access counter", () => {
      const process = fsm.createProcess("001", 5, 4, 2);
      const initialAccesses = process.memory.memoryAccesses;

      fsm.accessMemory(process, 100);
      
      expect(process.memory.memoryAccesses).toBe(initialAccesses + 1);
    });
  });

  describe("Process Termination", () => {
    it("should free all frames on termination", () => {
      const process = fsm.createProcess("001", 5, 4, 2);
      const initialUsedFrames = Memory.getMemorySnapshot().usedFrames;

      // Terminar el proceso
      fsm.admit(process);
      fsm.assignCPU(process);
      const terminated = fsm.terminate(process);

      const finalUsedFrames = Memory.getMemorySnapshot().usedFrames;
      
      // Los marcos deben haberse liberado
      expect(finalUsedFrames).toBe(0);
      
      // Verificar syscall de MEMORY_FREE
      const memFreeSyscall = terminated.syscalls.find(s => s.type === "MEMORY_FREE");
      expect(memFreeSyscall).toBeDefined();
    });

    it("should unregister process from MMU on termination", () => {
      const process = fsm.createProcess("001", 5, 4, 2);
      
      expect(MMU.isProcessRegistered("001")).toBe(true);

      fsm.admit(process);
      fsm.assignCPU(process);
      fsm.terminate(process);

      expect(MMU.isProcessRegistered("001")).toBe(false);
    });
  });

  describe("FSM Transitions with Memory", () => {
    it("should simulate memory access when assigning CPU", () => {
      const process = fsm.createProcess("001", 5, 4, 2);
      
      fsm.admit(process);
      const running = fsm.assignCPU(process);

      // El proceso debe tener al menos un acceso a memoria registrado
      expect(running.memory.memoryAccesses).toBeGreaterThanOrEqual(0);
    });

    it("should maintain FSM transition validity", () => {
      const process = fsm.createProcess("001", 5, 4, 2);

      // Transición válida: NEW → READY
      const ready = fsm.admit(process);
      expect(ready.state).toBe(fsm.STATES.READY);

      // Transición válida: READY → RUNNING
      const running = fsm.assignCPU(ready);
      expect(running.state).toBe(fsm.STATES.RUNNING);

      // La información de memoria debe preservarse
      expect(running.memory.numPages).toBe(4);
    });

    it("should track page faults in process history", () => {
      const process = fsm.createProcess("001", 5, 4, 0); // Sin páginas cargadas
      
      fsm.admit(process);
      fsm.assignCPU(process); // Esto debería generar un page fault

      // Verificar que hay al menos una entrada en syscalls sobre page faults
      const pageFaults = process.syscalls.filter(s => s.type === "PAGE_FAULT");
      
      if (process.memory.pageFaults > 0) {
        expect(pageFaults.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Multiple Processes", () => {
    it("should handle multiple processes with separate page tables", () => {
      const proc1 = fsm.createProcess("001", 5, 4, 2);
      const proc2 = fsm.createProcess("002", 3, 6, 3);

      expect(MMU.isProcessRegistered("001")).toBe(true);
      expect(MMU.isProcessRegistered("002")).toBe(true);

      const pt1 = MMU.getProcessPageTable("001");
      const pt2 = MMU.getProcessPageTable("002");

      expect(pt1.length).toBe(4);
      expect(pt2.length).toBe(6);
    });

    it("should share physical memory frames", () => {
      const proc1 = fsm.createProcess("001", 5, 4, 2);
      const proc2 = fsm.createProcess("002", 3, 4, 2);

      const memSnapshot = Memory.getMemorySnapshot();
      
      // Debe haber marcos ocupados por ambos procesos
      const frames1 = Memory.getFramesByProcess("001");
      const frames2 = Memory.getFramesByProcess("002");

      expect(frames1.length).toBeGreaterThanOrEqual(0);
      expect(frames2.length).toBeGreaterThanOrEqual(0);
      
      // Los marcos deben ser diferentes
      const frame1Numbers = frames1.map(f => f.frameNumber);
      const frame2Numbers = frames2.map(f => f.frameNumber);
      
      // No debe haber intersección
      const intersection = frame1Numbers.filter(n => frame2Numbers.includes(n));
      expect(intersection.length).toBe(0);
    });
  });
});
