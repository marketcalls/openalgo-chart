import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X, Check } from 'lucide-react';
import styles from './SymbolSearch.module.css';
import { searchSymbols } from '../../services/openalgo';

// Filter tabs with their corresponding API parameters
const FILTER_TABS = [
    { label: 'All', exchange: null, instrumenttype: null },
    { label: 'Stocks', exchange: 'NSE', instrumenttype: 'EQ' },
    { label: 'Futures', exchange: 'NFO', instrumenttype: 'FUT' },
    { label: 'Options', exchange: 'NFO', instrumenttype: null },
    { label: 'Indices', exchange: 'NSE_INDEX', instrumenttype: null },
];

// Helper to get symbol icon based on symbol name
const getSymbolIcon = (symbol, exchange, instrumenttype) => {
    const sym = symbol.toUpperCase();

    // Nifty 50
    if ((sym === 'NIFTY' || sym.includes('NIFTY50')) && !sym.includes('BANK') && !sym.includes('NXT')) {
        return { text: '50', color: '#2962ff', bgColor: '#e3f2fd' };
    }
    // Bank Nifty - bank icon
    if (sym.includes('BANKNIFTY') || sym === 'BANKNIFTY') {
        return { text: '🏦', color: null, bgColor: '#fff3e0', isFlag: true };
    }
    // CNX / Other indices with India flag
    if (sym.includes('CNX') || sym.includes('NIFTY_MID') || sym.includes('CNXSMALLCAP')) {
        return { text: '🇮🇳', color: null, bgColor: '#e8f5e9', isFlag: true };
    }
    // General Nifty related
    if (sym.includes('NIFTY')) {
        return { text: '50', color: '#2962ff', bgColor: '#e3f2fd' };
    }
    // IT index
    if (sym.includes('CNXIT') || sym === 'CNXIT') {
        return { text: '💻', color: null, bgColor: '#e3f2fd', isFlag: true };
    }
    // Default - first letter
    return { text: sym.charAt(0), color: '#607d8b', bgColor: '#eceff1' };
};

// Get instrument type label
const getInstrumentTypeLabel = (exchange, instrumenttype, symbol) => {
    if (exchange === 'NSE_INDEX' || exchange === 'BSE_INDEX' || symbol.includes('INDEX') || symbol.includes('Index')) {
        return 'index';
    }
    if (instrumenttype === 'FUT' || symbol.includes('-FUT') || symbol.includes('FUTURES')) {
        return 'futures';
    }
    if (instrumenttype === 'CE' || instrumenttype === 'PE') {
        return 'options';
    }
    if (instrumenttype === 'EQ') {
        return 'stock';
    }
    return null;
};

// Get exchange badge
const getExchangeBadge = (exchange) => {
    const exch = (exchange || '').toUpperCase();

    // BSE exchanges
    if (exch === 'BSE_INDEX' || exch === 'BSE' || exch === 'BFO') {
        return 'BSE';
    }
    // NSE exchanges
    if (exch === 'NSE_INDEX' || exch === 'NSE' || exch === 'NFO') {
        return 'NSE';
    }
    // MCX
    if (exch === 'MCX') {
        return 'MCX';
    }
    return exchange || 'NSE';
};

// Highlight matching text
const HighlightText = ({ text, highlight }) => {
    if (!highlight || !text) return <>{text}</>;

    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <span key={i} className={styles.highlight}>{part}</span>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
};

