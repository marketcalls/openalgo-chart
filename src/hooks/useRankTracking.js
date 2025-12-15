import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    calculateCurrentPositions,
    createHistorySnapshot,
    addHistorySnapshot,
    saveRankData,
    loadTodayRankData,
    isMarketOpen
} from '../services/rankService';
import { logger } from '../utils/logger';

// History snapshot interval (1 minute)
const SNAPSHOT_INTERVAL_MS = 60 * 1000;

// Debounce interval for position updates (500ms)
const UPDATE_DEBOUNCE_MS = 500;

/**
 * Hook to track real-time position changes
 *
 * @param {Array} fixedRanks - Array of symbols with fixed ranks from useRankAssignment
 * @param {Array} watchlistData - Live watchlist data with current prices
 * @param {Object} rankData - Full rank data object for persistence
 * @param {boolean} enabled - Whether tracking is enabled
 * @returns {Object} Current positions and history
 */
export function useRankTracking(fixedRanks, watchlistData, rankData, enabled = true) {
    // State
    const [currentPositions, setCurrentPositions] = useState({});
    const [positionHistory, setPositionHistory] = useState([]);
    const [lastUpdateTime, setLastUpdateTime] = useState(null);

    // Refs
    const updateTimeoutRef = useRef(null);
    const snapshotIntervalRef = useRef(null);
    const rankDataRef = useRef(rankData);

    // Keep rankData ref updated
    useEffect(() => {
        rankDataRef.current = rankData;
    }, [rankData]);

    /**
     * Calculate and update current positions
     */
    const updatePositions = useCallback(() => {
        if (!fixedRanks?.length || !watchlistData?.length || !enabled) {
            return;
        }

        // Filter valid items from watchlist
        const validItems = watchlistData.filter(item =>
            item && typeof item === 'object' && item.symbol
        );

        if (validItems.length === 0) return;

        const positions = calculateCurrentPositions(fixedRanks, validItems);
        setCurrentPositions(positions);
        setLastUpdateTime(Date.now());

        logger.debug('[useRankTracking] Updated positions for', Object.keys(positions).length, 'symbols');
    }, [fixedRanks, watchlistData, enabled]);

    /**
     * Debounced position update (to avoid excessive recalculations)
     */
    const debouncedUpdate = useCallback(() => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        updateTimeoutRef.current = setTimeout(() => {
            updatePositions();
        }, UPDATE_DEBOUNCE_MS);
    }, [updatePositions]);

    /**
     * Take a history snapshot and persist
     */
    const takeSnapshot = useCallback(() => {
        if (!enabled || Object.keys(currentPositions).length === 0) {
            return;
        }

        // Only take snapshots during market hours
        if (!isMarketOpen()) {
            logger.debug('[useRankTracking] Market closed, skipping snapshot');
            return;
        }

        const snapshot = createHistorySnapshot(currentPositions);
        const newHistory = addHistorySnapshot(positionHistory, snapshot);

        // Only update if snapshot was actually added
        if (newHistory.length > positionHistory.length) {
            setPositionHistory(newHistory);

            // Persist to localStorage
            if (rankDataRef.current) {
                const updatedData = {
                    ...rankDataRef.current,
                    positionHistory: newHistory
                };
                saveRankData(updatedData);
                logger.debug('[useRankTracking] Saved snapshot, total history:', newHistory.length);
            }
        }
    }, [enabled, currentPositions, positionHistory]);

    // Load existing history on mount
    useEffect(() => {
        if (!enabled) return;

        const existingData = loadTodayRankData();
        if (existingData?.positionHistory?.length > 0) {
            setPositionHistory(existingData.positionHistory);
            logger.info('[useRankTracking] Loaded existing history:', existingData.positionHistory.length, 'snapshots');
        }
    }, [enabled]);

    // Update positions when watchlist data changes
    useEffect(() => {
        if (!enabled || !fixedRanks?.length) return;
        debouncedUpdate();

        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, [watchlistData, fixedRanks, enabled, debouncedUpdate]);

    // Set up periodic snapshot interval
    useEffect(() => {
        if (!enabled) {
            if (snapshotIntervalRef.current) {
                clearInterval(snapshotIntervalRef.current);
                snapshotIntervalRef.current = null;
            }
            return;
        }

        // Take initial snapshot after positions are calculated
        const initialSnapshotTimer = setTimeout(() => {
            if (Object.keys(currentPositions).length > 0) {
                takeSnapshot();
            }
        }, 2000);

        // Then take snapshots at regular intervals
        snapshotIntervalRef.current = setInterval(() => {
            takeSnapshot();
        }, SNAPSHOT_INTERVAL_MS);

        return () => {
            clearTimeout(initialSnapshotTimer);
            if (snapshotIntervalRef.current) {
                clearInterval(snapshotIntervalRef.current);
                snapshotIntervalRef.current = null;
            }
        };
    }, [enabled, takeSnapshot, currentPositions]);

    /**
     * Get positions sorted by current position (best to worst)
     */
    const sortedByCurrentPosition = useMemo(() => {
        return Object.values(currentPositions)
            .sort((a, b) => a.currentPosition - b.currentPosition);
    }, [currentPositions]);

    /**
     * Get positions sorted by fixed rank
     */
    const sortedByFixedRank = useMemo(() => {
        return Object.values(currentPositions)
            .sort((a, b) => a.fixedRank - b.fixedRank);
    }, [currentPositions]);

    /**
     * Get positions sorted by movement (biggest movers first)
     */
    const sortedByMovement = useMemo(() => {
        return Object.values(currentPositions)
            .sort((a, b) => Math.abs(b.positionDelta) - Math.abs(a.positionDelta));
    }, [currentPositions]);

    /**
     * Get top gainers (moved up the most)
     */
    const topGainers = useMemo(() => {
        return Object.values(currentPositions)
            .filter(p => p.positionDelta > 0)
            .sort((a, b) => b.positionDelta - a.positionDelta);
    }, [currentPositions]);

    /**
     * Get top losers (dropped the most)
     */
    const topLosers = useMemo(() => {
        return Object.values(currentPositions)
            .filter(p => p.positionDelta < 0)
            .sort((a, b) => a.positionDelta - b.positionDelta);
    }, [currentPositions]);

    /**
     * Get history data formatted for chart
     * Returns array of { time, [symbol]: position }
     */
    const chartHistory = useMemo(() => {
        if (!positionHistory?.length) return [];

        return positionHistory.map(snapshot => ({
            time: snapshot.timestamp,
            ...snapshot.positions
        }));
    }, [positionHistory]);

    /**
     * Get statistics summary
     */
    const stats = useMemo(() => {
        const positions = Object.values(currentPositions);
        if (positions.length === 0) return null;

        const movedUp = positions.filter(p => p.positionDelta > 0).length;
        const movedDown = positions.filter(p => p.positionDelta < 0).length;
        const unchanged = positions.filter(p => p.positionDelta === 0).length;

        const avgMovement = positions.reduce((sum, p) => sum + Math.abs(p.positionDelta), 0) / positions.length;

        const biggestGainer = topGainers[0] || null;
        const biggestLoser = topLosers[0] || null;

        return {
            total: positions.length,
            movedUp,
            movedDown,
            unchanged,
            avgMovement: avgMovement.toFixed(1),
            biggestGainer,
            biggestLoser,
            snapshotCount: positionHistory.length
        };
    }, [currentPositions, topGainers, topLosers, positionHistory]);

    /**
     * Force a snapshot now
     */
    const forceSnapshot = useCallback(() => {
        logger.info('[useRankTracking] Force taking snapshot');
        const snapshot = createHistorySnapshot(currentPositions);
        const newHistory = [...positionHistory, snapshot];
        setPositionHistory(newHistory);

        if (rankDataRef.current) {
            const updatedData = {
                ...rankDataRef.current,
                positionHistory: newHistory
            };
            saveRankData(updatedData);
        }
    }, [currentPositions, positionHistory]);

    return {
        // State
        currentPositions,
        positionHistory,
        lastUpdateTime,

        // Sorted views
        sortedByCurrentPosition,
        sortedByFixedRank,
        sortedByMovement,
        topGainers,
        topLosers,

        // Chart data
        chartHistory,

        // Statistics
        stats,

        // Actions
        forceSnapshot,
        updatePositions
    };
}

export default useRankTracking;
