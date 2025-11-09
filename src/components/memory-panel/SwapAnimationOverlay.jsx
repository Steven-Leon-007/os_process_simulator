import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './SwapAnimationOverlay.css';

/**
 * Overlay que muestra animaciones de page faults y reemplazos
 * @param {Array} replacementHistory - Historial de reemplazos de página
 */
const SwapAnimationOverlay = ({ replacementHistory }) => {
    const [currentEvent, setCurrentEvent] = useState(null);
    const [lastProcessedIndex, setLastProcessedIndex] = useState(-1);

    // Detectar nuevos eventos en el historial
    useEffect(() => {
        if (replacementHistory && replacementHistory.length > lastProcessedIndex + 1) {
            const newEvent = replacementHistory[replacementHistory.length - 1];


            setCurrentEvent(newEvent);
            setLastProcessedIndex(replacementHistory.length - 1);
        }
    }, [replacementHistory]);

    useEffect(() => {
        if (currentEvent) {
            const timer = setTimeout(() => {
                setCurrentEvent(null);
            }, 2500);

            return () => {
                clearTimeout(timer);
            };
        }
    }, [currentEvent]);

    const isReplacement = currentEvent?.type === 'PAGE_REPLACEMENT';
    const isLoad = currentEvent?.type === 'PAGE_LOAD';
    const victim = currentEvent?.victim;
    const loaded = currentEvent?.loaded;

    return (
        <AnimatePresence mode="wait">
            {currentEvent && (
                <motion.div
                    key={`swap-anim-${lastProcessedIndex}`}
                    className="swap-animation-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <motion.div
                        className="swap-animation-container"
                        initial={{ scale: 0.8, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.8, y: -20 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    >

                        {/* Título */}
                        <motion.h3
                            className="swap-title"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            {isLoad ? 'Cargando Página' : 'Page Fault'}
                        </motion.h3>

                        {/* Contenido de la animación */}
                        <div className="swap-content">
                            {isReplacement ? (
                                <>
                                    {/* Página saliente (swap out) */}
                                    <motion.div
                                        className="swap-page swap-out"
                                        initial={{ opacity: 1, x: 0 }}
                                        animate={{ opacity: 0, x: -50 }}
                                        transition={{ duration: 0.6, delay: 0.2 }}
                                    >
                                        <div className="page-info">
                                            <div className="page-label">Swap Out</div>
                                            <div className="page-details">
                                                <span className="page-pid">{victim.pid}</span>
                                                <span className="page-separator">→</span>
                                                <span className="page-number">P{victim.pageNumber}</span>
                                            </div>
                                            <div className="frame-info">Frame {victim.frameNumber}</div>
                                        </div>
                                    </motion.div>

                                    {/* Flecha de reemplazo */}
                                    <motion.div
                                        className="swap-arrow"
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ duration: 0.4, delay: 0.5 }}
                                    >
                                        ⟳
                                    </motion.div>

                                    {/* Página entrante (swap in) */}
                                    <motion.div
                                        className="swap-page swap-in"
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.6, delay: 0.8 }}
                                    >
                                        <div className="page-info">
                                            <div className="page-label">Swap In</div>
                                            <div className="page-details">
                                                <span className="page-pid">{loaded.pid}</span>
                                                <span className="page-separator">→</span>
                                                <span className="page-number">P{loaded.pageNumber}</span>
                                            </div>
                                            <div className="frame-info">Frame {loaded.frameNumber}</div>
                                        </div>
                                    </motion.div>
                                </>
                            ) : (
                                // Solo carga (sin reemplazo)
                                <motion.div
                                    className="swap-page swap-in"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <div className="page-info">
                                        <div className="page-label">Cargando</div>
                                        <div className="page-details">
                                            <span className="page-pid">{loaded.pid}</span>
                                            <span className="page-separator">→</span>
                                            <span className="page-number">P{loaded.pageNumber}</span>
                                        </div>
                                        <div className="frame-info">Frame {loaded.frameNumber}</div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Mensaje descriptivo */}
                        <motion.div
                            className="swap-message"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {isReplacement ? (
                                <>
                                    Reemplazando página <strong>{victim.pageNumber}</strong> de{' '}
                                    <strong>{victim.pid}</strong> por página <strong>{loaded.pageNumber}</strong> de{' '}
                                    <strong>{loaded.pid}</strong>
                                </>
                            ) : (
                                <>
                                    Cargando página <strong>{loaded.pageNumber}</strong> del proceso{' '}
                                    <strong>{loaded.pid}</strong>
                                </>
                            )}
                        </motion.div>

                        {/* Información adicional */}
                        {isReplacement && victim?.wasDirty && (
                            <motion.div
                                className="swap-warning"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 1.4 }}
                            >
                                <span className="warning-icon">💾</span>
                                Página modificada - Se guardó en disco
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SwapAnimationOverlay;
