# Manual de Usuario: Simulador de Ciclo de Vida de Procesos

Simulador web que modela los estados **New → Ready → Running → Waiting → Terminated** de procesos en un sistema operativo.  
Incluye gestión de memoria virtual con paginación, algoritmo de reemplazo Clock, simulación de disco y control de velocidad. Permite modo **manual** y **automático**, con exportación de historial en formato CSV.

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

| Término        | Significado                                                                      |
| -------------- | -------------------------------------------------------------------------------- |
| PID            | Identificador único de proceso.                                                  |
| Estado         | Situación actual del proceso (New, Ready, Running, Waiting, Terminated).         |
| Quantum        | Tiempo máximo que un proceso permanece en Running.                               |
| Prioridad      | Valor entre 0 y 9 que decide qué proceso recibe CPU primero (9 = más alta).     |
| Page Fault     | Evento que ocurre cuando un proceso intenta acceder a una página no cargada.     |
| Frame          | Unidad de memoria física donde se almacenan las páginas.                         |
| Page Table     | Tabla que mapea direcciones virtuales a direcciones físicas.                     |
| Clock Algorithm| Algoritmo de reemplazo de páginas que usa bit de referencia circular.            |
| Swap           | Área de disco utilizada para almacenar páginas que no caben en memoria.          |
| Dirty Bit      | Indicador de si una página ha sido modificada desde que fue cargada.             |

## Guía de Uso

### Gestión de Procesos

**Crear un proceso**  
Clic en **Crear**. Se crea un proceso con prioridad aleatoria y aparece en estado _New_. Si está en modo automático, se crearán procesos nuevos aleatorios cada 7 segundos. Cada proceso se crea con un espacio de memoria virtual y una tabla de páginas asignada.

**Modo Manual / Automático**  
Usa el interruptor:

- _Manual_: cada transición se realiza con los botones. Si el sistema no detecta actividad por parte del usuario después de 45 segundos se cambia a estado automático (este tiempo es configurable).
- _Automático_: el motor avanza según tiempos predefinidos.

**Control de velocidad**  
Ajusta el deslizador para cambiar la frecuencia de avance en modo automático. La velocidad afecta tanto las transiciones de estado como las operaciones de memoria y disco.

**Avance de estados (modo manual)**

- Admitir (New → Ready)
- Asignar CPU (Ready → Running)
- Solicitar I/O (Running → Waiting)
- Completar I/O (Waiting → Ready)
- Terminar (Running → Terminated)

**Exportar historial**  
Clic en **Exportar CSV** para descargar el historial de transiciones de cada proceso.

### Gestión de Memoria

**Panel de Memoria Física**  
Visualiza los 12 frames de memoria física disponibles en el sistema. Cada frame puede contener una página de un proceso y muestra:

- PID del proceso propietario
- Número de página virtual
- Estado del bit de referencia (usado por el algoritmo Clock)
- Estado del bit dirty (página modificada)

**Tabla de Páginas**  
Cada proceso tiene su propia tabla de páginas que puede visualizarse haciendo clic en el proceso. La tabla muestra:

- Número de página virtual
- Frame físico asignado (si está presente)
- Bit de presencia (página en memoria o en disco)
- Bit de referencia (usado para reemplazo)
- Bit dirty (página modificada)

**Algoritmo Clock**  
El simulador utiliza el algoritmo Clock para reemplazar páginas cuando la memoria está llena:

1. El puntero del reloj recorre los frames de forma circular
2. Si el bit de referencia es 1, lo cambia a 0 y continúa
3. Si el bit de referencia es 0, selecciona ese frame como víctima
4. Si la página víctima tiene dirty bit en 1, se escribe a disco antes de reemplazarla

La animación del algoritmo Clock es visible en el panel de memoria y se ejecuta proporcionalmente a la velocidad de simulación.

**Page Faults y Bloqueo por I/O de Disco**  
Cuando un proceso en estado Running intenta acceder a una página no cargada en memoria:

1. Se genera un page fault
2. El proceso transita a estado Waiting con indicador visual de I/O de disco
3. Se ejecuta el algoritmo Clock para encontrar un frame disponible
4. Si es necesario, se escribe la página víctima a disco
5. Se carga la página solicitada desde el disco
6. El proceso transita a estado Ready cuando la operación de disco finaliza

