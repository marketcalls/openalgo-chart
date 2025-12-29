import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { getOptionChain, getAvailableExpiries, UNDERLYINGS } from '../../services/optionChain';
import { subscribeToMultiTicker } from '../../services/openalgo';
import styles from './OptionChainModal.module.css';
import classNames from 'classnames';

/**
 * OptionChainModal - Option Chain UI with proper date alignment
 */
const OptionChainModal = ({ isOpen, onClose, onSelectOption, initialSymbol }) => {
    const [underlying, setUnderlying] = useState(UNDERLYINGS[0]);
    const [isCustomSymbol, setIsCustomSymbol] = useState(false);
    const [optionChain, setOptionChain] = useState(null);
    const [availableExpiries, setAvailableExpiries] = useState([]);
    const [selectedExpiry, setSelectedExpiry] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingExpiries, setIsLoadingExpiries] = useState(false);
    const [error, setError] = useState(null);
    const [expiryScrollIndex, setExpiryScrollIndex] = useState(0);
    const [liveLTP, setLiveLTP] = useState(new Map());
    const [focusedRow, setFocusedRow] = useState(-1); // Keyboard navigation
    const [focusedCol, setFocusedCol] = useState('ce'); // 'ce' or 'pe'
    const tableBodyRef = useRef(null);
    const wsRef = useRef(null);

    // Set underlying from initialSymbol when modal opens
    useEffect(() => {
        if (isOpen && initialSymbol) {
            // Check if it's a known index
            const known = UNDERLYINGS.find(u => u.symbol === initialSymbol.symbol);
            if (known) {
                setUnderlying(known);
                setIsCustomSymbol(false);
            } else {
                // Dynamic stock - create underlying object
                // Stock options use 'NSE' exchange (not NSE_INDEX like indices)
                setUnderlying({
                    symbol: initialSymbol.symbol,
                    name: initialSymbol.symbol,
                    exchange: 'NFO',
                    indexExchange: 'NSE'
                });
                setIsCustomSymbol(true);
            }
            // Reset state for new symbol
            setOptionChain(null);
            setAvailableExpiries([]);
            setSelectedExpiry(null);
            setExpiryScrollIndex(0);
        }
    }, [isOpen, initialSymbol]);

    // Parse expiry date
    const parseExpiry = (expiryStr) => {
        const date = new Date(expiryStr);
        if (!isNaN(date.getTime())) {
            const day = date.getDate();
            const month = date.toLocaleString('en-US', { month: 'short' });
            const year = date.getFullYear();
            return { day, month, year };
        }
        return { day: expiryStr, month: '', year: 0 };
    };

    // Group expiries by month with proper structure
    const groupedExpiries = useMemo(() => {
        const groups = [];
        let currentMonth = '';
        let currentYear = 0;
        let lastDisplayedYear = new Date().getFullYear();

        availableExpiries.forEach((exp) => {
            const parsed = parseExpiry(exp);
            const monthKey = `${parsed.month}-${parsed.year}`;

            if (monthKey !== `${currentMonth}-${currentYear}`) {
                // Only show year if it's different from last displayed year
                const showYear = parsed.year !== lastDisplayedYear;
                const monthYear = showYear ? `${parsed.month} '${String(parsed.year).slice(-2)}` : parsed.month;

                groups.push({
                    monthYear,
                    dates: [{ expiry: exp, day: parsed.day }]
                });

                currentMonth = parsed.month;
                currentYear = parsed.year;
                if (showYear) lastDisplayedYear = parsed.year;
            } else {
                groups[groups.length - 1].dates.push({ expiry: exp, day: parsed.day });
            }
        });

        return groups;
    }, [availableExpiries]);

    // Visible groups based on scroll (show ~12 dates at a time)
    const visibleData = useMemo(() => {
        const maxDates = 12;
        const result = [];
        let dateCount = 0;
        let skipCount = expiryScrollIndex;
        let lastDisplayedYear = new Date().getFullYear();

        for (const group of groupedExpiries) {
            if (dateCount >= maxDates) break;

            // Skip dates based on scroll index
            if (skipCount >= group.dates.length) {
                skipCount -= group.dates.length;
                continue;
            }

            const startIdx = skipCount;
            skipCount = 0;

            const remainingSlots = maxDates - dateCount;
            const datesToTake = Math.min(group.dates.length - startIdx, remainingSlots);

            // Get the year from first date in this group's visible slice
            const firstDate = group.dates[startIdx];
            const expDate = new Date(firstDate.expiry);
            const month = expDate.toLocaleString('en-US', { month: 'short' });
            const year = expDate.getFullYear();

            // Show year only if different from last displayed
            const showYear = year !== lastDisplayedYear;
            const monthLabel = showYear ? `${month} '${String(year).slice(-2)}` : month;
            if (showYear) lastDisplayedYear = year;

            result.push({
                monthYear: monthLabel,
                dates: group.dates.slice(startIdx, startIdx + datesToTake)
            });

            dateCount += datesToTake;
        }

        // Calculate total visible dates for scroll (we want last visible to become first)
        const totalVisibleDates = dateCount;

        return { groups: result, scrollAmount: Math.max(1, totalVisibleDates - 1) };
    }, [groupedExpiries, expiryScrollIndex]);

    const totalExpiries = availableExpiries.length;
    const canScrollLeft = expiryScrollIndex > 0;
    const canScrollRight = expiryScrollIndex + 12 < totalExpiries;

    // Fetch expiries
    const fetchExpiries = useCallback(async () => {
        setIsLoadingExpiries(true);
        try {
            const expiries = await getAvailableExpiries(underlying.symbol);
            setAvailableExpiries(expiries);
            if (expiries.length > 0) {
                setSelectedExpiry(expiries[0]);
                setExpiryScrollIndex(0);
            }
        } catch (err) {
            console.error('Failed to fetch expiries:', err);
            setAvailableExpiries([]);
        } finally {
            setIsLoadingExpiries(false);
        }
    }, [underlying]);

    // Fetch chain
    const fetchChain = useCallback(async () => {
        if (!selectedExpiry) return;
        setIsLoading(true);
        setError(null);
        try {
            const chain = await getOptionChain(underlying.symbol, underlying.exchange, selectedExpiry, 15);
            setOptionChain(chain);
        } catch (err) {
            setError('Failed to fetch option chain');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [underlying, selectedExpiry]);

    useEffect(() => {
        if (isOpen) fetchExpiries();
    }, [isOpen, fetchExpiries]);

    useEffect(() => {
        if (isOpen && selectedExpiry) fetchChain();
    }, [isOpen, selectedExpiry, fetchChain]);

    useEffect(() => {
        if (optionChain?.atmStrike && tableBodyRef.current) {
            const spotBar = tableBodyRef.current.querySelector('[data-spot-bar="true"]');
            if (spotBar) spotBar.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [optionChain]);

    // WebSocket subscription for live LTP updates
    useEffect(() => {
        // Cleanup previous subscription
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        if (!isOpen || !optionChain?.chain?.length) return;

        // Build symbol list from chain (include underlying for live spot price)
        const symbols = [
            { symbol: underlying.symbol, exchange: underlying.indexExchange }
        ];
        optionChain.chain.forEach(row => {
            if (row.ce?.symbol) symbols.push({ symbol: row.ce.symbol, exchange: underlying.exchange });
            if (row.pe?.symbol) symbols.push({ symbol: row.pe.symbol, exchange: underlying.exchange });
        });

        if (symbols.length === 0) return;

        console.log('[OptionChain] Subscribing to', symbols.length, 'option symbols for live LTP');

        // Subscribe to WebSocket
        wsRef.current = subscribeToMultiTicker(symbols, (ticker) => {
            setLiveLTP(prev => {
                const newMap = new Map(prev);
                newMap.set(ticker.symbol, {
                    ltp: ticker.last,
                    volume: ticker.volume,
                    timestamp: Date.now()
                });
                return newMap;
            });
        });

        return () => {
            if (wsRef.current) {
                console.log('[OptionChain] Unsubscribing from live LTP');
                wsRef.current.close();
                wsRef.current = null;
            }
            setLiveLTP(new Map());
        };
    }, [isOpen, optionChain?.chain, underlying.exchange]);

    // Chain data
    const chainData = useMemo(() => optionChain?.chain || [], [optionChain]);
    const atmStrike = optionChain?.atmStrike || 0;
    const underlyingLTP = optionChain?.underlyingLTP || 0;

    // Max OI for bars
    const maxOI = useMemo(() => {
        let max = 0;
        chainData.forEach(row => {
            if (row.ce?.oi > max) max = row.ce.oi;
            if (row.pe?.oi > max) max = row.pe.oi;
        });
        return max || 1;
    }, [chainData]);

    const atmIndex = useMemo(() => chainData.findIndex(row => row.strike === atmStrike), [chainData, atmStrike]);

    const { aboveATM, belowATM } = useMemo(() => {
        if (atmIndex === -1) return { aboveATM: chainData, belowATM: [] };
        return { aboveATM: chainData.slice(0, atmIndex + 1), belowATM: chainData.slice(atmIndex + 1) };
    }, [chainData, atmIndex]);

    const handleOptionClick = useCallback((symbol) => {
        if (!symbol) return;
        onSelectOption(symbol, underlying.exchange);
        onClose();
    }, [underlying.exchange, onSelectOption, onClose]);

    // Keyboard navigation handler
    const handleKeyDown = useCallback((e) => {
        if (chainData.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedRow(prev => prev < 0 ? 0 : Math.min(prev + 1, chainData.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedRow(prev => prev < 0 ? 0 : Math.max(prev - 1, 0));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            setFocusedCol(prev => prev === 'ce' ? 'pe' : 'ce');
        } else if (e.key === 'Enter' && focusedRow >= 0 && focusedRow < chainData.length) {
            e.preventDefault();
            const row = chainData[focusedRow];
            const symbol = focusedCol === 'ce' ? row.ce?.symbol : row.pe?.symbol;
            if (symbol) handleOptionClick(symbol);
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [chainData, focusedRow, focusedCol, handleOptionClick, onClose]);

    // Click handler that also updates focus
    const handleCellClick = useCallback((rowIndex, col, symbol) => {
        setFocusedRow(rowIndex);
        setFocusedCol(col);
        handleOptionClick(symbol);
    }, [handleOptionClick]);

    const formatOI = (oi) => {
        if (!oi && oi !== 0) return '-';
        if (oi >= 100000) return (oi / 100000).toFixed(2) + 'L';
        if (oi >= 1000) return (oi / 1000).toFixed(2) + 'K';
        return oi.toLocaleString('en-IN');
    };

    const formatLTP = (ltp) => (!ltp && ltp !== 0) ? '-' : ltp.toFixed(2);
    const getOIBarWidth = (oi) => oi ? Math.min((oi / maxOI) * 100, 100) : 0;

    const formatSpotChange = () => {
        // Get live spot price or fall back to REST data
        const liveSpot = liveLTP.get(underlying.symbol);
        const spotLTP = liveSpot?.ltp ?? underlyingLTP;

        const prevClose = optionChain?.underlyingPrevClose || 0;
        const change = prevClose > 0 ? spotLTP - prevClose : (optionChain?.change || 0);
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : (optionChain?.changePercent || 0);
        const isPositive = change >= 0;

        return {
            price: spotLTP.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            change: (isPositive ? '+' : '') + change.toFixed(2),
            percent: (isPositive ? '+' : '') + changePercent.toFixed(2) + '%',
            isPositive
        };
    };

    // Calculate LTP change percentage
    const getLtpChange = (data) => {
        if (!data?.ltp || !data?.prevClose) return null;
        const change = ((data.ltp - data.prevClose) / data.prevClose) * 100;
        return change;
    };

    const formatLtpChange = (change) => {
        if (change === null || change === undefined) return null;
        const sign = change >= 0 ? '+' : '';
        return sign + change.toFixed(2) + '%';
    };

    const renderRow = (row, isITM_CE, isITM_PE, rowIndex) => {
        // Get live LTP from WebSocket or fall back to REST data
        const ceLive = liveLTP.get(row.ce?.symbol);
        const peLive = liveLTP.get(row.pe?.symbol);

        const ceLTP = ceLive?.ltp ?? row.ce?.ltp;
        const peLTP = peLive?.ltp ?? row.pe?.ltp;

        const ceOIWidth = getOIBarWidth(row.ce?.oi);
        const peOIWidth = getOIBarWidth(row.pe?.oi);
        const isRowFocused = rowIndex === focusedRow;
        const ceClickHandler = () => handleCellClick(rowIndex, 'ce', row.ce?.symbol);
        const peClickHandler = () => handleCellClick(rowIndex, 'pe', row.pe?.symbol);

        // Calculate LTP change using live LTP if available
        const ceLtpChange = row.ce?.prevClose && ceLTP
            ? ((ceLTP - row.ce.prevClose) / row.ce.prevClose) * 100
            : getLtpChange(row.ce);
        const peLtpChange = row.pe?.prevClose && peLTP
            ? ((peLTP - row.pe.prevClose) / row.pe.prevClose) * 100
            : getLtpChange(row.pe);

        return (
            <div key={row.strike} className={classNames(styles.row, {
                [styles.itmCE]: isITM_CE,
                [styles.itmPE]: isITM_PE,
                [styles.focused]: isRowFocused
            })}>
                {/* CALLS - Combined OI + LTP */}
                <div className={classNames(styles.cell, styles.combinedCell, styles.combinedCellLeft, styles.clickable, {
                    [styles.focusedCell]: isRowFocused && focusedCol === 'ce'
                })} onClick={ceClickHandler}>
                    {/* OI with bar */}
                    <div className={styles.oiSection}>
                        <div className={styles.oiBarWrapperLeft}>
                            <div className={styles.oiBarGreen} style={{ width: `${ceOIWidth}%` }}></div>
                        </div>
                        <span className={styles.oiValue}>{formatOI(row.ce?.oi)}</span>
                    </div>
                    {/* LTP with change */}
                    <div className={styles.ltpSection}>
                        <span className={styles.ltpValue}>{formatLTP(ceLTP)}</span>
                        {ceLtpChange !== null && (
                            <span className={classNames(styles.ltpChange, ceLtpChange >= 0 ? styles.changePositive : styles.changeNegative)}>
                                {formatLtpChange(ceLtpChange)}
                            </span>
                        )}
                    </div>
                </div>

                {/* STRIKE */}
                <div className={classNames(styles.cell, styles.strikeCell)}>
                    {row.strike.toLocaleString('en-IN')}
                </div>

                {/* PUTS - Combined LTP + OI */}
                <div className={classNames(styles.cell, styles.combinedCell, styles.combinedCellRight, styles.clickable, {
                    [styles.focusedCell]: isRowFocused && focusedCol === 'pe'
                })} onClick={peClickHandler}>
                    {/* LTP with change */}
                    <div className={styles.ltpSection}>
                        <span className={styles.ltpValue}>{formatLTP(peLTP)}</span>
                        {peLtpChange !== null && (
                            <span className={classNames(styles.ltpChange, peLtpChange >= 0 ? styles.changePositive : styles.changeNegative)}>
                                {formatLtpChange(peLtpChange)}
                            </span>
                        )}
                    </div>
                    {/* OI with bar */}
                    <div className={styles.oiSection}>
                        <div className={styles.oiBarWrapperRight}>
                            <div className={styles.oiBarRed} style={{ width: `${peOIWidth}%` }}></div>
                        </div>
                        <span className={styles.oiValue}>{formatOI(row.pe?.oi)}</span>
                    </div>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    const spotInfo = formatSpotChange();

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <ChevronLeft size={20} className={styles.backIcon} onClick={onClose} />
                        <select
                            className={styles.headerSelect}
                            value={underlying.symbol}
                            onChange={(e) => {
                                const found = UNDERLYINGS.find(u => u.symbol === e.target.value);
                                if (found) {
                                    setUnderlying(found);
                                    setIsCustomSymbol(false);
                                    setSelectedExpiry(null);
                                    setOptionChain(null);
                                }
                            }}
                        >
                            {isCustomSymbol && (
                                <option key={underlying.symbol} value={underlying.symbol}>
                                    {underlying.symbol}
                                </option>
                            )}
                            {UNDERLYINGS.map(u => (
                                <option key={u.symbol} value={u.symbol}>{u.symbol}</option>
                            ))}
                        </select>
                        <span className={styles.headerTitle}>Options</span>
                        <button className={styles.refreshBtnHeader} onClick={fetchChain} disabled={isLoading || !selectedExpiry}>
                            <RefreshCw size={16} className={isLoading ? styles.spin : ''} />
                        </button>
                    </div>
                    <div className={styles.headerRight}>
                        <button className={styles.closeBtn} onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Expiry Picker */}
                <div className={styles.expiryPicker}>
                    {canScrollLeft && (
                        <button className={styles.scrollBtn} onClick={() => setExpiryScrollIndex(prev => Math.max(0, prev - 11))}>
                            <ChevronLeft size={14} />
                        </button>
                    )}

                    <div className={styles.expiryGrid}>
                        {visibleData.groups.map((group, idx) => (
                            <div key={idx} className={styles.monthColumn}>
                                <span className={styles.monthLabel}>{group.monthYear}</span>
                                <div className={styles.dateGroup}>
                                    {group.dates.map((d) => (
                                        <button
                                            key={d.expiry}
                                            className={classNames(styles.dateBtn, {
                                                [styles.activeDate]: selectedExpiry === d.expiry
                                            })}
                                            onClick={() => setSelectedExpiry(d.expiry)}
                                        >
                                            {d.day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {canScrollRight && (
                        <button className={styles.scrollBtn} onClick={() => setExpiryScrollIndex(prev => prev + visibleData.scrollAmount)}>
                            <ChevronRight size={14} />
                        </button>
                    )}
                </div>

                {/* Column Headers - 3 columns */}
                <div className={styles.colHeaders}>
                    <div className={styles.colHeaderCalls}>
                        <span className={styles.colHeaderLabel}>CALLS</span>
                        <span className={styles.colHeaderSub}>OI · LTP</span>
                    </div>
                    <span className={styles.colHeaderStrike}>STRIKE</span>
                    <div className={styles.colHeaderPuts}>
                        <span className={styles.colHeaderLabel}>PUTS</span>
                        <span className={styles.colHeaderSub}>LTP · OI</span>
                    </div>
                </div>

                {/* Table */}
                <div className={styles.tableContainer}>
                    {isLoading ? (
                        <div className={styles.loading}>
                            <Loader2 size={28} className={styles.spin} />
                            <p>Loading option chain...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.error}>
                            <p>{error}</p>
                            <button onClick={fetchChain}>Retry</button>
                        </div>
                    ) : chainData.length === 0 ? (
                        <div className={styles.empty}>
                            <p>No options found</p>
                            <span>Select an expiry to load option chain</span>
                        </div>
                    ) : (
                        <div
                            className={styles.tableBody}
                            ref={tableBodyRef}
                            tabIndex={0}
                            onKeyDown={handleKeyDown}
                        >
                            {aboveATM.map((row, idx) => renderRow(row, row.strike < atmStrike, false, idx))}

                            {optionChain && (
                                <div className={styles.spotBar} data-spot-bar="true">
                                    <div className={styles.spotLine}></div>
                                    <div className={styles.spotBadge}>
                                        <span>Spot price</span>
                                        <strong>{spotInfo.price}</strong>
                                        <span className={classNames(styles.spotChange, { [styles.positive]: spotInfo.isPositive, [styles.negative]: !spotInfo.isPositive })}>
                                            {spotInfo.change} ({spotInfo.percent})
                                        </span>
                                    </div>
                                    <div className={styles.spotLine}></div>
                                </div>
                            )}

                            {belowATM.map((row, idx) => renderRow(row, false, row.strike > atmStrike, aboveATM.length + idx))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OptionChainModal;
