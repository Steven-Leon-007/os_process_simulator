import { admit, assignCPU, ioComplete, preempt, requestIO, STATES, terminate } from "../../../services/fsm";

export const getPositions = (width) => {

    const margin = 20;
    const usableWidth = width - margin * 2;

    if (width < 800) {
        return {
            [STATES.NEW]: { x: 50, y: 30 },
            [STATES.READY]: { x: 100, y: 150 },
            [STATES.RUNNING]: { x: width - 215, y: 150 },
            [STATES.WAITING]: { x: (width / 2) - 60, y: 300 },
            [STATES.TERMINATED]: { x: width - 165, y: 30 },
        };
    }


    return {
        [STATES.NEW]: { x: margin, y: 50 },
        [STATES.READY]: { x: margin + usableWidth * 0.15, y: 150 },
        [STATES.RUNNING]: { x: margin + usableWidth * 0.42, y: 150 },
        [STATES.WAITING]: { x: margin + usableWidth * 0.28, y: 300 },
        [STATES.TERMINATED]: { x: margin + usableWidth * 0.82, y: 50 },
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