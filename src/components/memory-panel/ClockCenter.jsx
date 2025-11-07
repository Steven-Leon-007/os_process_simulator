import React from 'react';
import { motion } from 'framer-motion';
import './ClockCenter.css';

const ClockCenter = ({ clockPointer }) => {
  // Mapeo de frameNumber a ángulo de la manecilla
  // Grid 4x4 con 12 frames alrededor del centro 2x2
  // Ángulos calculados para apuntar al centro de cada frame
  // 0° = derecha, 90° = abajo, -90° = arriba, ±180° = izquierda
  const frameAngles = {
    0: -45,  // Frame 0: Top-left diagonal
    1: -22.5, // Frame 1: Top-center-left
    2: 22.5, // Frame 2: Top-center-right
    3: 45,   // Frame 3: Top-right diagonal
    4: 67.5,   // Frame 4: Right-top
    5: 112.5,  // Frame 5: Right-bottom
    6: 135,    // Frame 6: Bottom-right diagonal
    7: 157.5, // Frame 7: Bottom-center-right
    8: 202.5,  // Frame 8: Bottom-center-left
    9: 225,   // Frame 9: Bottom-left diagonal
    10: 247.5,// Frame 10: Left-bottom
    11: 292.5,// Frame 11: Left-top
  };
  

  const rotation = clockPointer !== null && clockPointer !== undefined 
    ? frameAngles[clockPointer] ?? 0 
    : 0;

  return (
    <div className="clock-center">
      <div className="clock-face">
        {/* Círculo exterior */}
        <svg className="clock-svg" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(251, 191, 36, 0.3)"
            strokeWidth="2"
          />
          
          {/* Marcas de horas (12 posiciones) */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30) - 90; // 30° por cada hora, -90 para empezar arriba
            const x1 = 50 + 38 * Math.cos((angle * Math.PI) / 180);
            const y1 = 50 + 38 * Math.sin((angle * Math.PI) / 180);
            const x2 = 50 + 42 * Math.cos((angle * Math.PI) / 180);
            const y2 = 50 + 42 * Math.sin((angle * Math.PI) / 180);
            
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(251, 191, 36, 0.5)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}
          
          {/* Centro del reloj */}
          <circle cx="50" cy="50" r="4" fill="#fbbf24" />
        </svg>

        {/* Manecilla apuntando al frame */}
        <motion.div
          className="clock-hand"
          animate={{ rotate: rotation }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 15,
            duration: 0.6
          }}
        >
          <div className="hand-pointer" />
        </motion.div>

        {/* Etiqueta opcional */}
        {clockPointer !== null && clockPointer !== undefined && (
          <motion.div
            className="clock-label"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <span className="label-text">Frame {clockPointer}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ClockCenter;
