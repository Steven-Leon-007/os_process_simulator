import { format } from 'date-fns';

/**
 * Genera un reporte CSV con métricas de simulación
 * @param {Array} processes - Lista de procesos
 * @param {Object} config - Configuración usada (ej: { mode, speed })
 * @returns {string} - Contenido CSV
 */
export function generateSimulationReport(processes, config) {
    // Calcular métricas por proceso
    // Se asume que cada proceso tiene un historial de estados: [{state, timestamp}]
    const stateNames = ['NEW', 'READY', 'RUNNING', 'WAITING', 'TERMINATED'];
    const stateTimes = {};
    const stateCounts = {};
    stateNames.forEach(s => {
        stateTimes[s] = [];
        stateCounts[s] = 0;
    });

    processes.forEach(proc => {
        if (!proc.history || proc.history.length < 2) return;
        for (let i = 1; i < proc.history.length; i++) {
            const prev = proc.history[i-1];
            const curr = proc.history[i];
            const timeInState = curr.timestamp - prev.timestamp;
            stateTimes[prev.state].push(timeInState);
            stateCounts[prev.state]++;
        }
    });

    // Calcular promedios
    const avgTimes = {};
    stateNames.forEach(s => {
        const arr = stateTimes[s];
        avgTimes[s] = arr.length ? (arr.reduce((a,b) => a+b, 0) / arr.length) : 0;
    });

    // Total de transiciones
    const totalTransitions = stateNames.reduce((acc, s) => acc + stateCounts[s], 0);

    // Timestamp y configuración
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const configStr = `Modo: ${config.mode}, Velocidad: ${config.speed}`;

    // Construir CSV
    let csv = `Reporte de Simulación\nFecha: ${timestamp}\n${configStr}\n\n`;
    csv += 'Estado,TiempoPromedio(ms),Transiciones\n';
    stateNames.forEach(s => {
        csv += `${s},${avgTimes[s].toFixed(2)},${stateCounts[s]}\n`;
    });
    csv += `\nTotal de transiciones,${totalTransitions}\n`;

    return csv;
}
import Papa from 'papaparse'


export function processesToCSV(processes) {
    const rows = []
    processes.forEach(p => {
        p.history.forEach(h => {
            rows.push({ pid: p.pid, from: h.from, to: h.to, timestamp: h.timestamp, cause: h.cause })
        })
    })
    return Papa.unparse(rows)
}


export function downloadCSV(filename, csvString) {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}