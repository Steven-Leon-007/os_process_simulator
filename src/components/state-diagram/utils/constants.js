import { admit, assignCPU, ioComplete, preempt, requestIO, STATES, terminate } from "../../../services/fsm";

export const getPositions = (width) => {
    const finalWidth = width * 0.8; // Limitar ancho máximo para mejor visualización
    if (width < 1100) {
        return {
            [STATES.NEW]: { x: 50, y: 30 },
            [STATES.READY]: { x: 70, y: 150 },
            [STATES.RUNNING]: { x: finalWidth - 185, y: 150 },
            [STATES.WAITING]: { x: (finalWidth / 2) - 60, y: 300 },
            [STATES.TERMINATED]: { x: finalWidth - 165, y: 30 },
        };
    }

    return {
        [STATES.NEW]: { x: finalWidth * 0.05, y: 50 },
        [STATES.READY]: { x: finalWidth * 0.2, y: 150 },
        [STATES.RUNNING]: { x: finalWidth * 0.6, y: 150 },
        [STATES.WAITING]: { x: finalWidth * 0.4, y: 300 },
        [STATES.TERMINATED]: { x: finalWidth * 0.8, y: 50 },
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