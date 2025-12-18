import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getTickerPrice, subscribeToMultiTicker } from '../../services/openalgo';

// Market timing constants (IST)
const MARKET_OPEN = { hour: 9, minute: 15 };
const MARKET_CLOSE = { hour: 15, minute: 30 };
const PRE_OPEN_START = { hour: 9, minute: 0 };

/**
 * Get current market status and whether market is open
 * @returns {{ isOpen: boolean, status: string }}
 */
const getMarketStatus = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const day = now.getDay();

  // Weekend check (Saturday = 6, Sunday = 0)
  if (day === 0 || day === 6) {
    return { isOpen: false, status: 'Weekend' };
  }

  const timeInMinutes = hours * 60 + minutes;
  const preOpenTime = PRE_OPEN_START.hour * 60 + PRE_OPEN_START.minute;
  const openTime = MARKET_OPEN.hour * 60 + MARKET_OPEN.minute;
  const closeTime = MARKET_CLOSE.hour * 60 + MARKET_CLOSE.minute;

  if (timeInMinutes < preOpenTime) {
    return { isOpen: false, status: 'Pre-Market' };
  } else if (timeInMinutes >= preOpenTime && timeInMinutes < openTime) {
    return { isOpen: false, status: 'Pre-Open' };
  } else if (timeInMinutes >= openTime && timeInMinutes <= closeTime) {
    return { isOpen: true, status: 'Market Open' };
  } else {
    return { isOpen: false, status: 'Market Closed' };
  }
};

/**
 * Calculate ranks for sorted data
 * @param {Array} items - Array of stock items with percentChange
 * @param {Map} previousRanksMap - Map of previous ranks by key
 * @returns {Array} - Items with currentRank, previousRank, and rankChange
 */
const calculateRanks = (items, previousRanksMap) => {
  if (!items || items.length === 0) return [];

  // Sort by percent change (descending - highest gainers first)
  const sorted = [...items].sort((a, b) => b.percentChange - a.percentChange);

  return sorted.map((item, index) => {
    const key = `${item.symbol}-${item.exchange}`;
    const previousRank = previousRanksMap.get(key) ?? (index + 1);
    const currentRank = index + 1;
    const rankChange = previousRank - currentRank; // Positive = moved up

    return {
      ...item,
      currentRank,
      previousRank,
      rankChange,
    };
  });
};

/**
 * Custom hook for Position Flow Tracker data management
 * @param {Array<{symbol: string, exchange: string}>} symbols - Array of symbols to track
 * @param {boolean} isAuthenticated - Whether API is authenticated
 */
export const usePositionTracker = (symbols, isAuthenticated) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [marketState, setMarketState] = useState(() => getMarketStatus());

  // Refs for tracking state across renders
  const openPricesRef = useRef(new Map()); // Cache opening prices for session
  const previousRanksRef = useRef(new Map()); // Track previous ranks for animation
  const wsRef = useRef(null);
  const isMountedRef = useRef(true);

  // Memoize symbols key to detect changes
  const symbolsKey = useMemo(() => {
    if (!symbols || symbols.length === 0) return '';
    return symbols.map(s => `${s.symbol}-${s.exchange}`).sort().join(',');
  }, [symbols]);

  // Update market status every minute
  useEffect(() => {
    const checkStatus = () => setMarketState(getMarketStatus());
    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial data via REST API (parallel fetch)
  const hydrateData = useCallback(async () => {
    if (!isAuthenticated || !symbols || symbols.length === 0) {
      console.log('[PositionTracker] Skipping hydrate - not authenticated or no symbols');
      setData([]);
      setIsLoading(false);
      return;
    }

    console.log('[PositionTracker] Hydrating data for', symbols.length, 'symbols');
    setIsLoading(true);

    // Fetch all quotes in parallel
    const fetchPromises = symbols.map(async ({ symbol, exchange }) => {
      try {
        const quote = await getTickerPrice(symbol, exchange);
        if (quote) {
          const ltp = parseFloat(quote.lastPrice);
          const key = `${symbol}-${exchange}`;

          // Get cached opening price or use current price as placeholder
          let openPrice = openPricesRef.current.get(key);
          if (!openPrice) {
            openPrice = ltp; // Will be updated by WebSocket with actual open
            openPricesRef.current.set(key, openPrice);
          }

          const percentChange = openPrice > 0 ? ((ltp - openPrice) / openPrice) * 100 : 0;

          return {
            symbol,
            exchange,
            ltp,
            openPrice,
            percentChange,
          };
        }
        return null;
      } catch (error) {
        console.error(`[PositionTracker] Error fetching ${symbol}:`, error);
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);

    // Filter out nulls (failed fetches)
    const validResults = results.filter(r => r !== null);

    console.log('[PositionTracker] Fetched', validResults.length, 'quotes');

    if (!isMountedRef.current) return;

    // Calculate ranks
    const ranked = calculateRanks(validResults, previousRanksRef.current);

    // Update previous ranks for next calculation
    ranked.forEach(item => {
      previousRanksRef.current.set(`${item.symbol}-${item.exchange}`, item.currentRank);
    });

    setData(ranked);
    setIsLoading(false);
  }, [symbols, isAuthenticated]);

  // Handle WebSocket updates
  const handleTickerUpdate = useCallback((ticker) => {
    if (!isMountedRef.current) return;

    const key = `${ticker.symbol}-${ticker.exchange}`;

    // Update or cache opening price from WebSocket (more accurate than REST)
    if (ticker.open && ticker.open > 0) {
      const cachedOpen = openPricesRef.current.get(key);
      if (!cachedOpen || cachedOpen === ticker.last) {
        // Update with actual opening price from market
        openPricesRef.current.set(key, ticker.open);
      }
    }

    setData(prev => {
      if (!prev || prev.length === 0) return prev;

      // Check if symbol exists in our list
      const existingIndex = prev.findIndex(
        item => item.symbol === ticker.symbol && item.exchange === ticker.exchange
      );

      if (existingIndex === -1) return prev;

      // Get opening price (prefer cached, fallback to ticker.open)
      const openPrice = openPricesRef.current.get(key) || ticker.open || ticker.last;
      const ltp = ticker.last;
      const percentChange = openPrice > 0 ? ((ltp - openPrice) / openPrice) * 100 : 0;

      // Create updated item
      const updated = [...prev];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ltp,
        openPrice,
        percentChange,
      };

      // Re-sort and recalculate ranks
      const ranked = calculateRanks(updated, previousRanksRef.current);

      // Update previous ranks for next calculation
      ranked.forEach(item => {
        previousRanksRef.current.set(`${item.symbol}-${item.exchange}`, item.currentRank);
      });

      return ranked;
    });
  }, []);

  // Main effect for data fetching and WebSocket subscription
  useEffect(() => {
    isMountedRef.current = true;

    // Clean up existing WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (!isAuthenticated || !symbols || symbols.length === 0) {
      console.log('[PositionTracker] Not starting - auth:', isAuthenticated, 'symbols:', symbols?.length);
      setData([]);
      setIsLoading(false);
      return;
    }

    console.log('[PositionTracker] Starting with', symbols.length, 'symbols');

    // Initial data fetch
    hydrateData();

    // Subscribe to WebSocket for real-time updates
    wsRef.current = subscribeToMultiTicker(symbols, handleTickerUpdate);

    return () => {
      isMountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [symbolsKey, isAuthenticated, hydrateData, handleTickerUpdate]);

  return {
    data,
    isLoading,
    isMarketOpen: marketState.isOpen,
    marketStatus: marketState.status,
  };
};

export default usePositionTracker;
