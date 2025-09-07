import { useEffect, useState } from "react";
import { MarkerType } from "@xyflow/react";
import { STATES } from "../../../services/fsm";

export const useStateEdges = () => {
    const [edges, setEdges] = useState([]);

    useEffect(() => {
        const initialEdges = [
            {
                id: "e1",
                source: STATES.NEW,
                sourceHandle: "source-bottom",
                target: STATES.READY,
                targetHandle: "target-left",
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: "#fff" },
                style: { stroke: "#bbb", strokeDasharray: "5 5" },
            },
            {
                id: "e2",
                source: STATES.READY,
                sourceHandle: "source-right",
                target: STATES.RUNNING,
                targetHandle: "target-left",
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: "#fff" },
                style: { stroke: "#bbb", strokeDasharray: "5 5" },
                className: "edge-ready-running",
            },
            {
                id: "e3",
                source: STATES.RUNNING,
                sourceHandle: "source-left",
                target: STATES.READY,
                targetHandle: "target-right",
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: "#fff" },
                style: { stroke: "#bbb", strokeDasharray: "5 5" },
                className: "edge-running-ready",
            },
            {
                id: "e4",
                source: STATES.RUNNING,
                sourceHandle: "source-bottom",
                target: STATES.WAITING,
                targetHandle: "target-right",
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: "#fff" },
                style: { stroke: "#bbb", strokeDasharray: "5 5" },
            },
            {
                id: "e5",
                source: STATES.WAITING,
                sourceHandle: "source-left",
                target: STATES.READY,
                targetHandle: "target-bottom",
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: "#fff" },
                style: { stroke: "#bbb", strokeDasharray: "5 5" },
            },
            {
                id: "e6",
                source: STATES.RUNNING,
                sourceHandle: "source-right",
                target: STATES.TERMINATED,
                targetHandle: "target-bottom",
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: "#fff" },
                style: { stroke: "#bbb", strokeDasharray: "5 5" },
            },
        ];

        setEdges(initialEdges);
    }, []);

    return [edges, setEdges];
};
