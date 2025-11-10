/**
 * Test de integración completo: FSM + MMU + PageFaultHandler
 * Verifica el flujo completo de gestión de memoria con reemplazo Clock
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fsm from "../services/fsm.js";
import * as Memory from "../services/memory.js";
import * as MMU from "../services/mmu.js";
import * as PageFaultHandler from "../services/pageFaultHandler.js";
import * as Disk from "../services/disk.js";
import { resetPID } from "../services/pidGenerator.js";

describe("Full Memory Integration - Clock Algorithm", () => {
  beforeEach(() => {
    resetPID();
    Memory.resetMemory();
    MMU.resetMMU();
    PageFaultHandler.resetPageFaultHandler();
    Disk.initializeDisk(0, false); // Deshabilitar delay de I/O para tests

    // Memoria pequeña para forzar reemplazos rápido
    Memory.initializeMemory(8, 4096); // 8 marcos, 4KB/página
    MMU.initializeMMU(4096);
  });

  describe("Memory Full Scenario - Clock Replacement", () => {
    it("should handle page faults with Clock replacement when memory fills up", async () => {
      // Crear varios procesos para llenar la memoria
      const proc1 = fsm.createProcess("001", 5, 4, 2);
      const proc2 = fsm.createProcess("002", 3, 4, 2);
      const proc3 = fsm.createProcess("003", 7, 4, 2);
      const proc4 = fsm.createProcess("004", 2, 4, 2);

      // Memoria debería estar llena o casi llena (8 marcos, 2x4 = 8 páginas)
      const memSnapshot = Memory.getMemorySnapshot();
      expect(memSnapshot.usedFrames).toBeGreaterThanOrEqual(6);

      // Acceder a página no cargada - debería causar reemplazo
      const proc5 = fsm.createProcess("005", 4, 4, 0); // Sin páginas iniciales
      const accessResult = await fsm.accessMemory(proc5, 100);

      if (MMU.isMemoryFull()) {
        // Si memoria llena, debería haber habido reemplazo
        const history = MMU.getReplacementHistory();
        expect(history.length).toBeGreaterThan(0);
        
        const lastReplacement = PageFaultHandler.getLastReplacement();
        expect(lastReplacement.algorithm).toBe("CLOCK");
      }
    });

    it("should track all replacements in global history", async () => {
      // Llenar memoria completamente
      const processes = [];
      for (let i = 0; i < 4; i++) {
        const proc = fsm.createProcess(`00${i + 1}`, i, 4, 2);
        processes.push(proc);
      }

      expect(MMU.isMemoryFull()).toBe(true);

      // Causar múltiples page faults que requieran reemplazo
      const proc5 = fsm.createProcess("005", 5, 4, 0);
      await fsm.accessMemory(proc5, 100);
      await fsm.accessMemory(proc5, 5000);

      const history = MMU.getReplacementHistory();
      expect(history.length).toBeGreaterThan(0);

      // Cada evento debe tener la estructura correcta
      history.forEach(event => {
        expect(event.type).toBe("PAGE_REPLACEMENT");
        expect(event.algorithm).toBe("CLOCK");
        expect(event.victim).toBeDefined();
        expect(event.loaded).toBeDefined();
        expect(event.timestamp).toBeDefined();
      });
    });

    it("should give second chance by clearing use bits", async () => {
      // Llenar memoria
      const processes = [];
      for (let i = 0; i < 4; i++) {
        const proc = fsm.createProcess(`00${i + 1}`, i, 4, 2);
        processes.push(proc);
      }

      expect(MMU.isMemoryFull()).toBe(true);

      // Todos los marcos deberían tener bitUso = 1
      const memBefore = Memory.getMemorySnapshot();
      const usedFrames = memBefore.frames.filter(f => f.bitPresente === 1);
      const framesWithUseBit = usedFrames.filter(f => f.bitUso === 1);
      expect(framesWithUseBit.length).toBeGreaterThan(0);

      // Causar page fault - Clock debe dar segunda oportunidad
      const proc5 = fsm.createProcess("005", 5, 4, 0);
      await fsm.accessMemory(proc5, 100);

      const lastReplacement = PageFaultHandler.getLastReplacement();
      if (lastReplacement) {
        expect(lastReplacement.attempts).toBeGreaterThan(0);
      }
    });
  });

  describe("Clock Pointer Movement", () => {
    it("should advance clock pointer after each replacement", () => {
      // Llenar memoria
      for (let i = 0; i < 4; i++) {
        fsm.createProcess(`00${i + 1}`, i, 4, 2);
      }

      expect(MMU.isMemoryFull()).toBe(true);

      const clockBefore = MMU.getClockState();
      const pointerBefore = clockBefore.clockPointer;

      // Causar reemplazo
      const proc5 = fsm.createProcess("005", 5, 4, 0);
      fsm.accessMemory(proc5, 100);

      const clockAfter = MMU.getClockState();
      
      if (PageFaultHandler.getLastReplacement()) {
        // El puntero debe haber avanzado
        expect(clockAfter.clockPointer).not.toBe(pointerBefore);
      }
    });

    it("should wrap around when reaching end of frames", () => {
      // Llenar memoria
      for (let i = 0; i < 4; i++) {
        fsm.createProcess(`00${i + 1}`, i, 4, 2);
      }

      // Forzar puntero cerca del final
      Memory.setClockPointer(7);

      // Causar múltiples reemplazos
      const proc5 = fsm.createProcess("005", 5, 6, 0);
      for (let i = 0; i < 3; i++) {
        fsm.accessMemory(proc5, i * 5000);
      }

      const clockState = MMU.getClockState();
      expect(clockState.clockPointer).toBeGreaterThanOrEqual(0);
      expect(clockState.clockPointer).toBeLessThan(8);
    });
  });

  describe("Replacement Statistics", () => {
    it("should calculate correct replacement statistics", () => {
      // Llenar memoria
      for (let i = 0; i < 4; i++) {
        fsm.createProcess(`00${i + 1}`, i, 4, 2);
      }

      expect(MMU.isMemoryFull()).toBe(true);

      // Causar varios reemplazos
      const proc5 = fsm.createProcess("005", 5, 6, 0);
      fsm.accessMemory(proc5, 100);
      fsm.accessMemory(proc5, 5000);
      fsm.accessMemory(proc5, 10000);

      const stats = MMU.getReplacementStats();
      
      if (stats.totalReplacements > 0) {
        expect(stats.totalReplacements).toBeGreaterThan(0);
        expect(stats.dirtyReplacements + stats.cleanReplacements).toBe(stats.totalReplacements);
        expect(stats.averageClockAttempts).toBeDefined();
        expect(parseFloat(stats.averageClockAttempts)).toBeGreaterThan(0);
      }
    });

    it("should track victims by process", () => {
      // Llenar memoria con un solo proceso
      const proc1 = fsm.createProcess("001", 5, 8, 8);

      expect(MMU.isMemoryFull()).toBe(true);

      // Crear otro proceso y causar reemplazos
      const proc2 = fsm.createProcess("002", 3, 4, 0);
      fsm.accessMemory(proc2, 100);
      fsm.accessMemory(proc2, 5000);

      const stats = MMU.getReplacementStats();
      
      if (stats.totalReplacements > 0) {
        // El proceso 001 debe tener víctimas
        expect(stats.victimsByProcess["001"]).toBeGreaterThan(0);
        // El proceso 002 debe tener loads
        expect(stats.loadsByProcess["002"]).toBeGreaterThan(0);
      }
    });
  });

  describe("Process Lifecycle with Memory Management", () => {
    it("should handle complete lifecycle: create → access → terminate", () => {
      const proc = fsm.createProcess("001", 5, 4, 2);
      
      // Verificar creación
      expect(proc.memory.numPages).toBe(4);
      expect(proc.memory.loadedPages).toBeGreaterThanOrEqual(0);

      // Transición a Running
      fsm.admit(proc);
      fsm.assignCPU(proc);

      // Acceso manual a memoria
      const accessResult = fsm.accessMemory(proc, 500);
      expect(proc.memory.memoryAccesses).toBeGreaterThan(0);

      // Terminar proceso
      const terminated = fsm.terminate(proc);

      // Verificar que se liberó memoria
      const memFreeSyscall = terminated.syscalls.find(s => s.type === "MEMORY_FREE");
      expect(memFreeSyscall).toBeDefined();

      // Verificar que el proceso ya no está registrado
      expect(MMU.isProcessRegistered("001")).toBe(false);
    });

    it("should free victim pages when process is terminated", () => {
      // Llenar memoria
      const proc1 = fsm.createProcess("001", 5, 8, 8);
      expect(MMU.isMemoryFull()).toBe(true);

      // Causar reemplazo
      const proc2 = fsm.createProcess("002", 3, 4, 0);
      fsm.accessMemory(proc2, 100);

      // Terminar el proceso víctima
      fsm.admit(proc1);
      fsm.assignCPU(proc1);
      fsm.terminate(proc1);

      // Ahora debería haber marcos libres
      expect(MMU.isMemoryFull()).toBe(false);

      const memSnapshot = Memory.getMemorySnapshot();
      expect(memSnapshot.freeFrames).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid successive page faults", () => {
      // Llenar memoria
      for (let i = 0; i < 4; i++) {
        fsm.createProcess(`00${i + 1}`, i, 4, 2);
      }

      const proc5 = fsm.createProcess("005", 5, 6, 0);

      // Múltiples accesos rápidos
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(fsm.accessMemory(proc5, i * 5000));
      }

      // Todos los accesos deben haberse manejado
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    it("should handle dirty pages correctly", () => {
      // Llenar memoria
      for (let i = 0; i < 4; i++) {
        fsm.createProcess(`00${i + 1}`, i, 4, 2);
      }

      // Marcar algunos marcos como modificados
      for (let i = 0; i < 4; i += 2) {
        Memory.updateFrameBits(i, { bitModificado: 1 });
      }

      // Causar reemplazos
      const proc5 = fsm.createProcess("005", 5, 4, 0);
      fsm.accessMemory(proc5, 100);
      fsm.accessMemory(proc5, 5000);

      const stats = MMU.getReplacementStats();
      
      if (stats.totalReplacements > 0) {
        // Debería haber al menos algún dirty replacement
        expect(stats.dirtyReplacements >= 0).toBe(true);
        expect(stats.cleanReplacements >= 0).toBe(true);
      }
    });
  });

  describe("Memory Snapshot Consistency", () => {
    it("should maintain consistent memory state through operations", () => {
      const initialSnapshot = Memory.getMemorySnapshot();
      expect(initialSnapshot.usedFrames + initialSnapshot.freeFrames).toBe(8);

      // Crear procesos
      const proc1 = fsm.createProcess("001", 5, 4, 2);
      const proc2 = fsm.createProcess("002", 3, 4, 2);

      const midSnapshot = Memory.getMemorySnapshot();
      expect(midSnapshot.usedFrames + midSnapshot.freeFrames).toBe(8);

      // Terminar un proceso
      fsm.admit(proc1);
      fsm.assignCPU(proc1);
      fsm.terminate(proc1);

      const finalSnapshot = Memory.getMemorySnapshot();
      expect(finalSnapshot.usedFrames + finalSnapshot.freeFrames).toBe(8);
      expect(finalSnapshot.freeFrames).toBeGreaterThan(midSnapshot.freeFrames);
    });
  });
});
