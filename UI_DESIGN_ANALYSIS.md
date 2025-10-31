# 📐 Análisis de Diseño UI - OS Process Simulator

## 🎨 Sistema de Diseño Actual

### **Paleta de Colores**

#### Colores Principales
```css
--color-primary: #131F24;          /* Background oscuro principal */
--color-secondary: #151e22d2;      /* Background secundario con opacidad */
--color-accent: #0e1726;           /* Acentos y paneles */
--color-hover: #202F36;            /* Estados hover */
```

#### Colores de Acción
```css
--color-decoration: #1d6826;       /* Verde para acciones principales */
--color-decoration-hover: #1d8b2a; /* Verde hover más brillante */
--color-bg-button: #2c53be;        /* Azul para botones secundarios */
--color-bg-button-hover: #4773ea;  /* Azul hover */
--color-error: #ce2c2c;            /* Rojo para acciones destructivas */
--color-error-hover: #e01212;      /* Rojo hover */
```

#### Colores de Estados de Proceso (FSM)
```javascript
NEW: "#7dd3fc"        // Azul claro
READY: "#60a5fa"      // Azul medio
RUNNING: "#34d399"    // Verde
WAITING: "#f59e0b"    // Naranja/Ámbar
TERMINATED: "#ef4444" // Rojo
```

#### Texto
```css
--color-text-primary: #F5F5F5;     /* Texto principal (claro) */
--color-text-secondary: #000000;   /* Texto oscuro (para fondos claros) */
--color-text-muted: #ffffffa4;     /* Texto secundario con opacidad */
```

---

## 🧱 Componentes y Patrones

### **1. Layout Principal (AppShell)**

**Estructura**:
```
┌─────────────────────────────────────────────┐
│ HEADER                                      │ ← Título + Toggles
├─────────────────────────────────────────────┤
│ MAIN WRAPPER                                │
│ ┌────────────────────┬──────────────────┐  │
│ │ StateDiagram (80%) │ ControlBar (20%) │  │
│ │                    │                  │  │
│ │                    │                  │  │
│ └────────────────────┴──────────────────┘  │
├─────────────────────────────────────────────┤
│ FOOTER                                      │ ← Slider + Botón limpiar
└─────────────────────────────────────────────┘
```

**Responsive** (< 1100px):
- Main wrapper cambia a `flex-direction: column`
- Header se convierte en grid 2 columnas
- Footer pasa a `position: relative`

---

### **2. Botones**

#### Clases base:
```css
.button {
  background-color: var(--color-decoration);
  border: none;
  height: 2rem;
  border-radius: 8px;
  transition: background-color 0.3s ease-in-out;
}
```

#### Variantes:
- **`.create-button`**: `#a67411` → `#d29620` (hover) - Marrón/dorado
- **`.export`**: `var(--color-bg-button)` → azul
- **`.pause`**: `#d26a20` → `#f27419` (hover) - Naranja
- **`.active`**: `var(--color-placeholder)` - Gris, disabled
- **`.clear`**: `var(--color-error)` - Rojo para acciones destructivas

#### Patrón de uso:
```jsx
<button 
  className={mode === "auto" ? "button auto active" : "button auto"}
  disabled={mode === "auto"}
  onClick={handleAuto}
>
  Automático
</button>
```

---

### **3. Tarjetas de Información (Process Cards)**

**Estructura visual**:
```css
.process-card {
  background: var(--color-border);        /* Fondo semi-transparente */
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  padding: 0.75rem;
  border-left: 4px solid ${STATE_COLOR};  /* Borde izquierdo de color */
  transition: box-shadow 0.2s;
}
.process-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08); /* Elevación al hover */
}
```

**Elementos internos**:
- **Título**: `<strong>` con color del estado
- **Detalles pequeños**: `.small` → `font-size: 0.85em`
- **Details/Summary**: Dropdown nativo HTML con estilo personalizado
  - Background: `#e4d9fd` (lavanda claro)
  - Border-radius: `6px`