El tiempo de operaciones de disco es proporcional a la velocidad de simulación configurada.

**Panel de Disco (Swap)**  
Muestra las páginas que han sido movidas a disco debido a falta de espacio en memoria física. Cada entrada muestra el PID del proceso y el número de página almacenada.

## Interfaz de Usuario

### Barra de Controles
Contiene las acciones principales:
- **Crear:** Genera un nuevo proceso
- **Manual/Automático:** Alterna entre modos de operación
- **Control de velocidad:** Deslizador para ajustar la velocidad de simulación
- **Exportar CSV:** Descarga el historial completo
- **Pausar/Reanudar:** Detiene temporalmente la simulación

### Diagrama de Estados
Vista gráfica que muestra todos los procesos distribuidos en sus estados actuales (New, Ready, Running, Waiting, Terminated). Los procesos pueden arrastrarse entre estados en modo manual.

### Panel de Memoria
Visualización de los frames de memoria física disponibles (12 frames de 4KB cada uno). Muestra:
- Ocupación actual de cada frame
- Proceso propietario y número de página
- Bits de control (referencia, dirty)
- Puntero del algoritmo Clock
- Animación de operaciones de reemplazo

### Panel de Disco
Muestra las páginas almacenadas en el área de swap cuando no caben en memoria física.

### Panel de Detalles
El simulador incluye opciones de visualización y sonido que puedes activar o desactivar desde la parte superior de la interfaz:

- **Mostrar detalles técnicos:**  
  Permite alternar entre dos modos de información para cada proceso.

  - **Cuando la casilla está desactivada (modo simplificado):**
    - PID
    - Estado actual
    - Tiempo transcurrido en el estado
    - Barra de progreso visual
    - Indicador de bloqueo por I/O de disco

  - **Cuando la casilla está activada (modo técnico):**
    - PID
    - Estado actual
    - Prioridad
    - Contador de programa (PC)
    - Registros de CPU
    - Número de llamadas al sistema (Syscalls)
    - Información de page faults y operaciones de disco
    - Tiempo exacto en el estado actual
    - Historial de transiciones (estado de origen, estado de destino, marca de tiempo, causa y duración en cada estado)
    - Acceso a tabla de páginas del proceso

- **Efectos de sonido:**  
  Activa o desactiva los sonidos asociados a los eventos del simulador (por ejemplo: creación de un proceso, cambio de estado, page faults, finalización).

- **Barra inferior – Tiempo de inactividad:**  
  En la esquina inferior izquierda puedes configurar los "Segundos de inactividad" tras los cuales el simulador cambia automáticamente de **Modo Manual** a **Modo Automático**.

- **Botón "Limpiar Procesos" (parte inferior derecha):**  
  Elimina todos los procesos activos, limpia la memoria física y el área de swap, y reinicia el temporizador de la simulación.

## Modos de Operación

### Modo Manual
El usuario controla cada transición de estado mediante los botones de acción. Las operaciones de memoria y page faults ocurren automáticamente cuando un proceso entra en estado Running, pero las transiciones de estado requieren intervención del usuario.

### Modo Automático
El motor de simulación evalúa el tiempo transcurrido y avanza automáticamente cuando se cumple el tiempo mínimo configurado. La velocidad de todas las operaciones (transiciones de estado, operaciones de memoria, operaciones de disco) es proporcional al nivel de velocidad seleccionado.

## Ejemplo de Flujo

### Escenario 1: Simulación Básica
1. Crear tres procesos desde el botón **Nuevo Proceso**.
2. Activar el **Modo Automático** y seleccionar una velocidad normal.
3. Observar cómo el proceso con **prioridad 8** es asignado a **Running** antes que los demás.
4. Esperar a que los procesos finalicen o soliciten I/O según el quantum configurado.
5. Descargar el historial de la simulación en formato **CSV** para su análisis.

### Escenario 2: Gestión de Memoria
1. Crear varios procesos (5 o más) para saturar la memoria física.
2. Activar el **Modo Automático** con velocidad media.
3. Observar cómo los procesos en Running generan page faults al acceder a páginas no cargadas.
4. Ver la ejecución del algoritmo Clock cuando se necesita reemplazar páginas.
5. Monitorear el área de swap para ver qué páginas han sido movidas a disco.
6. Hacer clic en un proceso para ver su tabla de páginas y el estado de cada página.

