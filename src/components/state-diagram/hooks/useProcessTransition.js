import { useEffect, useRef, useState } from "react";
import useAudio from '../../../hooks/useAudio';
import newReadySfx from '../../../assets/effects/new_ready.mp3';
import readyRunningSfx from '../../../assets/effects/ready_running.mp3';
import runningTerminatedSfx from '../../../assets/effects/running_terminated.mp3';
import runningWaitingSfx from '../../../assets/effects/running_waiting.mp3';
import waitingReadySfx from '../../../assets/effects/waiting_ready.mp3';
import { useSound } from "../../../context/SoundContext";

/**
 * Opciones:
 * - simState: el contexto completo (usa simState.processes)
 * - nodes: lista actual de nodes (para tomar posiciones actuales)
 * - positions: posiciones base por estado (getPositions(...))
 * - positionOverrides: overrides guardadas para estados
 * - STATE_COLORS: mapa de colores por estado
 * - setEdges: setter de edges (desde ReactFlow)
 * - animationDuration: ms (opcional)
 */
export function useProcessTransition({
    simState,
    nodes,
    positions,
    positionOverrides,
    STATE_COLORS,
    setEdges,
    animationDuration = 2000,
}) {
    const prevProcessesRef = useRef([]);
    const flyingRef = useRef([]);
    const timersRef = useRef(new Set());

    const [flying, setFlying] = useState([]);
    const [hiddenPids, setHiddenPids] = useState(new Set());

    const { soundEnabled } = useSound();

    const playNewReady = useAudio(newReadySfx, soundEnabled);
    const playReadyRunning = useAudio(readyRunningSfx, soundEnabled);
    const playRunningTerminated = useAudio(runningTerminatedSfx, soundEnabled);
    const playRunningWaiting = useAudio(runningWaitingSfx, soundEnabled);
    const playWaitingReady = useAudio(waitingReadySfx, soundEnabled);

    // util: clearing timers on unmount
    useEffect(() => {
        return () => {
            timersRef.current.forEach(clearTimeout);
            timersRef.current.clear();
        };
    }, []);

    // Helper: obtener posición actual de un processNode si está renderizado
    const getCurrentNodePos = (pidStr) => {
        const n = nodes.find(n => n.id === pidStr && n.type === "processNode");
        if (n && n.position) return { x: n.position.x, y: n.position.y };
        return null;
    };

    // Helper: calcular destino (mismo algoritmo que tenías)
    const calculateDestPos = (toState, pidStr, allProcesses) => {
        const basePosTo = positionOverrides[toState] || positions[toState] || { x: 100, y: 100 };
        const arrAtDest = allProcesses.filter(p => p.state === toState);
        const idxDest = arrAtDest.findIndex(p => p.pid.toString() === pidStr);
        const perRowDest = (toState === "Terminated") ? 2 : 3;
        const gapXDest = (toState === "Terminated") ? 60 : 42;
        const gapY = 42;
        const offsetXDest = (idxDest >= 0) ? (idxDest % perRowDest) * gapXDest : 0;
        const offsetYDest = (idxDest >= 0) ? Math.floor(idxDest / perRowDest) * gapY + 70 : 70;
        return { x: basePosTo.x + offsetXDest, y: basePosTo.y + offsetYDest };
    };

    const highlightEdge = (fromState, toState, color) => {
        setEdges(prev => prev.map(e => {
            if (e.source === fromState && e.target === toState) {
                const original = e.style?.stroke || '#bbb';
                return {
                    ...e,
                    __originalStroke: original,
                    style: { ...e.style, stroke: color, strokeWidth: 3 }
                };
            }
            return e;
        }));
    };

    const restoreEdge = (fromState, toState) => {
        setEdges(prev => prev.map(e => {
            if (e.source === fromState && e.target === toState) {
                const orig = e.__originalStroke || '#bbb';
                const copy = { ...e };
                delete copy.__originalStroke;
                return { ...copy, style: { ...copy.style, stroke: orig, strokeWidth: 2 } };
            }
            return e;
        }));
    };

    const scheduleTimer = (fn, delay) => {
        const id = setTimeout(() => {
            fn();
            timersRef.current.delete(id);
        }, delay);
        timersRef.current.add(id);
        return id;
    };

    // Orquestador de una transición concreta
    const triggerTransition = (pidStr, fromState, toState, fromPos, toPos) => {
        const key = `${pidStr}-${Date.now()}`;
        const color = STATE_COLORS[toState] || '#999';
        const arrowHighlightDuration = Math.round(animationDuration * 0.85);

        // ocultar el nodo real
        setHiddenPids(prev => {
            const s = new Set(prev);
            s.add(pidStr);
            return s;
        });

        // agregar flying overlay
        const newFlying = { pid: pidStr, from: fromPos, to: toPos, color, key };
        flyingRef.current = [...flyingRef.current, newFlying];
        setFlying([...flyingRef.current]);

        // resaltar edge (si existe)
        highlightEdge(fromState, toState, color);

        // programa restauración del edge
        scheduleTimer(() => {
            restoreEdge(fromState, toState);
        }, arrowHighlightDuration);

        // cuando termine la animación, quitar overlay y mostrar nodo
        scheduleTimer(() => {
            flyingRef.current = flyingRef.current.filter(f => f.key !== key);
            setFlying([...flyingRef.current]);

            setHiddenPids(prev => {
                const s = new Set(prev);
                s.delete(pidStr);
                return s;
            });
        }, animationDuration + 40);
    };

    // efecto principal: detecta transiciones
    useEffect(() => {
        const prev = prevProcessesRef.current || [];
        const prevByPid = Object.fromEntries(prev.map(p => [p.pid.toString(), p]));
        const nowByPid = Object.fromEntries(simState.processes.map(p => [p.pid.toString(), p]));

        simState.processes.forEach(proc => {
            const pidStr = proc.pid.toString();
            const prevProc = prevByPid[pidStr];
            if (prevProc && prevProc.state !== proc.state) {
                const fromState = prevProc.state;
                const toState = proc.state;

                // intentar tomar la posición actual del nodo renderizado; si no, fallback a posicion base del estado
                const currNodePos = getCurrentNodePos(pidStr);
                const fromPos = currNodePos || (positionOverrides[fromState] || positions[fromState]) || { x: 100, y: 100 };

                // calcular destino con la heurística
                const toPos = calculateDestPos(toState, pidStr, simState.processes);

                triggerTransition(pidStr, fromState, toState, fromPos, toPos);

                if (fromState === "New" && toState === "Ready") playNewReady();
                if (fromState === "Ready" && toState === "Running") playReadyRunning();
                if (fromState === "Running" && toState === "Ready") playReadyRunning();
                if (fromState === "Running" && toState === "Terminated") playRunningTerminated();
                if (fromState === "Running" && toState === "Waiting") playRunningWaiting();
                if (fromState === "Waiting" && toState === "Ready") playWaitingReady();
            }
        });

        // actualizar prev
        prevProcessesRef.current = simState.processes.map(p => ({ ...p }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [simState.processes, nodes, positions, positionOverrides, STATE_COLORS]);


    return { flying, hiddenPids };
}