const SymbolSearch = ({ isOpen, onClose, onSelect, addedSymbols = [], isCompareMode = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [symbols, setSymbols] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [defaultSymbols, setDefaultSymbols] = useState([]);
    const [activeFilterIndex, setActiveFilterIndex] = useState(0);

    const activeFilter = FILTER_TABS[activeFilterIndex];

    // Load default popular symbols on open
    useEffect(() => {
        let mounted = true;

        if (isOpen && defaultSymbols.length === 0) {
            const defaultList = [
                { symbol: 'NIFTY', exchange: 'NSE_INDEX', instrumenttype: 'INDEX', name: 'Nifty 50 Index' },
                { symbol: 'BANKNIFTY', exchange: 'NSE_INDEX', instrumenttype: 'INDEX', name: 'Nifty Bank Index' },
                { symbol: 'CNXSMALLCAP', exchange: 'NSE_INDEX', instrumenttype: 'INDEX', name: 'Nifty SmallCap 100 Index' },
                { symbol: 'NIFTY_MID_SELECT', exchange: 'NSE_INDEX', instrumenttype: 'INDEX', name: 'Nifty MidCap Select Index' },
                { symbol: 'CNXIT', exchange: 'NSE_INDEX', instrumenttype: 'INDEX', name: 'Nifty IT Index' },
                { symbol: 'CNXFINANCE', exchange: 'NSE_INDEX', instrumenttype: 'INDEX', name: 'Nifty Financial Services Index' },
                { symbol: 'RELIANCE', exchange: 'NSE', instrumenttype: 'EQ', name: 'Reliance Industries Ltd' },
                { symbol: 'TCS', exchange: 'NSE', instrumenttype: 'EQ', name: 'Tata Consultancy Services' },
                { symbol: 'INFY', exchange: 'NSE', instrumenttype: 'EQ', name: 'Infosys Ltd' },
                { symbol: 'HDFCBANK', exchange: 'NSE', instrumenttype: 'EQ', name: 'HDFC Bank Ltd' },
            ];
            if (mounted) {
                setDefaultSymbols(defaultList);
            }
        }

        return () => {
            mounted = false;
        };
    }, [isOpen, defaultSymbols.length]);

    // Debounced search with API filters
    useEffect(() => {
        if (!searchTerm || searchTerm.length < 2) {
            setSymbols([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsLoading(true);
            try {
                // Search without filters to get all results, then filter client-side
                const results = await searchSymbols(searchTerm);

                const transformed = (results || []).map(s => ({
                    symbol: s.symbol || s.tradingsymbol || s.name,
                    exchange: s.exchange || 'NSE',
                    instrumenttype: s.instrumenttype || 'EQ',
                    name: s.name || s.description || s.symbol,
                    expiry: s.expiry || null,
                    strike: s.strike || null,
                }));

                // Apply client-side filtering based on active filter
                let filtered = transformed;
                if (activeFilter.label !== 'All') {
                    filtered = transformed.filter(s => {
                        const instType = s.instrumenttype?.toUpperCase() || '';
                        const exch = s.exchange?.toUpperCase() || '';

                        switch (activeFilter.label) {
                            case 'Stocks':
                                // Stocks are EQ instruments on NSE or BSE
                                return instType === 'EQ' && (exch === 'NSE' || exch === 'BSE');
                            case 'Futures':
                                // Futures are FUT instruments
                                return instType === 'FUT';
                            case 'Options':
                                // Options are CE or PE instruments
                                return instType === 'CE' || instType === 'PE';
                            case 'Indices':
                                // Indices are on NSE_INDEX or BSE_INDEX exchanges
                                return exch === 'NSE_INDEX' || exch === 'BSE_INDEX' || exch.includes('INDEX');
                            default:
                                return true;
                        }
                    });
                }

                // Sort results to prioritize exact/closer matches
                const query = searchTerm.toUpperCase().replace(/\s+/g, '');
                const sorted = filtered.sort((a, b) => {
                    const symA = a.symbol.toUpperCase();
                    const symB = b.symbol.toUpperCase();
                    const nameA = (a.name || '').toUpperCase();
                    const nameB = (b.name || '').toUpperCase();

                    // Priority 1: Exact symbol match
                    const exactA = symA === query || symA === query.replace('50', '') || symA === 'NIFTY';
                    const exactB = symB === query || symB === query.replace('50', '') || symB === 'NIFTY';
                    if (exactA && !exactB) return -1;
                    if (exactB && !exactA) return 1;

                    // Priority 2: Symbol starts with query
                    const startsA = symA.startsWith(query.split(' ')[0]);
                    const startsB = symB.startsWith(query.split(' ')[0]);
                    if (startsA && !startsB) return -1;
                    if (startsB && !startsA) return 1;

                    // Priority 3: Name contains "50 Index" for nifty 50 searches
                    if (query.includes('50') || query.includes('NIFTY')) {
                        const is50A = nameA.includes('50') && nameA.includes('INDEX');
                        const is50B = nameB.includes('50') && nameB.includes('INDEX');
                        if (is50A && !is50B) return -1;
                        if (is50B && !is50A) return 1;
                    }

                    // Priority 4: Shorter symbol names first (more specific)
                    return symA.length - symB.length;
                });

                setSymbols(sorted.slice(0, 50));
            } catch (err) {
                console.error('Error searching symbols:', err);
                setSymbols([]);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, activeFilter]);

    // Filter default symbols based on active filter
    const filteredDefaultSymbols = useMemo(() => {
        if (activeFilter.label === 'All') return defaultSymbols;

        return defaultSymbols.filter(s => {
            if (activeFilter.exchange === 'NSE_INDEX') {
                return s.exchange === 'NSE_INDEX' || s.exchange === 'BSE_INDEX';
            }
            if (activeFilter.instrumenttype) {
                return s.instrumenttype === activeFilter.instrumenttype;
            }
            if (activeFilter.label === 'Options') {
                return s.instrumenttype === 'CE' || s.instrumenttype === 'PE';
            }
            return true;
        });
    }, [defaultSymbols, activeFilter]);

    const displaySymbols = useMemo(() => {
        if (searchTerm && searchTerm.length >= 2) {
            return symbols;
        }
        return filteredDefaultSymbols;
    }, [searchTerm, symbols, filteredDefaultSymbols]);

    const handleSelect = useCallback((sym) => {
        onSelect({ symbol: sym.symbol, exchange: sym.exchange });
        if (!isCompareMode) {
            onClose();
        }
    }, [onSelect, onClose, isCompareMode]);

    const handleFilterChange = (index) => {
        setActiveFilterIndex(index);
        if (searchTerm && searchTerm.length >= 2) {
            setSymbols([]);
        }
    };

    if (!isOpen) return null;

    // Helper to check if a symbol is already added
    const isSymbolAdded = (sym) => {
        return addedSymbols.some(added => {
            const addedSymbol = typeof added === 'string' ? added : added.symbol;
            return addedSymbol === sym.symbol;
        });
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                {/* Title Header */}
                <div className={styles.titleHeader}>
                    <h2 className={styles.title}>
                        {isCompareMode ? 'Compare symbol' : 'Symbol Search'}
                    </h2>
                    <div className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </div>
                </div>

                {/* Search Input */}
                <div className={styles.searchRow}>
                    <div className={styles.searchContainer}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Added Symbols Section (Compare Mode) */}
                {isCompareMode && addedSymbols.length > 0 && (
                    <div className={styles.addedSection}>
                        <div className={styles.sectionHeader}>ADDED SYMBOLS</div>
                        {addedSymbols.map((added, idx) => {
                            const sym = typeof added === 'string'
                                ? { symbol: added, exchange: 'NSE', name: added }
                                : added;
                            const icon = getSymbolIcon(sym.symbol, sym.exchange, sym.instrumenttype);
                            const typeLabel = getInstrumentTypeLabel(sym.exchange, sym.instrumenttype, sym.symbol);
                            const exchangeBadge = getExchangeBadge(sym.exchange);

                            return (
                                <div key={`added-${idx}`} className={`${styles.item} ${styles.addedItem}`}>
                                    <div
                                        className={styles.symbolIcon}
                                        style={{ backgroundColor: icon.bgColor, color: icon.color }}
                                    >
                                        {icon.text}
                                    </div>
                                    <div className={styles.itemSymbol}>{sym.symbol}</div>
                                    <div className={styles.itemDesc}>{sym.name || sym.symbol}</div>
                                    <div className={styles.itemMeta}>
                                        {typeLabel && <span className={styles.typeLabel}>{typeLabel}</span>}
                                        <span className={styles.exchangeBadge}>{exchangeBadge}</span>
                                        <div
                                            className={styles.checkIcon}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelect(sym);
                                            }}
                                        >
                                            <Check size={20} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Filter Tabs */}
                {!isCompareMode && (
                    <div className={styles.filterTabs}>
                        {FILTER_TABS.map((tab, index) => (
                            <button
                                key={tab.label}
                                className={`${styles.filterTab} ${activeFilterIndex === index ? styles.filterTabActive : ''}`}
                                onClick={() => handleFilterChange(index)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Section Header for Results */}
                {isCompareMode && displaySymbols.length > 0 && (
                    <div className={styles.sectionHeader}>RECENT SYMBOLS</div>
                )}

                {/* Results List */}
                <div className={styles.list}>
                    {isLoading && (
                        <div className={styles.loading}>Searching...</div>
                    )}
                    {!isLoading && displaySymbols.map((s, index) => {
                        const icon = getSymbolIcon(s.symbol, s.exchange, s.instrumenttype);
                        const typeLabel = getInstrumentTypeLabel(s.exchange, s.instrumenttype, s.symbol);
                        const exchangeBadge = getExchangeBadge(s.exchange);
                        const isAdded = isCompareMode && isSymbolAdded(s);

                        return (
                            <div
                                key={`${s.exchange}-${s.symbol}-${index}`}
                                className={`${styles.item} ${isAdded ? styles.addedItem : ''}`}
                                onClick={() => handleSelect(s)}
                            >
                                {/* Symbol Icon */}
                                <div
                                    className={styles.symbolIcon}
                                    style={{
                                        backgroundColor: icon.bgColor,
                                        color: icon.color
                                    }}
                                >
                                    {icon.text}
                                </div>

                                {/* Symbol Name */}
                                <div className={styles.itemSymbol}>
                                    <HighlightText text={s.symbol} highlight={searchTerm} />
                                </div>

                                {/* Description */}
                                <div className={styles.itemDesc}>
                                    <HighlightText text={s.name} highlight={searchTerm} />
                                </div>

                                {/* Type + Exchange + Check */}
                                <div className={styles.itemMeta}>
                                    {typeLabel && (
                                        <span className={styles.typeLabel}>{typeLabel}</span>
                                    )}
                                    <span className={styles.exchangeBadge}>{exchangeBadge}</span>
                                    {isAdded && (
                                        <div
                                            className={styles.checkIcon}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelect(s);
                                            }}
                                        >
                                            <Check size={20} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {!isLoading && displaySymbols.length === 0 && searchTerm.length >= 2 && (
                        <div className={styles.noResults}>No symbols found</div>
                    )}
                </div>


            </div>
        </div>
    );
};

export default SymbolSearch;