### Escenario 3: Bloqueo por I/O de Disco
1. Crear 2-3 procesos en modo automático.
2. Cuando un proceso entre en Running, observar cómo puede transitar a Waiting si genera un page fault.
3. El indicador visual "DISK I/O" aparecerá en el proceso bloqueado.
4. Observar la animación del algoritmo Clock mientras busca y reemplaza páginas.
5. El proceso retornará automáticamente a Ready cuando complete la operación de disco.
6. Revisar el historial del proceso para ver los detalles de la operación de I/O.

## Solución de Problemas

| Problema                        | Posible Causa / Solución                                                          |
| ------------------------------- | --------------------------------------------------------------------------------- |
| El motor no avanza              | Verifica que estés en modo automático y que la velocidad > 0.                     |
| La app no inicia                | Asegúrate de tener Node.js >= 20.12 y npm instalados.                             |
| No descarga CSV                 | Revisa permisos del navegador y pop-ups.                                          |
| Cambios no reflejados           | Refresca la página; verifica consola por errores.                                 |
| Memoria siempre llena           | Normal con muchos procesos; observa el algoritmo Clock reemplazando páginas.      |
| Page faults no ocurren          | Los procesos pequeños pueden tener todas sus páginas en memoria.                  |
| Animación Clock muy lenta       | Ajusta la velocidad de simulación a un nivel más alto.                            |
| Procesos no bloquean por I/O    | El bloqueo solo ocurre cuando hay page faults que requieren acceso a disco.       |
| Área de swap vacía              | Normal si hay suficiente memoria; crea más procesos para forzar swap.             |

## Recursos Visuales

### Demostración de Funcionalidades

**Creación de procesos**  
  ![GIF demostrativo](assets/crear-proceso.gif)

**Avance de estados y transiciones**  
  ![GIF demostrativo](assets/avanzar-estados.gif)

**Gestión de memoria y algoritmo Clock**  
_[Espacio reservado para GIF/video demostrativo]_

**Page faults y bloqueo por I/O de disco**  
_[Espacio reservado para GIF/video demostrativo]_

**Visualización de tabla de páginas**  
_[Espacio reservado para GIF/video demostrativo]_

**Exportación de historial CSV**  
  ![GIF demostrativo](assets/descargar-reporte.gif)

## Arquitectura del Simulador

### Componentes Principales

**Motor de Simulación (engine.js)**  
Controla el avance automático de estados y la gestión de tiempos según la velocidad configurada.

**Máquina de Estados Finita (fsm.js)**  
Implementa las transiciones válidas entre estados y gestiona los accesos a memoria de cada proceso.

**Memory Management Unit (mmu.js)**  
Traduce direcciones virtuales a físicas, gestiona las tablas de páginas y detecta page faults.

**Gestor de Page Faults (pageFaultHandler.js)**  
Implementa el algoritmo Clock para reemplazo de páginas y coordina las operaciones de lectura/escritura a disco.

**Simulador de Disco (disk.js)**  
Simula las operaciones de I/O con tiempos proporcionales a la velocidad de simulación.

**Generador de Reportes (reportEngine.js)**  
Recopila el historial de transiciones y genera archivos CSV con toda la información de la simulación.

### Flujo de Operación

1. **Creación de Proceso:** Se asigna PID, prioridad, espacio de memoria virtual y tabla de páginas.
2. **Admisión (New → Ready):** El proceso queda listo para recibir CPU.
3. **Asignación de CPU (Ready → Running):** Se selecciona el proceso de mayor prioridad.
4. **Ejecución:** El proceso realiza accesos a memoria que pueden generar page faults.
5. **Page Fault:** Si la página no está presente, se ejecuta el algoritmo Clock y se bloquea el proceso.
6. **Bloqueo (Running → Waiting):** El proceso espera mientras se completan las operaciones de disco.
7. **Desbloqueo (Waiting → Ready):** Una vez completado el I/O, el proceso retorna a la cola de listos.
8. **Terminación (Running → Terminated):** El proceso finaliza y libera sus recursos de memoria.

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
