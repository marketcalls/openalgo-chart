import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import styles from './WatchlistSection.module.css';
import classNames from 'classnames';

/**
 * WatchlistSection - Collapsible section header within watchlist
 * 
 * Features:
 * - UPPERCASE title
 * - Collapse/expand chevron
 * - Double-click to rename
 * - Delete button on hover
 * - Draggable for reordering
 * - Drop zone for symbols
 */

const WatchlistSection = ({
    title,
    isCollapsed,
    isDragging,
    onToggle,
    onRename,
    onDelete,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    sectionIndex,
    children,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(title);
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef(null);
    const clickTimeoutRef = useRef(null);
    const clickCountRef = useRef(0);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Cleanup timeout on unmount to prevent memory leak
    useEffect(() => {
        return () => {
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
            }
        };
    }, []);

    // Handle single click (toggle) vs double click (rename)
    const handleClick = (e) => {
        // Ignore clicks on drag handle
        if (e.target.closest(`.${styles.dragHandle}`)) {
            return;
        }

        clickCountRef.current += 1;

        if (clickCountRef.current === 1) {
            // Wait to see if it's a double click
            clickTimeoutRef.current = setTimeout(() => {
                if (clickCountRef.current === 1) {
                    // Single click - toggle collapse
                    onToggle?.();
                }
                clickCountRef.current = 0;
            }, 250);
        } else if (clickCountRef.current === 2) {
            // Double click - start editing
            clearTimeout(clickTimeoutRef.current);
            clickCountRef.current = 0;
            setIsEditing(true);
            setEditValue(title);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditValue(title);
        }
    };

    const handleSubmit = () => {
        const trimmed = editValue.trim().toUpperCase();
        if (trimmed && trimmed !== title) {
            onRename?.(title, trimmed);
        }
        setIsEditing(false);
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        onDelete?.(title);
    };

    // Section drag handlers
    const handleSectionDragStart = (e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData('text/plain', `section:${title}`);
        if (onDragStart) {
            onDragStart(e, title, sectionIndex);
        }
    };

    // Section header is a drop zone
    const handleSectionDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
        e.dataTransfer.dropEffect = "move";
        if (onDragOver) {
            onDragOver(e, sectionIndex);
        }
    };

    const handleSectionDragLeave = (e) => {
        setIsDragOver(false);
    };

    const handleSectionDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (onDrop) {
            onDrop(e, sectionIndex, title);
        }
    };

    const handleSectionDragEnd = () => {
        if (onDragEnd) {
            onDragEnd();
        }
    };

    return (
        <div
            className={classNames(styles.section, {
                [styles.dragging]: isDragging,
            })}
        >
            <div
                className={classNames(styles.sectionHeader, {
                    [styles.dragOver]: isDragOver,
                })}
                onClick={handleClick}
                role="button"
                aria-expanded={!isCollapsed}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onToggle?.();
                    }
                }}
                draggable
                onDragStart={handleSectionDragStart}
                onDragOver={handleSectionDragOver}
                onDragLeave={handleSectionDragLeave}
                onDrop={handleSectionDrop}
                onDragEnd={handleSectionDragEnd}
            >
                <ChevronDown
                    size={14}
                    className={classNames(styles.chevron, {
                        [styles.collapsed]: isCollapsed,
                    })}
                />

                {isEditing ? (
                    <div className={styles.editRow} onClick={(e) => e.stopPropagation()}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSubmit}
                            className={styles.editInput}
                            placeholder="Section name"
                        />
                    </div>
                ) : (
                    <>
                        <span className={styles.sectionTitle}>{title}</span>
                        <button
                            className={styles.deleteBtn}
                            onClick={handleDeleteClick}
                            title="Delete section"
                        >
                            <Trash2 size={12} />
                        </button>
                    </>
                )}
            </div>

            {!isCollapsed && (
                <div className={styles.sectionContent}>
                    {children}
                </div>
            )}
        </div>
    );
};

export default React.memo(WatchlistSection);
