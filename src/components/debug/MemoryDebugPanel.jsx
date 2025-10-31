/**
 * MemoryDebugPanel.jsx
 * Componente de debug temporal para verificar el estado de memoria
 */

import React from 'react';
import useMemory from '../../hooks/useMemory';

const MemoryDebugPanel = () => {
  const {
    totalFrames,
    usedFrames,
    freeFrames,
    clockPointer,
    isMemoryFull,
    replacementStats,
  } = useMemory();

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      right: '1rem',
      background: 'var(--color-accent)',
      padding: '1rem',
      borderRadius: '8px',
      border: '1px solid var(--color-border)',
      fontSize: '0.85em',
      minWidth: '200px',
      zIndex: 1000,
    }}>
      <h4 style={{ margin: '0 0 0.5rem 0' }}>Memory Debug</h4>
      <div>Total Frames: {totalFrames}</div>
      <div>Used: {usedFrames}</div>
      <div>Free: {freeFrames}</div>
      <div>Clock Pointer: {clockPointer}</div>
      <div>Memory Full: {isMemoryFull ? 'Yes' : 'No'}</div>
      {replacementStats && (
        <>
          <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
            <strong>Replacements</strong>
          </div>
          <div>Total: {replacementStats.totalReplacements}</div>
          <div>Dirty: {replacementStats.dirtyReplacements}</div>
          <div>Clean: {replacementStats.cleanReplacements}</div>
          <div>Avg Attempts: {replacementStats.averageClockAttempts}</div>
        </>
      )}
    </div>
  );
};

export default MemoryDebugPanel;
