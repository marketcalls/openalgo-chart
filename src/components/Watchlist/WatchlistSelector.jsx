import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Plus, Trash2, Edit2, Check, X, Star } from 'lucide-react';
import styles from './WatchlistSelector.module.css';
import classNames from 'classnames';

const WatchlistSelector = ({
    watchlists,
    activeId,
    onSwitch,
    onCreate,
    onRename,
    onDelete,
    onToggleFavorite,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showCreateInput, setShowCreateInput] = useState(false);
    const [createName, setCreateName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const dropdownRef = useRef(null);
    const createInputRef = useRef(null);
    const editInputRef = useRef(null);

    const activeWatchlist = watchlists.find(wl => wl.id === activeId) || watchlists[0];

    // Sort watchlists to pin Favorites at top
    const sortedWatchlists = useMemo(() => {
        return [...watchlists].sort((a, b) => {
            if (a.id === 'wl_favorites') return -1;
            if (b.id === 'wl_favorites') return 1;
            return 0;
        });
    }, [watchlists]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setShowCreateInput(false);
                setEditingId(null);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Focus create input when shown
    useEffect(() => {
        if (showCreateInput && createInputRef.current) {
            createInputRef.current.focus();
        }
    }, [showCreateInput]);

    // Focus edit input when editing
    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingId]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (isOpen) {
            setShowCreateInput(false);
            setEditingId(null);
        }
    };

    const handleSelect = (id) => {
        onSwitch(id);
        setIsOpen(false);
    };

    const handleCreateClick = () => {
        setShowCreateInput(true);
        setCreateName('');
    };

    const handleCreateSubmit = () => {
        const trimmedName = createName.trim();
        if (trimmedName) {
            onCreate(trimmedName);
            setShowCreateInput(false);
            setCreateName('');
            setIsOpen(false);
        }
    };

    const handleCreateKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCreateSubmit();
        } else if (e.key === 'Escape') {
            setShowCreateInput(false);
            setCreateName('');
        }
    };

    const handleEditClick = (e, wl) => {
        e.stopPropagation();
        setEditingId(wl.id);
        setEditName(wl.name);
    };

    const handleEditSubmit = (id) => {
        const trimmedName = editName.trim();
        if (trimmedName && trimmedName !== watchlists.find(wl => wl.id === id)?.name) {
            onRename(id, trimmedName);
        }
        setEditingId(null);
        setEditName('');
    };

    const handleEditKeyDown = (e, id) => {
        if (e.key === 'Enter') {
            handleEditSubmit(id);
        } else if (e.key === 'Escape') {
            setEditingId(null);
            setEditName('');
        }
    };

    const handleDeleteClick = (e, id) => {
        e.stopPropagation();
        onDelete(id);
    };

    return (
        <div className={styles.selector} ref={dropdownRef}>
            <button className={styles.selectorButton} onClick={handleToggle}>
                <span className={styles.watchlistName}>{activeWatchlist?.name || 'Watchlist'}</span>
                <ChevronDown
                    size={14}
                    className={classNames(styles.chevron, { [styles.chevronOpen]: isOpen })}
                />
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.dropdownList}>
                        {sortedWatchlists.map(wl => {
                            const isFavorites = wl.id === 'wl_favorites';
                            return (
                                <div
                                    key={wl.id}
                                    className={classNames(styles.dropdownItem, {
                                        [styles.active]: wl.id === activeId,
                                        [styles.favorites]: isFavorites,
                                    })}
                                    onClick={() => !editingId && handleSelect(wl.id)}
                                >
                                    {editingId === wl.id ? (
                                        <div className={styles.editRow}>
                                            <input
                                                ref={editInputRef}
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => handleEditKeyDown(e, wl.id)}
                                                className={styles.editInput}
                                                placeholder="Watchlist name"
                                            />
                                            <button
                                                className={styles.iconButton}
                                                onClick={() => handleEditSubmit(wl.id)}
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                className={styles.iconButton}
                                                onClick={() => setEditingId(null)}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {isFavorites && <Star size={14} className={styles.favoriteIcon} />}
                                            <span className={styles.itemName}>{wl.name}</span>
                                            <span className={styles.itemCount}>
                                                {wl.symbols?.length || 0}
                                            </span>
                                            {!isFavorites && (
                                                <div className={styles.itemActions}>
                                                    <button
                                                        className={classNames(styles.iconButton, styles.starButton, {
                                                            [styles.starActive]: wl.isFavorite
                                                        })}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onToggleFavorite?.(wl.id);
                                                        }}
                                                        title={wl.isFavorite ? "Remove from quick access" : "Add to quick access"}
                                                    >
                                                        <Star size={12} />
                                                    </button>
                                                    <button
                                                        className={styles.iconButton}
                                                        onClick={(e) => handleEditClick(e, wl)}
                                                        title="Rename"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    {watchlists.length > 1 && (
                                                        <button
                                                            className={classNames(styles.iconButton, styles.deleteButton)}
                                                            onClick={(e) => handleDeleteClick(e, wl.id)}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className={styles.dropdownFooter}>
                        {showCreateInput ? (
                            <div className={styles.createRow}>
                                <input
                                    ref={createInputRef}
                                    type="text"
                                    value={createName}
                                    onChange={(e) => setCreateName(e.target.value)}
                                    onKeyDown={handleCreateKeyDown}
                                    className={styles.createInput}
                                    placeholder="New watchlist name"
                                />
                                <button
                                    className={styles.iconButton}
                                    onClick={handleCreateSubmit}
                                    disabled={!createName.trim()}
                                >
                                    <Check size={14} />
                                </button>
                                <button
                                    className={styles.iconButton}
                                    onClick={() => setShowCreateInput(false)}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <button className={styles.createButton} onClick={handleCreateClick}>
                                <Plus size={14} />
                                <span>New Watchlist</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(WatchlistSelector);
