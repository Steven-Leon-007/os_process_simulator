import React from "react";

const ProcessMenu = ({ menu, menuRef, simState, ACTIONS_BY_STATE, handleAction, onViewPageTable }) => {
    if (!menu) return null;
    const proc = simState.processes.find(
        (p) => p.pid.toString() === menu.pid.toString()
    );
    const actions = proc ? ACTIONS_BY_STATE[proc.state] || [] : [];
    return (
        <div
            ref={menuRef}
            className="process-menu"
            style={{
                left: menu.x,
                top: menu.y,
            }}
        >
            <div className="menu-title">P{menu.pid}</div>
            <div className="menu-actions">
                {/* Acciones del proceso */}
                {actions.length === 0 ? (
                    <div className="menu-empty">Sin acciones</div>
                ) : (
                    actions.map((a, i) => (
                        <button
                            key={i}
                            className="menu-btn"
                            onClick={() => handleAction(a)}
                            style={{
                                backgroundColor: a.color || "#999",
                            }}
                        >
                            {a.label}
                        </button>
                    ))
                )}

                {!proc ? (
                    <div className="menu-empty">No encontrado</div>
                ) : (
                    <>
                        {/* Botón para ver tabla de páginas */}
                        <button
                            className="menu-btn menu-btn-info"
                            onClick={() => onViewPageTable?.(menu.pid)}
                            style={{
                                backgroundColor: "#9a10d0ff",
                                marginBottom: "8px",
                            }}
                        >
                            Ver tabla de páginas
                        </button>

                    </>
                )}
            </div>
        </div>
    );
};

export default ProcessMenu;