import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import styles from './FloatingFavoritesToolbar.module.css';

/**
 * FloatingFavoritesToolbar - A draggable floating toolbar showing favorite drawing tools
 * Only renders when there are favorite tools selected
 */
const FloatingFavoritesToolbar = ({ favoriteTools, activeTool, onToolChange, toolGroups }) => {
    const [position, setPosition] = useState(() => {
        // Load saved position or use default
        const saved = localStorage.getItem('tv_floating_toolbar_pos');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return { x: 100, y: 100 };
            }
        }
        return { x: 100, y: 100 };
    });
    const [isDragging, setIsDragging] = useState(false);
    const [hoveredTool, setHoveredTool] = useState(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const toolbarRef = useRef(null);

    // Get all tools flattened from groups for lookup (memoized)
    const allTools = useMemo(() => {
        const tools = [];
        toolGroups.forEach(group => {
            group.items.forEach(item => {
                tools.push(item);
            });
        });
        return tools;
    }, [toolGroups]);

    // Get the tool data for each favorite (memoized)
    const favoritedToolData = useMemo(() => {
        if (!favoriteTools || favoriteTools.length === 0) return [];
        return favoriteTools
            .map(toolId => allTools.find(t => t.id === toolId))
            .filter(Boolean);
    }, [favoriteTools, allTools]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;

        const newX = e.clientX - dragOffset.current.x;
        const newY = e.clientY - dragOffset.current.y;

        // Keep within viewport bounds
        const maxX = window.innerWidth - (toolbarRef.current?.offsetWidth || 200);
        const maxY = window.innerHeight - (toolbarRef.current?.offsetHeight || 50);

        setPosition({
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY))
        });
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            // Save position to localStorage
            localStorage.setItem('tv_floating_toolbar_pos', JSON.stringify(position));
        }
    }, [isDragging, position]);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleMouseDown = (e) => {
        if (e.target.closest(`.${styles.dragHandle}`)) {
            setIsDragging(true);
            const rect = toolbarRef.current.getBoundingClientRect();
            dragOffset.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            e.preventDefault();
        }
    };

    // Don't render if no favorites - MUST be after all hooks
    if (!favoriteTools || favoriteTools.length === 0) {
        return null;
    }

    return (
        <div
            ref={toolbarRef}
            className={styles.floatingToolbar}
            style={{
                left: position.x,
                top: position.y,
                cursor: isDragging ? 'grabbing' : 'default'
            }}
            onMouseDown={handleMouseDown}
        >
            <div className={styles.widgetWrapper}>
                {/* Drag Handle */}
                <div className={styles.dragHandle}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 12" width="8" height="12" fill="currentColor">
                        <rect width="2" height="2" rx="1"></rect>
                        <rect width="2" height="2" rx="1" y="5"></rect>
                        <rect width="2" height="2" rx="1" y="10"></rect>
                        <rect width="2" height="2" rx="1" x="6"></rect>
                        <rect width="2" height="2" rx="1" x="6" y="5"></rect>
                        <rect width="2" height="2" rx="1" x="6" y="10"></rect>
                    </svg>
                </div>

                {/* Tool Icons */}
                <div className={styles.content}>
                    {favoritedToolData.map(tool => (
                        <div
                            key={tool.id}
                            className={`${styles.widget} ${activeTool === tool.id ? styles.active : ''}`}
                            onClick={() => onToolChange(tool.id)}
                            onMouseEnter={() => setHoveredTool(tool.id)}
                            onMouseLeave={() => setHoveredTool(null)}
                        >
                            <tool.icon size={28} />
                            {hoveredTool === tool.id && (
                                <div className={styles.tooltip}>
                                    {tool.label}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

FloatingFavoritesToolbar.propTypes = {
    favoriteTools: PropTypes.arrayOf(PropTypes.string).isRequired,
    activeTool: PropTypes.string,
    onToolChange: PropTypes.func.isRequired,
    toolGroups: PropTypes.array.isRequired
};

export default FloatingFavoritesToolbar;
