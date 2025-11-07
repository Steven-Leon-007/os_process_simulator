import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import './ClockCenter.css';

const ClockCenter = ({ clockPointer, action }) => {
  // Ángulos base de cada frame (en el rango -180 a 180)
  const baseFrameAngles = {
    0: -45,
    1: -22.5,
    2: 22.5,
    3: 45,
    4: 67.5,
    5: 112.5,
    6: 135,
    7: 157.5,
    8: 202.5,
    9: 225,
    10: 247.5,
    11: 292.5,
  };
  
  // Mantener el ángulo acumulado para rotación continua
  const previousAngleRef = useRef(0);
  const previousFrameRef = useRef(null);
  
  // Calcular el ángulo acumulado para rotación continua
  let rotation = 0;
  
  if (clockPointer !== null && clockPointer !== undefined) {
    const baseAngle = baseFrameAngles[clockPointer] ?? 0;
    const prevFrame = previousFrameRef.current;
    
    if (prevFrame !== null) {
      const prevBaseAngle = baseFrameAngles[prevFrame] ?? 0;
      let angleDiff = baseAngle - prevBaseAngle;
      
      // Si el ángulo retrocede (ej: de 292.5° a -45°), añadir 360° para continuar
      if (angleDiff < -180) {
        angleDiff += 360;
      } else if (angleDiff > 180) {
        angleDiff -= 360;
      }
      
      rotation = previousAngleRef.current + angleDiff;
    } else {
      // Primera vez, usar el ángulo base
      rotation = baseAngle;
    }
    
    previousAngleRef.current = rotation;
    previousFrameRef.current = clockPointer;
  } else {
    rotation = previousAngleRef.current;
  }

  // Traducir acciones a texto legible
  const getActionText = (action) => {
    switch (action) {
      case 'evaluating':
        return 'Evaluando';
      case 'second_chance':
        return 'Segunda oportunidad';
      case 'victim_found':
        return 'Víctima encontrada';
      default:
        return '';
    }
  };

  // Velocidad de animación según la acción
  const getTransitionSpeed = (action) => {
    if (action === 'victim_found') {
      return { stiffness: 80, damping: 12, duration: 0.5 };
    }
    // Más rápido durante el recorrido
    return { stiffness: 150, damping: 20, duration: 0.2 };
  };

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
            ...getTransitionSpeed(action)
          }}
        >
          <div className="hand-pointer" />
        </motion.div>

        {/* Etiqueta con frame y acción */}
        {clockPointer !== null && clockPointer !== undefined && (
          <motion.div
            className="clock-label"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <span className="label-text">
              Frame {clockPointer}
              {action && (
                <span className="action-text">{getActionText(action)}</span>
              )}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ClockCenter;
