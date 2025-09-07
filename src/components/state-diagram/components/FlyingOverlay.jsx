import React from 'react'
import { motion } from "framer-motion";

const FlyingOverlay = ({ flying }) => {
    return (
        <div
            className="flying-overlay"
            style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 1200,
            }}
        >
            {flying.map((f) => {
                const fromX = f.from.x;
                const fromY = f.from.y;
                const toX = f.to.x;
                const toY = f.to.y;

                return (
                    <motion.div
                        key={f.key}
                        className="flying-process"
                        initial={{ x: fromX, y: fromY, opacity: 1, scale: 1 }}
                        animate={{ x: toX, y: toY, opacity: 0 }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: "2rem",
                            height: "2rem",
                            borderRadius: 6,
                            border: "2px solid #666",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "var(--color-secondary)",
                            zIndex: 1300,
                            boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                        }}
                    >
                        <div style={{ fontWeight: 700, fontSize: 11 }}>P{f.pid}</div>
                    </motion.div>
                );
            })}
        </div>
    )
}

export default FlyingOverlay