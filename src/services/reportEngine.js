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

    // Métricas de memoria
    let totalPageFaults = 0;
    let totalMemoryAccesses = 0;
    let processesWithMemory = 0;

    processes.forEach(proc => {
        // Recopilar métricas de memoria
        if (proc.memory) {
            totalPageFaults += proc.memory.pageFaults || 0;
            totalMemoryAccesses += proc.memory.memoryAccesses || 0;
            processesWithMemory++;
        }

        // Calcular tiempos por estado
        if (!proc.history || proc.history.length < 2) return;
        for (let i = 1; i < proc.history.length; i++) {
            const prev = proc.history[i - 1];
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
        avgTimes[s] = arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    });

    // Total de transiciones
    const totalTransitions = stateNames.reduce((acc, s) => acc + stateCounts[s], 0);

    // Métricas de memoria promedio
    const avgPageFaults = processesWithMemory > 0 ? (totalPageFaults / processesWithMemory) : 0;
    const avgMemoryAccesses = processesWithMemory > 0 ? (totalMemoryAccesses / processesWithMemory) : 0;
    const pageFaultRate = totalMemoryAccesses > 0 ? ((totalPageFaults / totalMemoryAccesses) * 100) : 0;

    // Timestamp y configuración
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const configStr = `Modo: ${config.mode}, Velocidad: ${config.speed}`;

    // Construir CSV
    let csv = `Reporte de Simulación\nFecha: ${timestamp}\n${configStr}\n\n`;

    // Métricas de estados
    csv += 'MÉTRICAS DE ESTADOS\n';
    csv += 'Estado,TiempoPromedio(ms),Transiciones\n';
    stateNames.forEach(s => {
        csv += `${s},${avgTimes[s].toFixed(2)},${stateCounts[s]}\n`;
    });
    csv += `\nTotal de transiciones,${totalTransitions}\n\n`;

    // Métricas de memoria
    csv += 'MÉTRICAS DE MEMORIA\n';
    csv += 'Métrica,Valor\n';
    csv += `Total de Page Faults,${totalPageFaults}\n`;
    csv += `Total de Accesos a Memoria,${totalMemoryAccesses}\n`;
    csv += `Procesos con Memoria Asignada,${processesWithMemory}\n`;
    csv += `Promedio de Page Faults por Proceso,${avgPageFaults.toFixed(2)}\n`;
    csv += `Promedio de Accesos a Memoria por Proceso,${avgMemoryAccesses.toFixed(2)}\n`;
    csv += `Tasa de Page Faults (%),${pageFaultRate.toFixed(2)}\n\n`;

    // Detalles por proceso
    csv += 'DETALLES POR PROCESO\n';
    csv += 'PID,Prioridad,PageFaults,AccesosMemoria,PaginasVirtuales,Estado Final\n';
    processes.forEach(p => {
        csv += `${p.pid},${p.priority},${p.memory?.pageFaults || 0},${p.memory?.memoryAccesses || 0},${p.memory?.numPages || 0},${p.state}\n`;
    });

    return csv;
}
import Papa from 'papaparse'


export function processesToCSV(processes) {
    const rows = []
    processes.forEach(p => {
        p.history.forEach(h => {
            rows.push({
                pid: p.pid,
                from: h.from,
                to: h.to,
                timestamp: h.timestamp,
                cause: h.cause,
                priority: h.priority || p.priority,
                pc: h.pc || p.pc,
                pageFaults: p.memory?.pageFaults || 0,
                memoryAccesses: p.memory?.memoryAccesses || 0,
                numPages: p.memory?.numPages || 0
            })
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