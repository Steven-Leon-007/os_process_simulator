/**
 * Tests para el manejador de fallas de página y algoritmo Clock
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as Memory from "../services/memory.js";
import * as PageTable from "../services/pageTable.js";
import * as PageFaultHandler from "../services/pageFaultHandler.js";
import * as Disk from "../services/disk.js";

describe("Page Fault Handler", () => {
  beforeEach(() => {
    Memory.resetMemory();
    PageFaultHandler.resetPageFaultHandler();
    Memory.initializeMemory(4, 4096); // 4 marcos para tests (memoria pequeña)
    Disk.initializeDisk(0, false); // Deshabilitar delay de I/O para tests
  });

  describe("handlePageFault - With Free Frames", () => {
    it("should allocate free frame when available", async () => {
      const pageTable = PageTable.createPageTable(4);
      const result = await PageFaultHandler.handlePageFault("001", 0, pageTable);

      expect(result.success).toBe(true);
      expect(result.replacement).toBe(false);
      expect(result.frameNumber).toBeGreaterThanOrEqual(0);
      expect(result.frameNumber).toBeLessThan(4);
      expect(result.pageNumber).toBe(0);
      expect(result.pid).toBe("001");
    });

    it("should update page table after allocation", async () => {
      const pageTable = PageTable.createPageTable(4);
      await PageFaultHandler.handlePageFault("001", 0, pageTable);

      expect(PageTable.isPagePresent(pageTable, 0)).toBe(true);
      const entry = PageTable.getPageEntry(pageTable, 0);
      expect(entry.frameNumber).not.toBeNull();
      expect(entry.bitPresente).toBe(1);
    });

    it("should update memory frame after allocation", async () => {
      const pageTable = PageTable.createPageTable(4);
      const result = await PageFaultHandler.handlePageFault("001", 0, pageTable);

      const frame = Memory.getFrame(result.frameNumber);
      expect(frame.pid).toBe("001");
      expect(frame.pageNumber).toBe(0);
      expect(frame.bitPresente).toBe(1);
      expect(frame.bitUso).toBe(1);
    });

    it("should handle multiple page faults for same process", async () => {
      const pageTable = PageTable.createPageTable(4);
      
      const result1 = await PageFaultHandler.handlePageFault("001", 0, pageTable);
      const result2 = await PageFaultHandler.handlePageFault("001", 1, pageTable);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.frameNumber).not.toBe(result2.frameNumber);
    });
  });

  describe("handlePageFault - Memory Full (Clock Algorithm)", () => {
    it("should trigger replacement when memory is full", async () => {
      const pt1 = PageTable.createPageTable(4);
      
      // Llenar la memoria
      await PageFaultHandler.handlePageFault("001", 0, pt1);
      await PageFaultHandler.handlePageFault("001", 1, pt1);
      await PageFaultHandler.handlePageFault("001", 2, pt1);
      await PageFaultHandler.handlePageFault("001", 3, pt1);

      const memSnapshotBefore = Memory.getMemorySnapshot();
      expect(memSnapshotBefore.freeFrames).toBe(0);

      // Siguiente page fault debe causar reemplazo
      const result = await PageFaultHandler.handlePageFault("002", 0, PageTable.createPageTable(4));

      expect(result.success).toBe(true);
      expect(result.replacement).toBe(true);
      expect(result.victim).toBeDefined();
      expect(result.victim.pid).toBe("001");
    });

    it("should use Clock algorithm to find victim", async () => {
      const pt1 = PageTable.createPageTable(4);
      
      // Llenar memoria
      await PageFaultHandler.handlePageFault("001", 0, pt1);
      await PageFaultHandler.handlePageFault("001", 1, pt1);
      await PageFaultHandler.handlePageFault("001", 2, pt1);
      await PageFaultHandler.handlePageFault("001", 3, pt1);

      const result = await PageFaultHandler.handlePageFault("002", 0, PageTable.createPageTable(4));

      expect(result.attempts).toBeGreaterThanOrEqual(1);
      expect(result.clockPointerAfter).toBeGreaterThanOrEqual(0);
      expect(result.clockPointerAfter).toBeLessThan(4);
    });

    it("should give second chance by clearing use bit", async () => {
      const pt1 = PageTable.createPageTable(4);
      
      // Llenar memoria
      for (let i = 0; i < 4; i++) {
        await PageFaultHandler.handlePageFault("001", i, pt1);
      }

      // Todos los marcos tienen bitUso = 1
      for (let i = 0; i < 4; i++) {
        const frame = Memory.getFrame(i);
        expect(frame.bitUso).toBe(1);
      }

      // Causar reemplazo - Clock debe dar segunda oportunidad
      const result = await PageFaultHandler.handlePageFault("002", 0, PageTable.createPageTable(4));

      expect(result.success).toBe(true);
      expect(result.replacement).toBe(true);
      
      // El algoritmo debe haber limpiado algunos bits de uso
      expect(result.attempts).toBeGreaterThan(0);
    });

    it("should update victim page table", async () => {
      const pt1 = PageTable.createPageTable(4);
      
      // Llenar memoria
      await PageFaultHandler.handlePageFault("001", 0, pt1);
      await PageFaultHandler.handlePageFault("001", 1, pt1);
      await PageFaultHandler.handlePageFault("001", 2, pt1);
      await PageFaultHandler.handlePageFault("001", 3, pt1);

      const pt2 = PageTable.createPageTable(4);
      const result = await PageFaultHandler.handlePageFault("002", 0, pt2);

      // Actualizar tabla de la víctima manualmente
      PageFaultHandler.updateVictimPageTable(pt1, result.victim.pageNumber);

      // Verificar que la página víctima fue marcada como ausente
      expect(PageTable.isPagePresent(pt1, result.victim.pageNumber)).toBe(false);
    });

    it("should record replacement in history", async () => {
      const pt1 = PageTable.createPageTable(4);
      
      // Llenar memoria
      for (let i = 0; i < 4; i++) {
        await PageFaultHandler.handlePageFault("001", i, pt1);
      }

      const historyBefore = PageFaultHandler.getReplacementHistory();
      const replacementsBefore = historyBefore.filter(e => e.type === "PAGE_REPLACEMENT");
      expect(replacementsBefore.length).toBe(0);

      // Causar reemplazo
      await PageFaultHandler.handlePageFault("002", 0, PageTable.createPageTable(4));

      const historyAfter = PageFaultHandler.getReplacementHistory();
      const replacementsAfter = historyAfter.filter(e => e.type === "PAGE_REPLACEMENT");
      expect(replacementsAfter.length).toBe(1);
      expect(replacementsAfter[0].type).toBe("PAGE_REPLACEMENT");
      expect(replacementsAfter[0].algorithm).toBe("CLOCK");
    });
  });

  describe("loadPageIntoFrame", () => {
    it("should load page into specified frame", async () => {
      const pageTable = PageTable.createPageTable(4);
      
      // Asegurarse de que el marco 0 está libre
      const frameBefore = Memory.getFrame(0);
      expect(frameBefore.bitPresente).toBe(0);
      expect(frameBefore.pid).toBeNull();
      
      const result = await PageFaultHandler.loadPageIntoFrame("001", 0, 0, pageTable);

      if (!result.success) {
        console.error('loadPageIntoFrame failed:', result);
      }

      expect(result.success).toBe(true);
      expect(result.pid).toBe("001");
      expect(result.pageNumber).toBe(0);
      expect(result.frameNumber).toBe(0);
      expect(result.origin).toBeDefined(); // 'RAM' o 'DISK'
    });

    it("should fail if frame is not free", async () => {
      const pageTable = PageTable.createPageTable(4);
      
      // Cargar página en marco 0
      await PageFaultHandler.loadPageIntoFrame("001", 0, 0, pageTable);

      // Intentar cargar otra página en el mismo marco
      const result = await PageFaultHandler.loadPageIntoFrame("001", 1, 0, pageTable);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not free");
    });

    it("should update both page table and memory", async () => {
      const pageTable = PageTable.createPageTable(4);
      await PageFaultHandler.loadPageIntoFrame("001", 2, 1, pageTable);

      // Verificar tabla de páginas
      const entry = PageTable.getPageEntry(pageTable, 2);
      expect(entry.bitPresente).toBe(1);
      expect(entry.frameNumber).toBe(1);

      // Verificar memoria
      const frame = Memory.getFrame(1);
      expect(frame.pid).toBe("001");
      expect(frame.pageNumber).toBe(2);
      expect(frame.bitPresente).toBe(1);
    });
  });

  describe("Clock Algorithm", () => {
    it("should advance clock pointer after replacement", async () => {
      const pt1 = PageTable.createPageTable(4);
      
      // Llenar memoria
      for (let i = 0; i < 4; i++) {
        await PageFaultHandler.handlePageFault("001", i, pt1);
      }

      const initialPointer = Memory.getClockPointer();
      
      // Causar reemplazo
      const result = await PageFaultHandler.handlePageFault("002", 0, PageTable.createPageTable(4));

      expect(result.clockPointerAfter).not.toBe(initialPointer);
      expect(Memory.getClockPointer()).toBe(result.clockPointerAfter);
    });

    it("should wrap around when reaching end of frames", async () => {
      const pt1 = PageTable.createPageTable(8);
      
      // Llenar memoria
      for (let i = 0; i < 4; i++) {
        await PageFaultHandler.handlePageFault("001", i, pt1);
      }

      // Forzar puntero al final
      Memory.setClockPointer(3);

      // Causar reemplazo - el puntero debe dar la vuelta
      const result = await PageFaultHandler.handlePageFault("002", 0, PageTable.createPageTable(4));

      expect(result.clockPointerAfter).toBeGreaterThanOrEqual(0);
      expect(result.clockPointerAfter).toBeLessThan(4);
    });
  });

  describe("Statistics and History", () => {
    it("should track replacement statistics", async () => {
      const pt1 = PageTable.createPageTable(4);
      
      // Llenar memoria
      for (let i = 0; i < 4; i++) {
        await PageFaultHandler.handlePageFault("001", i, pt1);
      }

      // Causar múltiples reemplazos
      await PageFaultHandler.handlePageFault("002", 0, PageTable.createPageTable(4));
      await PageFaultHandler.handlePageFault("002", 1, PageTable.createPageTable(4));

      const stats = PageFaultHandler.getReplacementStats();
      expect(stats.totalReplacements).toBe(2);
      expect(stats.averageClockAttempts).toBeDefined();
    });

    it("should track dirty replacements", async () => {
      const pt1 = PageTable.createPageTable(4);
      
      // Llenar memoria
      for (let i = 0; i < 4; i++) {
        const result = await PageFaultHandler.handlePageFault("001", i, pt1);
        // Marcar algunos marcos como modificados
        if (i % 2 === 0) {
          Memory.updateFrameBits(result.frameNumber, { bitModificado: 1 });
        }
      }

      // Causar reemplazos
      await PageFaultHandler.handlePageFault("002", 0, PageTable.createPageTable(4));

      const stats = PageFaultHandler.getReplacementStats();
      expect(stats.dirtyReplacements + stats.cleanReplacements).toBe(stats.totalReplacements);
    });

    it("should get last replacement event", async () => {
      const pt1 = PageTable.createPageTable(4);
      
      // Llenar memoria
      for (let i = 0; i < 4; i++) {
        await PageFaultHandler.handlePageFault("001", i, pt1);
      }

      await PageFaultHandler.handlePageFault("002", 0, PageTable.createPageTable(4));
      
      const lastEvent = PageFaultHandler.getLastReplacement();
      expect(lastEvent).not.toBeNull();
      expect(lastEvent.type).toBe("PAGE_REPLACEMENT");
      expect(lastEvent.loaded.pid).toBe("002");
    });
  });

  describe("Utility Functions", () => {
    it("should detect when memory is full", async () => {
      const pt1 = PageTable.createPageTable(4);

      expect(PageFaultHandler.isMemoryFull()).toBe(false);

      // Llenar memoria
      for (let i = 0; i < 4; i++) {
        await PageFaultHandler.handlePageFault("001", i, pt1);
      }

      expect(PageFaultHandler.isMemoryFull()).toBe(true);
    });

    it("should provide clock state information", () => {
      const state = PageFaultHandler.getClockState();

      expect(state.clockPointer).toBeGreaterThanOrEqual(0);
      expect(state.totalFrames).toBe(4);
      expect(state.usedFrames).toBeGreaterThanOrEqual(0);
      expect(state.freeFrames).toBeGreaterThanOrEqual(0);
      expect(state.memoryFull).toBeDefined();
    });

    it("should clear replacement history", async () => {
      const pt1 = PageTable.createPageTable(4);
      
      // Llenar y causar reemplazo
      for (let i = 0; i < 4; i++) {
        await PageFaultHandler.handlePageFault("001", i, pt1);
      }
      await PageFaultHandler.handlePageFault("002", 0, PageTable.createPageTable(4));

      expect(PageFaultHandler.getReplacementHistory().length).toBeGreaterThan(0);

      PageFaultHandler.clearReplacementHistory();

      expect(PageFaultHandler.getReplacementHistory().length).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid page number", async () => {
      const pageTable = PageTable.createPageTable(4);
      const result = await PageFaultHandler.handlePageFault("001", 10, pageTable);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid page number");
    });

    it("should handle null page table", async () => {
      const result = await PageFaultHandler.handlePageFault("001", 0, null);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Page table not provided");
    });

    it("should handle page already present", async () => {
      const pageTable = PageTable.createPageTable(4);
      
      // Cargar página
      await PageFaultHandler.handlePageFault("001", 0, pageTable);

      // Intentar cargar la misma página nuevamente
      const result = await PageFaultHandler.handlePageFault("001", 0, pageTable);

      expect(result.success).toBe(false);
      expect(result.error).toContain("already present");
    });
  });
});
