import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import classNames from 'classnames';
import { Plus, X, Search } from 'lucide-react';
import styles from './PositionTracker.module.css';
import PositionTrackerItem from './PositionTrackerItem';
import PositionTrackerHeader from './PositionTrackerHeader';

// Market timing constants (IST)
const MARKET_OPEN = { hour: 9, minute: 15 };
const MARKET_CLOSE = { hour: 15, minute: 30 };

const getMarketStatus = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const day = now.getDay();

  if (day === 0 || day === 6) {
    return { isOpen: false, status: 'Weekend' };
  }

  const timeInMinutes = hours * 60 + minutes;
  const openTime = MARKET_OPEN.hour * 60 + MARKET_OPEN.minute;
  const closeTime = MARKET_CLOSE.hour * 60 + MARKET_CLOSE.minute;

  if (timeInMinutes >= openTime && timeInMinutes <= closeTime) {
    return { isOpen: true, status: 'Market Open' };
  } else if (timeInMinutes < openTime) {
    return { isOpen: false, status: 'Pre-Market' };
  } else {
    return { isOpen: false, status: 'Market Closed' };
  }
};

const PositionTracker = ({
  sourceMode,
  customSymbols,
  watchlistData,        // Live data from App.jsx (already fetched)
  isLoading,            // Loading state from App.jsx
  onSourceModeChange,
  onCustomSymbolsChange,
  onSymbolSelect,
  isAuthenticated,
}) => {
  const [showAddSymbol, setShowAddSymbol] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [marketState, setMarketState] = useState(() => getMarketStatus());
  const searchInputRef = useRef(null);
  const previousRanksRef = useRef(new Map());

  // Update market status every minute
  useEffect(() => {
    const checkStatus = () => setMarketState(getMarketStatus());
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Focus search input when add symbol panel opens
  useEffect(() => {
    if (showAddSymbol && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showAddSymbol]);

  // Calculate % change from opening price (intraday) instead of prev_close
  const calculateIntradayChange = (item) => {
    const ltp = parseFloat(item.last) || 0;
    const openPrice = parseFloat(item.open) || 0;

    // Use opening price for intraday % change calculation
    if (openPrice > 0 && ltp > 0) {
      return ((ltp - openPrice) / openPrice) * 100;
    }
    // Fallback to chgP (based on prev_close) if open not available
    return parseFloat(item.chgP) || 0;
  };

  // Process and rank the data
  const rankedData = useMemo(() => {
    let dataToRank = [];

    if (sourceMode === 'watchlist') {
      // Use the live watchlist data directly
      dataToRank = (watchlistData || []).map(item => ({
        symbol: item.symbol,
        exchange: item.exchange || 'NSE',
        ltp: parseFloat(item.last) || 0,
        openPrice: parseFloat(item.open) || 0,
        percentChange: calculateIntradayChange(item),
      }));
    } else {
      // Custom mode - filter watchlistData to only show custom symbols
      const customSet = new Set(
        (customSymbols || []).map(s => `${s.symbol}-${s.exchange || 'NSE'}`)
      );
      dataToRank = (watchlistData || [])
        .filter(item => customSet.has(`${item.symbol}-${item.exchange || 'NSE'}`))
        .map(item => ({
          symbol: item.symbol,
          exchange: item.exchange || 'NSE',
          ltp: parseFloat(item.last) || 0,
          openPrice: parseFloat(item.open) || 0,
          percentChange: calculateIntradayChange(item),
        }));
    }

    // Sort by percent change (descending - highest gainers first)
    const sorted = [...dataToRank].sort((a, b) => b.percentChange - a.percentChange);

    // Calculate ranks
    return sorted.map((item, index) => {
      const key = `${item.symbol}-${item.exchange}`;
      const previousRank = previousRanksRef.current.get(key) ?? (index + 1);
      const currentRank = index + 1;
      const rankChange = previousRank - currentRank;

      // Update previous rank for next render
      previousRanksRef.current.set(key, currentRank);

      return {
        ...item,
        currentRank,
        previousRank,
        rankChange,
      };
    });
  }, [watchlistData, sourceMode, customSymbols]);

  const handleAddSymbol = useCallback((symbol, exchange = 'NSE') => {
    if (sourceMode !== 'custom') return;

    const exists = (customSymbols || []).some(
      s => s.symbol === symbol && s.exchange === exchange
    );
    if (!exists) {
      onCustomSymbolsChange([...(customSymbols || []), { symbol, exchange }]);
    }
    setSearchQuery('');
    setShowAddSymbol(false);
  }, [sourceMode, customSymbols, onCustomSymbolsChange]);

  const handleRemoveSymbol = useCallback((symbol, exchange) => {
    if (sourceMode !== 'custom') return;

    onCustomSymbolsChange(
      (customSymbols || []).filter(s => !(s.symbol === symbol && s.exchange === exchange))
    );
  }, [sourceMode, customSymbols, onCustomSymbolsChange]);

  const handleRowClick = useCallback((item) => {
    onSymbolSelect({ symbol: item.symbol, exchange: item.exchange });
  }, [onSymbolSelect]);

  // Render loading skeleton
  const renderSkeleton = () => (
    <div className={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={styles.skeletonRow}>
          <div className={styles.skeletonCell} style={{ width: '40px' }} />
          <div className={styles.skeletonCell} style={{ width: '35px' }} />
          <div className={styles.skeletonCell} style={{ width: '80px' }} />
          <div className={styles.skeletonCell} style={{ width: '65px' }} />
          <div className={styles.skeletonCell} style={{ width: '55px' }} />
        </div>
      ))}
    </div>
  );

  // Render empty state
  const renderEmptyState = () => (
    <div className={styles.emptyState}>
      <p className={styles.emptyTitle}>
        {sourceMode === 'watchlist'
          ? 'No symbols in watchlist'
          : 'No symbols added'}
      </p>
      <p className={styles.emptySubtitle}>
        {sourceMode === 'watchlist'
          ? 'Add symbols to your watchlist to track positions'
          : 'Click + to add symbols to track'}
      </p>
    </div>
  );

  return (
    <div className={styles.positionTracker}>
      <PositionTrackerHeader
        sourceMode={sourceMode}
        onSourceModeChange={onSourceModeChange}
        marketStatus={marketState.status}
        isMarketOpen={marketState.isOpen}
        symbolCount={rankedData.length}
      />

      {/* Column Headers */}
      <div className={styles.columnHeaders}>
        <span className={styles.colRank}>#</span>
        <span className={styles.colMove}>Move</span>
        <span className={styles.colSymbol}>Symbol</span>
        <span className={styles.colLtp}>LTP</span>
        <span className={styles.colChange}>% Chg</span>
        {sourceMode === 'custom' && <span className={styles.colAction} />}
      </div>

      {/* Content Area */}
      <div className={styles.content}>
        {!isAuthenticated ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>API not connected</p>
            <p className={styles.emptySubtitle}>
              Connect to OpenAlgo API to track positions
            </p>
          </div>
        ) : isLoading ? (
          renderSkeleton()
        ) : rankedData.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className={styles.itemList}>
            {rankedData.map((item) => (
              <PositionTrackerItem
                key={`${item.symbol}-${item.exchange}`}
                item={item}
                onClick={() => handleRowClick(item)}
                onRemove={sourceMode === 'custom' ? () => handleRemoveSymbol(item.symbol, item.exchange) : null}
                showRemove={sourceMode === 'custom'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Symbol Button (Custom mode only) */}
      {sourceMode === 'custom' && isAuthenticated && (
        <div className={styles.footer}>
          {showAddSymbol ? (
            <div className={styles.addSymbolPanel}>
              <div className={styles.searchInputWrapper}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  ref={searchInputRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder="Enter symbol (e.g., RELIANCE)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      handleAddSymbol(searchQuery.trim());
                    } else if (e.key === 'Escape') {
                      setShowAddSymbol(false);
                      setSearchQuery('');
                    }
                  }}
                />
                <button
                  className={styles.cancelBtn}
                  onClick={() => {
                    setShowAddSymbol(false);
                    setSearchQuery('');
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              <p className={styles.addHint}>Press Enter to add, Escape to cancel</p>
            </div>
          ) : (
            <button
              className={styles.addButton}
              onClick={() => setShowAddSymbol(true)}
            >
              <Plus size={16} />
              <span>Add Symbol</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PositionTracker;
