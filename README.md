# Manual de usuario: Simulador de Ciclo de Vida de Procesos

Simulador web que modela los estados **New → Ready → Running → Waiting → Terminated** de procesos en un sistema operativo.  
Permite modo **manual** y **automático**, control de velocidad y exportación de historial en formato CSV.

## Requisitos Previos

Antes de instalar la aplicación, asegúrate de tener:

- **Node.js** >= 20.12  
  [Descargar Node.js](https://nodejs.org/)
- **npm** (ya viene incluido con Node)

## Instalación

```bash
# 1. Clona el repositorio de GitHub en una carpeta local:
    git clone https://github.com/Steven-Leon-007/os_process_simulator

# 2. Entra en la carpeta raiz del proyecto:
    cd carpeta-raiz-proyecto

# 3. Instala las dependencias
    npm install

# 4. Inicia servidor de desarrollo
    npm run dev

# El proyecto quedará disponible en http://localhost:5173

```

## Glosario de Términos

| Término   | Significado                                                                 |
| --------- | --------------------------------------------------------------------------- |
| PID       | Identificador único de proceso.                                             |
| Estado    | Situación actual del proceso (New, Ready, Running, Waiting, Terminated).    |
| Quantum   | Tiempo máximo que un proceso permanece en Running.                          |
| Prioridad | Valor entre 0 y 9 que decide qué proceso recibe CPU primero (9 = más alta). |

## Guía de Uso

**Crear un proceso**  
Clic en **Crear**. Se crea un proceso con prioridad aleatoria y aparece en estado _New_. Si esta en modo automático, se crearán procesos nuevos aleatorios cada 7 segundos.

**Modo Manual / Automático**  
Usa el interruptor:

- _Manual_: cada transición se realiza con los botones, si el sistema no detecta actividad por parte del usuario después de 45 segundos se cambia a estado automático(este tiempo es configurable).
- _Automático_: el motor avanza según tiempos predefinidos.

**Control de velocidad**  
Ajusta el deslizador para cambiar la frecuencia de avance en modo automático.

**Avance de estados (modo manual)**

- Admitir (New → Ready)
- Asignar CPU (Ready → Running)
- Solicitar I/O (Running → Waiting)
- Completar I/O (Waiting → Ready)
- Terminar (Running → Terminated)

**Exportar historial**  
Clic en **Exportar CSV** para descargar el historial de transiciones de cada proceso.

## Interfaz de Usuario

- **Barra de Controles:** Crear procesos, alternar modo, ajustar velocidad, exportar historial y pausar.
- **Diagrama de Estados:** Vista gráfica de los procesos ubicados en su estado actual.
- **Panel de detalles:** El simulador incluye opciones de visualización y sonido que puedes activar o desactivar desde la parte superior de la interfaz:

  - **Mostrar detalles técnicos:**  
    Permite alternar entre dos modos de información para cada proceso.

    - **Cuando la casilla está desactivada (modo simplificado):**

      - PID
      - Estado actual
      - Tiempo transcurrido en el estado
      - Barra de progreso visual (opcional)

    - **Cuando la casilla está activada (modo técnico):**
      - PID
      - Estado actual
      - Prioridad
      - Contador de programa (PC)
      - Registros de CPU
      - Número de llamadas al sistema (Syscalls)
      - Tiempo exacto en el estado actual
      - Historial de transiciones (estado de origen, estado de destino, marca de tiempo, causa y duración en cada estado)

  - **Efectos de sonido:**  
    Activa o desactiva los sonidos asociados a los eventos del simulador  
    (por ejemplo: creación de un proceso, cambio de estado, finalización).

  - **Barra inferior – Tiempo de inactividad:**
    En la esquina inferior izquierda puedes configurar los "Segundos de inactividad" tras los cuales el simulador cambia automáticamente de **Modo Manual** a **Modo Automático**.

  - **Botón "Limpiar Procesos" (parte inferior derecha):** elimina todos los procesos activos y reinicia el temporizador de la simulación.

## Modos de Operación

- _Manual_: el usuario controla cada transición.
- _Automático_: el motor evalúa elapsed y avanza cuando se cumple el tiempo mínimo.

## Ejemplo de Flujo

1. Crear tres procesos desde el botón **Nuevo Proceso**.
2. Activar el **Modo Automático** y seleccionar una velocidad normal.
3. Observar cómo el proceso con **prioridad 8** es asignado a **Running** antes que los demás.
4. Esperar a que los procesos finalicen o soliciten I/O según el quantum configurado.
5. Descargar el historial de la simulación en formato **CSV** para su análisis.

## Solución de Problemas

| Problema              | Posible Causa / Solución                                      |
| --------------------- | ------------------------------------------------------------- |
| El motor no avanza    | Verifica que estés en modo automático y que la velocidad > 0. |
| La app no inicia      | Asegúrate de tener Node.js y npm instalados.                  |
| No descarga CSV       | Revisa permisos del navegador y pop-ups.                      |
| Cambios no reflejados | Refresca la página; verifica consola por errores.             |

## Recursos Visuales

Puedes incluir capturas de pantalla o GIFs mostrando:

- Crear proceso.
  ![GIF demostrativo](assets/crear-proceso.gif)

- Avance de estados.
  ![GIF demostrativo](assets/avanzar-estados.gif)

- Exportación CSV.
  ![GIF demostrativo](assets/descargar-reporte.gif)

## Stack Tecnológico

- React 19 + Vite
- Motion para animaciones
- Papaparse para exportación CSV
- Howler.js para sonidos de eventos
- Vitest + Testing Library para pruebas

## Créditos

- Steven Leon – UI y Diseño
- Natalia Bernal – FSM y QA
- Mileth Martinez – Motor de Simulación y Reportes
