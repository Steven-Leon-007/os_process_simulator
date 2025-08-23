let currentPID = 0;

/**
 * Genera un PID (Process ID) único incremental en la sesión.
 *
 * Los PIDs se generan en formato numérico con ceros a la izquierda:
 * "001", "002", "003", ...
 *
 * @returns {string} PID único incremental en la sesión.
 */
export function generatePID() {
  currentPID += 1;
  return currentPID.toString().padStart(3, "0");
}

/**
 * Reinicia el contador de PIDs (para pruebas).
 */
export function resetPID() {
  currentPID = 0;
}
