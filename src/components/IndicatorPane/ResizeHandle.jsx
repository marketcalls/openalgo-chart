import React, { useState, useCallback, useEffect } from 'react';
import styles from './IndicatorPane.module.css';

/**
 * ResizeHandle - Draggable handle between chart panes
 */
const ResizeHandle = ({ onResize, minHeight = 60, maxHeight = 300 }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startHeight, setStartHeight] = useState(0);

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
        setStartY(e.clientY);
        // Get current height from parent
        const pane = e.target.closest(`.${styles.paneContainer}`);
        if (pane) {
            setStartHeight(pane.offsetHeight);
        }
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;

        const deltaY = startY - e.clientY; // Negative because dragging up increases height
        let newHeight = startHeight + deltaY;

        // Clamp height
        newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

        if (onResize) {
            onResize(newHeight);
        }
    }, [isDragging, startY, startHeight, minHeight, maxHeight, onResize]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div
            className={`${styles.resizeHandle} ${isDragging ? styles.active : ''}`}
            onMouseDown={handleMouseDown}
        />
    );
};

export default ResizeHandle;
