import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import styles from './Watchlist.module.css';
import classNames from 'classnames';
import WatchlistSelector from './WatchlistSelector';

const DEFAULT_COLUMN_WIDTHS = {
    symbol: 80,
    last: 65,
    chg: 55,
    chgP: 55
};

const MIN_COLUMN_WIDTH = 40;

const SkeletonRow = () => (
    <div className={styles.skeletonItem}>
        <div className={classNames(styles.skeletonCell, styles.skeletonSymbol)} />
        <div className={classNames(styles.skeletonCell, styles.skeletonPrice)} />
        <div className={classNames(styles.skeletonCell, styles.skeletonChange)} />
        <div className={classNames(styles.skeletonCell, styles.skeletonPercent)} />
    </div>
);

const Watchlist = ({
    currentSymbol,
    items,
    onSymbolSelect,
    onAddClick,
    onRemoveClick,
    onReorder,
    isLoading = false,
    // Multiple watchlists props
    watchlists = [],
    activeWatchlistId = null,
    onSwitchWatchlist,
    onCreateWatchlist,
    onRenameWatchlist,
    onDeleteWatchlist,
    // Quick-access favorites props
    favoriteWatchlists = [],
    onToggleFavorite,
}) => {
    const hasMultipleWatchlists = watchlists.length > 0 && onSwitchWatchlist;
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);
    const [resizing, setResizing] = useState(null);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);

    const handleResizeStart = useCallback((e, column) => {
        e.preventDefault();
        e.stopPropagation();
        setResizing(column);
        startXRef.current = e.clientX;
        startWidthRef.current = columnWidths[column];
    }, [columnWidths]);

    useEffect(() => {
        if (!resizing) return;

        const handleMouseMove = (e) => {
            const diff = e.clientX - startXRef.current;
            const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidthRef.current + diff);
            setColumnWidths(prev => ({
                ...prev,
                [resizing]: newWidth
            }));
        };

        const handleMouseUp = () => {
            setResizing(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizing]);

    const handleSort = useCallback((key) => {
        let direction = 'asc';
        if (sortConfig.key === key) {
            if (sortConfig.direction === 'asc') {
                direction = 'desc';
            } else {
                // Toggle to null (unsorted)
                setSortConfig({ key: null, direction: 'asc' });
                return;
            }
        }
        setSortConfig({ key, direction });
    }, [sortConfig]);

    const handleDragStart = useCallback((e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // Optional: set drag image or style
    }, []);

    const handleDragOver = useCallback((e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }, []);

    const handleDrop = useCallback((e, dropIndex) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) return;

        const newItems = [...items];
        const [draggedItem] = newItems.splice(draggedIndex, 1);
        newItems.splice(dropIndex, 0, draggedItem);

        const newSymbols = newItems.map(item => ({ symbol: item.symbol, exchange: item.exchange }));
        if (onReorder) onReorder(newSymbols);
        setDraggedIndex(null);
    }, [draggedIndex, items, onReorder]);

    const sortedItems = useMemo(() => {
        if (!sortConfig.key) return items;

        return [...items].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            if (['last', 'chg', 'chgP'].includes(sortConfig.key)) {
                aValue = parseFloat(aValue) || 0;
                bValue = parseFloat(bValue) || 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [items, sortConfig]);

    return (
        <div className={classNames(styles.watchlist, { [styles.isResizing]: resizing })}>
            <div className={styles.header}>
                {hasMultipleWatchlists ? (
                    <WatchlistSelector
                        watchlists={watchlists}
                        activeId={activeWatchlistId}
                        onSwitch={onSwitchWatchlist}
                        onCreate={onCreateWatchlist}
                        onRename={onRenameWatchlist}
                        onDelete={onDeleteWatchlist}
                        onToggleFavorite={onToggleFavorite}
                    />
                ) : (
                    <span className={styles.title}>Watchlist</span>
                )}

                {/* Favorite tag pill - quick switch to Favorites watchlist */}
                {hasMultipleWatchlists && activeWatchlistId !== 'wl_favorites' && watchlists.find(wl => wl.id === 'wl_favorites') && (
                    <button
                        className={styles.favoriteTag}
                        onClick={() => onSwitchWatchlist('wl_favorites')}
                        title="Switch to Favorites"
                    >
                        Favorites
                    </button>
                )}

                <div className={styles.actions}>
                    <Plus size={16} className={styles.icon} onClick={onAddClick} title="Add symbol" />
                </div>
            </div>

            {/* Quick-access favorites row */}
            {favoriteWatchlists.length > 0 && hasMultipleWatchlists && (
                <div className={styles.quickAccessRow}>
                    {favoriteWatchlists.map(wl => (
                        <button
                            key={wl.id}
                            className={classNames(styles.quickAccessBtn, {
                                [styles.active]: wl.id === activeWatchlistId
                            })}
                            onClick={() => onSwitchWatchlist(wl.id)}
                            title={wl.name}
                        >
                            {wl.name.charAt(0).toUpperCase()}
                        </button>
                    ))}
                </div>
            )}

            <div className={styles.columnHeaders}>
                <span
                    className={styles.colSymbol}
                    style={{ width: columnWidths.symbol, minWidth: columnWidths.symbol }}
                    onClick={() => handleSort('symbol')}
                >
                    Symbol {sortConfig.key === 'symbol' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </span>
                <div
                    className={styles.resizeHandle}
                    onMouseDown={(e) => handleResizeStart(e, 'symbol')}
                />
                <span
                    className={styles.colLast}
                    style={{ width: columnWidths.last, minWidth: MIN_COLUMN_WIDTH }}
                    onClick={() => handleSort('last')}
                >
                    Last {sortConfig.key === 'last' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </span>
                <div
                    className={styles.resizeHandle}
                    onMouseDown={(e) => handleResizeStart(e, 'last')}
                />
                <span
                    className={styles.colChg}
                    style={{ width: columnWidths.chg, minWidth: MIN_COLUMN_WIDTH }}
                    onClick={() => handleSort('chg')}
                >
                    Chg {sortConfig.key === 'chg' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </span>
                <div
                    className={styles.resizeHandle}
                    onMouseDown={(e) => handleResizeStart(e, 'chg')}
                />
                <span
                    className={styles.colChgP}
                    style={{ width: columnWidths.chgP, minWidth: MIN_COLUMN_WIDTH }}
                    onClick={() => handleSort('chgP')}
                >
                    Chg% {sortConfig.key === 'chgP' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </span>
            </div>

            <div className={styles.list}>
                {isLoading ? (
                    // Show skeleton rows while loading
                    Array.from({ length: 5 }).map((_, index) => (
                        <SkeletonRow key={`skeleton-${index}`} />
                    ))
                ) : sortedItems.length === 0 ? (
                    // Show empty state
                    <div className={styles.emptyState}>
                        <Plus size={24} />
                        <p>No symbols in watchlist</p>
                    </div>
                ) : (
                    // Show actual items
                    sortedItems.map((item, index) => (
                        <div
                            key={item.symbol}
                            className={classNames(styles.item, {
                                [styles.active]: currentSymbol === item.symbol,
                                [styles.dragging]: draggedIndex === index
                            })}
                            onClick={() => onSymbolSelect({ symbol: item.symbol, exchange: item.exchange })}
                            draggable={!sortConfig.key}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                        >
                            <span
                                className={styles.symbolName}
                                style={{ width: columnWidths.symbol, minWidth: columnWidths.symbol }}
                            >
                                {item.symbol}
                            </span>
                            <span
                                className={classNames(styles.last, { [styles.up]: item.up, [styles.down]: !item.up })}
                                style={{ width: columnWidths.last, minWidth: MIN_COLUMN_WIDTH }}
                            >
                                {item.last}
                            </span>
                            <span
                                className={classNames(styles.chg, { [styles.up]: item.up, [styles.down]: !item.up })}
                                style={{ width: columnWidths.chg, minWidth: MIN_COLUMN_WIDTH }}
                            >
                                {item.chg}
                            </span>
                            <span
                                className={classNames(styles.chgP, { [styles.up]: item.up, [styles.down]: !item.up })}
                                style={{ width: columnWidths.chgP, minWidth: MIN_COLUMN_WIDTH }}
                            >
                                {item.chgP}
                            </span>
                            <div
                                className={styles.removeBtn}
                                onClick={(e) => { e.stopPropagation(); onRemoveClick({ symbol: item.symbol, exchange: item.exchange }); }}
                            >
                                <X size={12} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default React.memo(Watchlist);
