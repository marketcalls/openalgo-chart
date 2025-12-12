import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Search, Command, X, BarChart2, TrendingUp, Pencil, Settings, Zap, Clock } from 'lucide-react';
import { useFocusTrap, useKeyboardNav, useListNavigation } from '../../hooks';
import { getHighlightSegments } from '../../utils/fuzzySearch';
import styles from './CommandPalette.module.css';

/**
 * Get icon component for category
 */
const getCategoryIcon = (category) => {
    switch (category) {
        case 'chart':
            return BarChart2;
        case 'indicator':
            return TrendingUp;
        case 'drawing':
            return Pencil;
        case 'tool':
            return Settings;
        case 'action':
            return Zap;
        default:
            return Command;
    }
};

/**
 * Highlight matching text in command title
 */
const HighlightText = ({ text, query }) => {
    if (!query) {
        return <span>{text}</span>;
    }

    const segments = getHighlightSegments(text, query);

    return (
        <span>
            {segments.map((segment, index) => (
                segment.highlight ? (
                    <span key={index} className={styles.highlight}>{segment.text}</span>
                ) : (
                    <span key={index}>{segment.text}</span>
                )
            ))}
        </span>
    );
};

/**
 * CommandPalette component - Global command search (Cmd+K)
 */
const CommandPalette = ({
    isOpen,
    onClose,
    commands,
    recentCommands,
    groupedCommands,
    searchCommands,
    executeCommand,
}) => {
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const focusTrapRef = useFocusTrap(isOpen, { autoFocus: false });

    // Filter commands based on query
    const filteredCommands = useMemo(() => {
        if (!query.trim()) {
            return null; // Show grouped view when no query
        }
        return searchCommands(query);
    }, [query, searchCommands]);

    // Build flat list for keyboard navigation
    const flatList = useMemo(() => {
        if (filteredCommands) {
            return filteredCommands;
        }

        // When no query, build list: recent + grouped
        const list = [];

        // Add recent commands
        if (recentCommands.length > 0) {
            recentCommands.forEach(cmd => {
                list.push({ ...cmd, section: 'recent' });
            });
        }

        // Add grouped commands
        groupedCommands.forEach(group => {
            group.commands.forEach(cmd => {
                list.push({ ...cmd, section: group.category });
            });
        });

        return list;
    }, [filteredCommands, recentCommands, groupedCommands]);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Scroll active item into view
    useEffect(() => {
        if (listRef.current && activeIndex >= 0) {
            const items = listRef.current.querySelectorAll('[data-command-item]');
            const activeItem = items[activeIndex];
            if (activeItem) {
                activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [activeIndex]);

    // Handle keyboard navigation
    useKeyboardNav({
        enabled: isOpen,
        onEscape: onClose,
    });

    useListNavigation({
        enabled: isOpen && flatList.length > 0,
        itemCount: flatList.length,
        activeIndex,
        setActiveIndex,
        onSelect: (index) => {
            const command = flatList[index];
            if (command) {
                handleExecute(command);
            }
        },
    });

    // Handle input change
    const handleInputChange = useCallback((e) => {
        setQuery(e.target.value);
        setActiveIndex(0);
    }, []);

    // Execute command and close palette
    const handleExecute = useCallback((command) => {
        executeCommand(command);
        onClose();
    }, [executeCommand, onClose]);

    // Handle overlay click
    const handleOverlayClick = useCallback((e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    // Detect OS for shortcut display
    const isMac = useMemo(() => {
        return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    }, []);

    const modKey = isMac ? '⌘' : 'Ctrl';

    if (!isOpen) return null;

    // Render command item
    const renderCommandItem = (command, index, isRecent = false) => {
        const isActive = activeIndex === index;
        const CategoryIcon = getCategoryIcon(command.category);

        return (
            <button
                key={`${command.id}-${isRecent ? 'recent' : 'cmd'}`}
                data-command-item
                className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                onClick={() => handleExecute(command)}
                onMouseEnter={() => setActiveIndex(index)}
            >
                <span className={styles.itemIcon}>
                    <CategoryIcon size={16} />
                </span>
                <span className={styles.itemContent}>
                    <span className={styles.itemTitle}>
                        <HighlightText text={command.title} query={query} />
                    </span>
                    {command.description && (
                        <span className={styles.itemDescription}>
                            {command.description}
                        </span>
                    )}
                </span>
                {command.shortcut && (
                    <span className={styles.itemShortcut}>
                        {command.shortcut.includes('F') ? command.shortcut : `${modKey}${command.shortcut}`}
                    </span>
                )}
            </button>
        );
    };

    // Calculate global index for grouped view
    let globalIndex = 0;

    return (
        <div
            className={styles.overlay}
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
        >
            <div ref={focusTrapRef} className={styles.modal}>
                {/* Search Input */}
                <div className={styles.searchRow}>
                    <div className={styles.searchContainer}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={handleInputChange}
                            placeholder="Type a command or search..."
                            className={styles.input}
                            id="command-palette-title"
                            autoComplete="off"
                            spellCheck="false"
                        />
                        <span className={styles.shortcutHint}>{modKey}K</span>
                    </div>
                </div>

                {/* Results */}
                <div ref={listRef} className={styles.list} role="listbox">
                    {filteredCommands ? (
                        // Filtered results (search mode)
                        filteredCommands.length > 0 ? (
                            filteredCommands.map((cmd, index) => renderCommandItem(cmd, index))
                        ) : (
                            <div className={styles.noResults}>
                                No commands found for "{query}"
                            </div>
                        )
                    ) : (
                        // Grouped view (no query)
                        <>
                            {/* Recent Commands */}
                            {recentCommands.length > 0 && (
                                <div className={styles.section}>
                                    <div className={styles.sectionLabel}>
                                        <Clock size={14} className={styles.sectionIcon} />
                                        Recent
                                    </div>
                                    {recentCommands.map((cmd) => {
                                        const index = globalIndex++;
                                        return renderCommandItem(cmd, index, true);
                                    })}
                                </div>
                            )}

                            {/* Grouped Commands */}
                            {groupedCommands.map((group) => {
                                const GroupIcon = getCategoryIcon(group.category);
                                return (
                                    <div key={group.category} className={styles.section}>
                                        <div className={styles.sectionLabel}>
                                            <GroupIcon size={14} className={styles.sectionIcon} />
                                            {group.label}
                                        </div>
                                        {group.commands.map((cmd) => {
                                            const index = globalIndex++;
                                            return renderCommandItem(cmd, index);
                                        })}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <span className={styles.footerHint}>
                        <kbd>↑↓</kbd> Navigate
                    </span>
                    <span className={styles.footerHint}>
                        <kbd>↵</kbd> Execute
                    </span>
                    <span className={styles.footerHint}>
                        <kbd>Esc</kbd> Close
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
