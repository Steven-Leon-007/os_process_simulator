import { admit, assignCPU, ioComplete, preempt, requestIO, STATES, terminate } from "../../../services/fsm";

export const getPositions = (width, showMemory = false) => {
    const finalWidth = width * 0.8;
    if (width < 1100) {
        return {
            [STATES.NEW]: { x: 50, y: 30 },
            [STATES.READY]: { x: 70, y: 150 },
            [STATES.RUNNING]: { x: finalWidth - 185, y: 150 },
            [STATES.WAITING]: { x: (finalWidth / 2) - 60, y: 300 },
            [STATES.TERMINATED]: { x: finalWidth - 165, y: 30 },
        };
    }

    // Desktop: ajustar posiciones según si el panel de memoria está visible
    // Si showMemory = true, posiciones más compactas (actuales)
    // Si showMemory = false, posiciones más separadas para aprovechar el espacio
    const spacingMultiplier = showMemory ? 1 : 1.3;

    return {
        [STATES.NEW]: { x: finalWidth * 0.05 * spacingMultiplier, y: 200 },
        [STATES.READY]: { x: finalWidth * 0.15 * spacingMultiplier, y: 300 },
        [STATES.RUNNING]: { x: finalWidth * 0.5 * spacingMultiplier, y: 300 },
        [STATES.WAITING]: { x: finalWidth * 0.325 * spacingMultiplier, y: 450 },
        [STATES.TERMINATED]: { x: finalWidth * 0.6 * spacingMultiplier, y: 200 },
    };
};

export const STATE_COLORS = {
    [STATES.NEW]: "#7dd3fc",
    [STATES.READY]: "#60a5fa",
    [STATES.RUNNING]: "#34d399",
    [STATES.WAITING]: "#f59e0b",
    [STATES.TERMINATED]: "#ef4444",
};

export const getActionsByState = (admit, assignCPU, terminate, requestIO, preempt, ioComplete, STATE_COLORS, STATES) => ({
    [STATES.NEW]: [
        { label: "Admitir", fn: admit, color: STATE_COLORS[STATES.READY] },
    ],
    [STATES.READY]: [
        { label: "Asignar CPU", fn: assignCPU, color: STATE_COLORS[STATES.RUNNING] },
    ],
    [STATES.RUNNING]: [
        { label: "Terminar", fn: terminate, color: STATE_COLORS[STATES.TERMINATED] },
        { label: "Request I/O", fn: requestIO, color: STATE_COLORS[STATES.WAITING] },
        { label: "Preempt", fn: preempt, color: STATE_COLORS[STATES.READY] },
    ],
    [STATES.WAITING]: [
        { label: "I/O Complete", fn: ioComplete, color: STATE_COLORS[STATES.READY] },
    ],
    [STATES.TERMINATED]: [],
});