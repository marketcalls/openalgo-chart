import { useCallback, useMemo } from 'react';
import {
    X,
    Keyboard,
    Navigation,
    BarChart2,
    PenTool,
    ZoomIn,
    Zap,
} from 'lucide-react';
import { useFocusTrap, useKeyboardNav } from '../../hooks';
import {
    SHORTCUT_CATEGORIES,
    CATEGORY_LABELS,
    getGroupedShortcuts,
} from '../../config/shortcuts';
import styles from './ShortcutsDialog.module.css';

/**
 * Get icon for a category
 */
const getCategoryIcon = (category) => {
    const icons = {
        [SHORTCUT_CATEGORIES.NAVIGATION]: Navigation,
        [SHORTCUT_CATEGORIES.CHART]: BarChart2,
        [SHORTCUT_CATEGORIES.DRAWING]: PenTool,
        [SHORTCUT_CATEGORIES.ZOOM]: ZoomIn,
        [SHORTCUT_CATEGORIES.ACTIONS]: Zap,
    };
    return icons[category] || Keyboard;
};

/**
 * Render a shortcut key badge
 */
const ShortcutKeyBadge = ({ formatted }) => {
    // For Mac-style shortcuts like "⌘K", render as single badge
    // For Windows-style like "Ctrl+K", split and render with + between

    if (!formatted) return null;

    if (formatted.includes('+')) {
        const parts = formatted.split('+');
        return (
            <div className={styles.shortcutKeys}>
                {parts.map((part, index) => (
                    <span key={index}>
                        <span className={styles.shortcutKey}>{part}</span>
                        {index < parts.length - 1 && (
                            <span className={styles.keyPlus}>+</span>
                        )}
                    </span>
                ))}
            </div>
        );
    }

    return <span className={styles.shortcutKey}>{formatted}</span>;
};

/**
 * Category section component
 */
const CategorySection = ({ category, shortcuts }) => {
    const Icon = getCategoryIcon(category);
    const label = CATEGORY_LABELS[category] || category;

    if (!shortcuts || shortcuts.length === 0) return null;

    return (
        <div className={styles.category}>
            <div className={styles.categoryHeader}>
                <Icon size={14} className={styles.categoryIcon} />
                {label}
            </div>
            {shortcuts.map((shortcut) => (
                <div key={shortcut.id} className={styles.shortcutRow}>
                    <span className={styles.shortcutLabel}>{shortcut.label}</span>
                    <ShortcutKeyBadge formatted={shortcut.formatted} />
                </div>
            ))}
        </div>
    );
};

/**
 * Keyboard Shortcuts Help Dialog
 */
const ShortcutsDialog = ({ isOpen, onClose }) => {
    const focusTrapRef = useFocusTrap(isOpen, { autoFocus: false });

    // Keyboard navigation
    useKeyboardNav({
        enabled: isOpen,
        onEscape: onClose,
    });

    // Get grouped shortcuts
    const groupedShortcuts = useMemo(() => getGroupedShortcuts(), []);

    // Handle overlay click
    const handleOverlayClick = useCallback((e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div
            className={styles.overlay}
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-dialog-title"
        >
            <div ref={focusTrapRef} className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 id="shortcuts-dialog-title" className={styles.title}>
                        <Keyboard size={20} />
                        Keyboard Shortcuts
                    </h2>
                    <button
                        onClick={onClose}
                        className={styles.closeBtn}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                        <CategorySection
                            key={category}
                            category={category}
                            shortcuts={shortcuts}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <span className={styles.footerText}>
                        Press <kbd>?</kbd> to toggle this dialog
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ShortcutsDialog;
