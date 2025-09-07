import React from 'react'
import { motion } from "framer-motion";

const ProcessNode = ({ data }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="process-node"
            style={{ borderColor: data.color }}
        >
            <div className="process-pid">P{data.pid}</div>
            <div className="process-state">{data.state}</div>
        </motion.div>
    );
}

export default ProcessNode