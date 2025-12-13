import React from 'react';
import { createPortal } from 'react-dom';
import { Layers, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import styles from './ContextMenu.module.css';

/**
 * ContextMenu - Right-click context menu for watchlist symbols
 * 
 * Options:
 * - Add section above
 * - Move to top
 * - Move to bottom
 * - Remove from watchlist
 */

const ContextMenu = ({
    isVisible,
    position,
    onClose,
    onAddSection,
    onMoveToTop,
    onMoveToBottom,
    onRemove,
}) => {
    if (!isVisible) return null;

    // Calculate menu position to avoid going off-screen
    const menuStyle = {
        left: Math.min(position.x, window.innerWidth - 200),
        top: Math.min(position.y, window.innerHeight - 200),
    };

    const handleClick = (action) => (e) => {
        e.stopPropagation();
        action();
        onClose();
    };

    const menuContent = (
        <>
            {/* Backdrop to close menu */}
            <div className={styles.backdrop} onClick={onClose} />

            <div className={styles.menu} style={menuStyle}>
                <button className={styles.menuItem} onClick={handleClick(onAddSection)}>
                    <Layers size={14} />
                    <span>Add section above</span>
                </button>

                <div className={styles.divider} />

                <button className={styles.menuItem} onClick={handleClick(onMoveToTop)}>
                    <ArrowUp size={14} />
                    <span>Move to top</span>
                </button>

                <button className={styles.menuItem} onClick={handleClick(onMoveToBottom)}>
                    <ArrowDown size={14} />
                    <span>Move to bottom</span>
                </button>

                <div className={styles.divider} />

                <button
                    className={`${styles.menuItem} ${styles.danger}`}
                    onClick={handleClick(onRemove)}
                >
                    <Trash2 size={14} />
                    <span>Remove from watchlist</span>
                </button>
            </div>
        </>
    );

    return createPortal(menuContent, document.body);
};

export default React.memo(ContextMenu);
