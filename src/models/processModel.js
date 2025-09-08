/**
 * Esquema plano de un proceso.
 */
export const processSchema = {
  pid: {
    type: String,
    required: true,
    description: "Identificador único del proceso (e.g., '001')",
  },
  state: {
    type: String,
    enum: Object.values(STATES),
    default: STATES.NEW,
    description: "Estado actual del proceso",
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 9,
    description: "Prioridad (0–9, donde 9 es más alta)",
  },
  pc: {
    type: Number,
    default: 0,
    description: "Program counter / dirección de la siguiente instrucción",
  },
  cpuRegisters: {
    type: Object,
    default: {},
    description: "Snapshot de registros de CPU asociados al proceso",
  },
  syscalls: {
    type: Array,
    default: [],
    description: "Llamadas al sistema realizadas por el proceso",
  },
  history: {
    type: Array,
    default: [],
    description:
      "Historial de transiciones de estado: [{from:string, to:string, timestamp:Date, cause:string}]",
  },
  createdAt: {
    type: Date,
    default: () => new Date(),
    description: "Marca de tiempo de creación del proceso",
  },
  stateEnteredAt: {
    type: Date,
    default: () => new Date(),
    description: "Marca de tiempo cuando el proceso entró al estado actual",
  },
};