---

### **4. Paneles Contenedores**

#### InfoPanel:
```css
.info-panel {
  background-color: #0e172686;  /* Fondo semi-transparente */
  border-radius: 8px;
  padding: 0 0.75rem 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  max-height: 70vh;
  overflow-y: auto;              /* Scroll vertical */
}
```

#### ControlBar:
```css
.control-bar {
  width: 20%;
  flex-direction: column;
  gap: 12px;
  height: 100vh;
  padding: 1rem 0.5rem 0;
  border-left: 2px dashed var(--color-border); /* Borde punteado */
}
```

---

### **5. Nodos de Diagrama (ReactFlow)**

#### StateNode (Nodos de estado FSM):
```css
.state-node {
  width: 120px;
  height: 60px;
  border-radius: 8px;
  background-color: [COLOR_BY_STATE]; /* Dinámico según estado */
  color: white;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
}
```

#### ProcessNode (Nodos de proceso):
```css
.process-node {
  min-width: 2.2rem;
  height: 2.2rem;
  border-radius: 6px;
  border: 2px solid #666;
  background: var(--color-secondary);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08);
  font-size: 11px;
  cursor: pointer;
}
```

**Elementos**:
- `.process-pid`: `font-weight: 700`
- `.process-state`: `font-size: 10px; opacity: 0.8`

---

### **6. Menú Contextual**

```css
.process-menu {
  position: absolute;
  background: var(--color-accent);
  border: 1px solid #414349;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  padding: 10px;
  border-radius: 6px;
  z-index: 999;
  min-width: 120px;
}
```

**Botones del menú**:
```css
.menu-btn {
  padding: 6px 8px;
  border: none;
  background: var(--color-bg-button);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  text-align: left;
}
```

---

### **7. Sliders/Inputs de Rango**

**Patrón de uso**:
```jsx
<label className="inactivity-slider">
  <span>Inactividad para automático:</span>
  <input type="range" min={0} max={300} step={5} />
  <span>{value === 0 ? "Desactivado" : `${value} s`}</span>
</label>
```

**Grid para botones con slider**:
```css
.slider-container {
  grid-column: 1 / 3;  /* Ocupa 2 columnas en grid */
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: space-around;
}
```

---

### **8. Tooltips (Portal-based)**

**Implementación con ReactDOM.createPortal**:
```jsx
{hover && ReactDOM.createPortal(
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.2 }}
    className="process-tooltip"
    style={{ position: 'fixed', left: x, top: y }}
  >
    {/* Contenido */}
  </motion.div>,
  document.body
)}
```

**Estilos**:
- Background: Semi-transparente oscuro
- Border-radius: `8px`
- Box-shadow: Elevado
- Padding: Espacioso
- Font-size: Pequeño para datos técnicos

---

## 🎭 Animaciones

### **Framer Motion** (motion components)

#### Transiciones de proceso:
```jsx
<motion.div
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: 20 }}
  transition={{ duration: 0.3 }}
>
```

#### Overlay volador (FlyingOverlay):
- **Duración**: 2000ms
- **Path**: Bezier curves entre estados
- **Highlight de edges**: Temporal durante transición

---

## 📏 Espaciado y Tipografía

### Spacing:
- **Gap pequeño**: `4px`, `6px`
- **Gap medio**: `12px` (común en grids de botones)
- **Gap grande**: `1rem` (16px)
- **Padding cards**: `0.75rem` (12px)
- **Margin entre cards**: `1rem`

### Typography:
- **Font family**: "Raleway", serif (principal)
- **Font family títulos**: "Roboto", sans-serif
- **Font sizes**:
  - Normal: `inherit` (~16px)
  - Small: `0.85em` (~13.6px)
  - Extra small: `11px`, `10px` (nodos)
  - H3: `1.1rem` (17.6px)
  - H1: `2rem` (32px)

### Border Radius:
- **Pequeño**: `4px` (botones de menú)
- **Medio**: `6px`, `8px` (común)
- **Ninguno**: `border-radius: none` en responsive

