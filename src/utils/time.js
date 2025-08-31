export function getTimestamp() {
  return new Date().toISOString();
}

export function formatTimestamp(ts) {
  const d = new Date(ts)
  return d.toLocaleString()
}