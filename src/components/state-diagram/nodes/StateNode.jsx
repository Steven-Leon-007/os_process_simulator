import React from 'react'
import { Handle, Position } from "@xyflow/react";

const StateNode = ({ data }) => {
    return (
        <div
            className="state-node"
            style={{
                backgroundColor: data.color,
            }}
        >
            <Handle type="target" position={Position.Top} className="invisible-handle" id="target-top" />
            <Handle type="source" position={Position.Top} className="invisible-handle" id="source-top" />
            <Handle type="target" position={Position.Right} className="invisible-handle" id="target-right" />
            <Handle type="source" position={Position.Right} className="invisible-handle" id="source-right" />
            <Handle type="target" position={Position.Bottom} className="invisible-handle" id="target-bottom" />
            <Handle type="source" position={Position.Bottom} className="invisible-handle" id="source-bottom" />
            <Handle type="target" position={Position.Left} className="invisible-handle" id="target-left" />
            <Handle type="source" position={Position.Left} className="invisible-handle" id="source-left" />
            <div className="state-label">{data.label}</div>
        </div>
    );
}

export default StateNode