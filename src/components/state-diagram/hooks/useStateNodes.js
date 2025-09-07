import { useEffect, useState } from "react";
import { STATES } from "../../../services/fsm";
import { STATE_COLORS } from "../utils/constants";

/**
 * Hook que inicializa y mantiene los nodos base (stateNode).
 * @param {Object} positions - posiciones calculadas dinámicamente (por ancho de pantalla).
 * @param {Object} positionOverrides - posiciones guardadas en localStorage (si existen).
 */
export const useStateNodes = (positions, positionOverrides) => {
    const [baseNodes, setBaseNodes] = useState([]);

    useEffect(() => {
        const initialNodes = Object.entries(STATES).map(([key, value]) => ({
            id: value,
            type: "stateNode",
            position: positionOverrides[value] || positions[value],
            data: {
                label: value,
                color: STATE_COLORS[value],
                id: value,
            },
            draggable: true,
        }));

        setBaseNodes(initialNodes);
    }, [positions, positionOverrides]);

    return [baseNodes, setBaseNodes];
};
