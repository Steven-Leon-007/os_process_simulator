/**
 * Test básico para verificar el hook useMemory
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { SimulationProvider } from "../context/SimulationContext";
import useMemory from "../hooks/useMemory";
import * as Memory from "../services/memory.js";
import * as MMU from "../services/mmu.js";

// Wrapper para el provider
const wrapper = ({ children }) => {
  return React.createElement(SimulationProvider, null, children);
};

describe("useMemory Hook", () => {
  beforeEach(() => {
    Memory.resetMemory();
    MMU.resetMMU();
  });

  it("should provide memory state", () => {
    const { result } = renderHook(() => useMemory(), { wrapper });

    expect(result.current.memoryState).toBeDefined();
    expect(result.current.frames).toBeDefined();
    expect(result.current.totalFrames).toBeGreaterThan(0);
  });

  it("should provide page tables", () => {
    const { result } = renderHook(() => useMemory(), { wrapper });

    expect(result.current.pageTables).toBeDefined();
    expect(typeof result.current.pageTables).toBe("object");
  });

  it("should provide clock state", () => {
    const { result } = renderHook(() => useMemory(), { wrapper });

    expect(result.current.clockState).toBeDefined();
    expect(result.current.clockPointer).toBeGreaterThanOrEqual(0);
  });

  it("should provide utility functions", () => {
    const { result } = renderHook(() => useMemory(), { wrapper });

    expect(typeof result.current.getFrameInfo).toBe("function");
    expect(typeof result.current.getProcessFrames).toBe("function");
    expect(typeof result.current.getFreeFrames).toBe("function");
    expect(typeof result.current.getOccupiedFrames).toBe("function");
    expect(typeof result.current.refresh).toBe("function");
  });

  it("should return free frames correctly", () => {
    const { result } = renderHook(() => useMemory(), { wrapper });

    const freeFrames = result.current.getFreeFrames();
    expect(Array.isArray(freeFrames)).toBe(true);
  });

  it("should return occupied frames correctly", () => {
    const { result } = renderHook(() => useMemory(), { wrapper });

    const occupiedFrames = result.current.getOccupiedFrames();
    expect(Array.isArray(occupiedFrames)).toBe(true);
  });
});