---

## 🔧 Utilidades CSS

### Shadows:
```css
/* Ligero */
box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);

/* Medio */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

/* Elevado */
box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08);

/* Hover elevado */
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

/* Menú */
box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
```

### Transitions:
```css
transition: background-color 0.3s ease-in-out;  /* Botones */
transition: box-shadow 0.2s;                    /* Cards */
transition: all 0.2s;                           /* Menu buttons */
```

---

## 📱 Responsive Design

### Breakpoint: **1100px**

**Cambios principales**:
1. Main wrapper: `flex-direction: column`
2. Diagram: `width: 100%`
3. Header: Grid de 2 columnas
4. Footer: `position: relative` en lugar de fixed
5. InfoPanel: `max-height: 30vh`, `width: 90%`, centrado

**Breakpoint secundario: 768px** (solo para diagrama)

---

## 🎯 Patrones de Diseño Clave

### 1. **Color Coding por Estado**
- Cada estado FSM tiene color único
- Usado en borders, backgrounds, texto
- Consistente en todo el UI

### 2. **Elevación con Shadows**
- Cards base: Shadow ligero
- Hover: Shadow medio
- Menús/modales: Shadow pesado

### 3. **Feedback Visual**
- Hover states en botones/cards
- Active states con diferentes colores
- Disabled states con cursor: default

### 4. **Spacing Consistente**
- Gap de 12px para grids de botones
- Padding de 0.75rem para contenido
- Margin bottom de 1rem entre cards

### 5. **Transparencias**
- Backgrounds con alpha (86, d2)
- Borders con alpha (65)
- Text muted con alpha (a4)

---

## 📦 Componentes Reutilizables

### Estructura típica de componente:
```
ComponentName/
├── ComponentName.jsx   ← Lógica + JSX
├── ComponentName.css   ← Estilos específicos
└── hooks/              ← Custom hooks si aplica
    └── useFeature.js
```

### Imports típicos:
```jsx
import React, { useState, useEffect } from 'react';
import { useSim } from '../../context/SimulationContext';
import './ComponentName.css';
```

---

## 🎨 Recomendaciones para Nuevos Componentes de Memoria

Basado en el análisis, para mantener consistencia:

### **Colores sugeridos para memoria**:
- **Marcos libres**: `#34d399` (verde, similar a RUNNING)
- **Marcos ocupados**: `#60a5fa` (azul, similar a READY)
- **Página modificada (dirty)**: `#f59e0b` (naranja, similar a WAITING)
- **Víctima Clock**: `#ef4444` (rojo, similar a TERMINATED)
- **Clock pointer**: `#7dd3fc` (azul claro, similar a NEW)

### **Estructura de componente de memoria**:
```jsx
<div className="memory-panel">
  <h3>Memoria Física (16 marcos)</h3>
  <div className="memory-grid">
    {frames.map(frame => (
      <div 
        className="memory-frame"
        style={{ borderColor: getFrameColor(frame) }}
      >
        {/* Contenido */}
      </div>
    ))}
  </div>
</div>
```

### **Estilos sugeridos**:
```css
.memory-panel {
  background-color: #0e172686;
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.memory-frame {
  border-radius: 6px;
  padding: 0.5rem;
  border: 2px solid;
  transition: all 0.2s;
}
```

---

## ✅ Checklist de Consistencia

Al crear nuevos componentes, verificar:

- ✅ Usa variables CSS del `:root`
- ✅ Border-radius: 6px o 8px
- ✅ Transitions de 0.2s - 0.3s
- ✅ Shadows apropiados al nivel de elevación
- ✅ Gap de 12px en grids
- ✅ Padding de 0.75rem en cards
- ✅ Responsive con breakpoint 1100px
- ✅ Font-size pequeño: 0.85em para detalles
- ✅ Hover states con cursor pointer
- ✅ Color coding consistente con estados

---

**Documento generado para mantener uniformidad en componentes de memoria** 🎨
