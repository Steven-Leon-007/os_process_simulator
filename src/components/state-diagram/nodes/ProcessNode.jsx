import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const ProcessNode = ({ data }) => {
  const [hover, setHover] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Actualizar el tiempo cada segundo para mantener la información actualizada
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const { showDetails } = data;

  // Calcular tiempo transcurrido en el estado actual
  const elapsedCurrent = currentTime - new Date(data.stateEnteredAt).getTime();
  const elapsedSecondsCurrent = Math.round(elapsedCurrent / 1000);

  // Función para calcular el tiempo en cada estado del historial
  const calculateStateTimes = () => {
    if (!Array.isArray(data.history) || data.history.length === 0) return [];

    const stateTimes = [];

    // Calcular tiempos para cada transición en el historial
    for (let i = 0; i < data.history.length; i++) {
      const currentEvent = data.history[i];
      const nextEvent = data.history[i + 1];

      const startTime = new Date(currentEvent.timestamp).getTime();
      const endTime = nextEvent
        ? new Date(nextEvent.timestamp).getTime()
        : currentTime;

      const duration = endTime - startTime;
      const durationSeconds = Math.round(duration / 1000);

      stateTimes.push({
        state: currentEvent.to,
        duration: duration,
        durationSeconds: durationSeconds,
        cause: currentEvent.cause,
        timestamp: currentEvent.timestamp,
      });
    }

    return stateTimes;
  };

  const stateTimes = calculateStateTimes();

  // Función para formatear el tiempo en formato legible
  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Función para generar la barra de progreso
  const renderProgressBar = () => {
    const maxTime = 60; // 60 segundos como máximo para el ejemplo
    const progress = Math.min((elapsedSecondsCurrent / maxTime) * 100, 100);

    return (
      <div className="progress-container">
        <motion.div
          className="progress-bar"
          style={{
            backgroundColor: data.color || "#007bff",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="process-node"
      style={{ borderColor: data.color }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="process-pid">P{data.pid}</div>
      <div className="process-state">{data.state}</div>

      {hover && (
        <div className="process-tooltip">
          {showDetails ? (
            // Información detallada de bajo nivel
            <>
              <div>
                <strong>PID:</strong> {data.pid}
              </div>
              <div>
                <strong>Prioridad:</strong> {data.priority ?? 0}
              </div>
              <div>
                <strong>PC:</strong> {data.pc ?? 0}
              </div>
              <div>
                <strong>Registros:</strong>{" "}
                {Object.keys(data.cpuRegisters || {}).length > 0
                  ? JSON.stringify(data.cpuRegisters)
                  : "N/A"}
              </div>
              <div>
                <strong>Syscalls:</strong>{" "}
                {Array.isArray(data.syscalls) ? data.syscalls.length : 0}
              </div>

              {/* Historial de estados con tiempos */}
              <div className="history-section">
                <strong>Historial de estados:</strong>
                {stateTimes.length > 0 ? (
                  <div className="history-list">
                    {stateTimes.map((stateTime, index) => (
                      <div key={index} className="history-item">
                        <div>
                          <strong>{stateTime.state}</strong>:{" "}
                          {formatTime(stateTime.duration)}
                          {stateTime.cause && `${stateTime.cause})`}
                        </div>
                        <div className="history-timestamp">
                          {new Date(stateTime.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>No hay historial disponible</div>
                )}
              </div>

              <div className="current-state-info">
                <strong>Tiempo en estado actual:</strong>{" "}
                {formatTime(elapsedCurrent)}
              </div>
              <div>
                <strong>Total de transiciones:</strong> {stateTimes.length}
              </div>
              {data.cpuCycles && (
                <div>
                  <strong>Ciclos CPU:</strong> {data.cpuCycles}
                </div>
              )}
            </>
          ) : (
            // Información básica
            <>
              <div>
                <strong>PID:</strong> {data.pid}
              </div>
              <div>
                <strong>Estado:</strong> {data.state}
              </div>
              <div className="progress-info">
                <strong>Progreso:</strong> Este proceso lleva{" "}
                {formatTime(elapsedCurrent)} en {data.state}
              </div>
              {renderProgressBar()}
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ProcessNode;
