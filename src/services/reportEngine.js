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