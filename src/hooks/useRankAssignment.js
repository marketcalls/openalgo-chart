import { useState, useEffect, useCallback, useRef } from 'react';
import {
    loadTodayRankData,
    saveRankData,
    initializeRankData,
    isPastRankAssignmentTime,
    getCurrentISTTime,
    cleanupOldRankData
} from '../services/rankService';
import { logger } from '../utils/logger';

/**
 * Hook to manage initial rank assignment at 9:10 AM IST
 *
 * @param {Array} watchlistData - Array of watchlist items with live prices
 * @param {boolean} enabled - Whether rank tracking is enabled
 * @returns {Object} Rank assignment state and controls
 */
export function useRankAssignment(watchlistData, enabled = true) {
    // State
    const [rankData, setRankData] = useState(null);
    const [isAssigned, setIsAssigned] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Refs for interval management
    const checkIntervalRef = useRef(null);
    const hasAttemptedLoadRef = useRef(false);

    /**
     * Load existing rank data from localStorage
     */
    const loadExistingData = useCallback(() => {
        try {
            const existingData = loadTodayRankData();
            if (existingData && existingData.symbols?.length > 0) {
                setRankData(existingData);
                setIsAssigned(true);
                logger.info('[useRankAssignment] Loaded existing rank data:',
                    existingData.symbols.length, 'symbols');
                return true;
            }
        } catch (err) {
            logger.warn('[useRankAssignment] Error loading existing data:', err.message);
        }
        return false;
    }, []);

    /**
     * Assign ranks based on current watchlist data
     */
    const assignRanks = useCallback((data = watchlistData) => {
        if (!data || data.length === 0) {
            setError('No watchlist data available for rank assignment');
            return false;
        }

        try {
            // Filter out section markers (strings starting with ###)
            const validItems = data.filter(item =>
                item && typeof item === 'object' && item.symbol
            );

            if (validItems.length === 0) {
                setError('No valid symbols in watchlist');
                return false;
            }

            const newRankData = initializeRankData(validItems);
            setRankData(newRankData);
            setIsAssigned(true);
            setError(null);
            saveRankData(newRankData);

            logger.info('[useRankAssignment] Assigned ranks to',
                newRankData.symbols.length, 'symbols at',
                new Date(newRankData.assignmentTime * 1000).toLocaleTimeString('en-IN'));

            return true;
        } catch (err) {
            logger.error('[useRankAssignment] Error assigning ranks:', err);
            setError(err.message);
            return false;
        }
    }, [watchlistData]);

    /**
     * Force assign ranks now (manual trigger)
     */
    const forceAssignNow = useCallback(() => {
        logger.info('[useRankAssignment] Force assigning ranks now');
        return assignRanks();
    }, [assignRanks]);

    /**
     * Reset ranks (clear today's data)
     */
    const resetRanks = useCallback(() => {
        setRankData(null);
        setIsAssigned(false);
        setError(null);
        // Don't clear localStorage - user might want to reload
        logger.info('[useRankAssignment] Reset rank data');
    }, []);

    /**
     * Check if it's time to assign ranks (9:10 AM trigger)
     */
    const checkAndAssign = useCallback(() => {
        // Skip if already assigned or not enabled
        if (isAssigned || !enabled) return;

        // Check if past assignment time and have valid data
        if (isPastRankAssignmentTime() && watchlistData?.length > 0) {
            const hasValidItems = watchlistData.some(item =>
                item && typeof item === 'object' && item.symbol && item.chgP !== undefined
            );

            if (hasValidItems) {
                logger.info('[useRankAssignment] Time to assign ranks (past 9:10 AM IST)');
                assignRanks();
            }
        }
    }, [isAssigned, enabled, watchlistData, assignRanks]);

    // Initial load on mount
    useEffect(() => {
        if (!enabled) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        // Cleanup old data first
        cleanupOldRankData();

        // Try to load existing data
        const hasExisting = loadExistingData();
        hasAttemptedLoadRef.current = true;

        setIsLoading(false);

        // If no existing data and past assignment time, try to assign
        if (!hasExisting && isPastRankAssignmentTime()) {
            // Wait a bit for watchlist data to be available
            const delayTimer = setTimeout(() => {
                if (!isAssigned && watchlistData?.length > 0) {
                    assignRanks();
                }
            }, 1000);

            return () => clearTimeout(delayTimer);
        }
    }, [enabled]); // Only run on mount and when enabled changes

    // Watch for time-based assignment trigger
    useEffect(() => {
        if (!enabled || isAssigned) {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
            }
            return;
        }

        // Check immediately
        checkAndAssign();

        // Then check every 10 seconds until assigned
        checkIntervalRef.current = setInterval(() => {
            const timeInfo = getCurrentISTTime();
            logger.debug('[useRankAssignment] Time check:',
                `${timeInfo.hours}:${String(timeInfo.minutes).padStart(2, '0')}`);
            checkAndAssign();
        }, 10000);

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
            }
        };
    }, [enabled, isAssigned, checkAndAssign]);

    // Re-check when watchlist data becomes available
    useEffect(() => {
        if (!enabled || isAssigned || !hasAttemptedLoadRef.current) return;

        if (watchlistData?.length > 0 && isPastRankAssignmentTime()) {
            const hasValidItems = watchlistData.some(item =>
                item && typeof item === 'object' && item.symbol && item.chgP !== undefined
            );

            if (hasValidItems) {
                logger.info('[useRankAssignment] Watchlist data available, assigning ranks');
                assignRanks();
            }
        }
    }, [watchlistData, enabled, isAssigned, assignRanks]);

    return {
        // State
        rankData,
        isAssigned,
        isLoading,
        error,

        // Derived data
        fixedRanks: rankData?.symbols || [],
        assignmentTime: rankData?.assignmentTime || null,
        symbolCount: rankData?.symbols?.length || 0,

        // Actions
        forceAssignNow,
        resetRanks,

        // Info
        isPastAssignmentTime: isPastRankAssignmentTime(),
        currentTime: getCurrentISTTime()
    };
}

export default useRankAssignment;
