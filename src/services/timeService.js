/**
 * Time Service - Provides accurate IST time synced from WorldTimeAPI
 * Used for candle creation and time-critical operations
 */

import { logger } from '../utils/logger.js';

const TIME_API_URL = 'https://worldtimeapi.org/api/timezone/Asia/Kolkata';
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // Resync every 5 minutes
const IST_OFFSET_SECONDS = 19800; // 5 hours 30 minutes in seconds

// Store the offset between network time and local time
let timeOffset = 0;
let lastSyncTime = 0;
let isSyncing = false;
let isSynced = false; // Track if we've successfully synced at least once
let syncIntervalId = null; // Track interval for cleanup

/**
 * Fetch accurate IST time from WorldTimeAPI and calculate offset
 */
export const syncTimeWithAPI = async () => {
    if (isSyncing) return isSynced;
    isSyncing = true;

    try {
        const response = await fetch(TIME_API_URL);
        if (response.ok) {
            const data = await response.json();
            // data.unixtime is in seconds (UTC)
            const networkTimestampUTC = data.unixtime;
            const localTimestampUTC = Math.floor(Date.now() / 1000);

            // Calculate offset between network and local time
            timeOffset = networkTimestampUTC - localTimestampUTC;
            lastSyncTime = Date.now();
            isSynced = true;

            logger.debug('[TimeService] Synced with WorldTimeAPI. Offset:', timeOffset, 'seconds');
            return true;
        }
    } catch (error) {
        logger.warn('[TimeService] Failed to sync time:', error.message);
    } finally {
        isSyncing = false;
    }
    return false;
};

/**
 * Check if time is synced
 */
export const getIsSynced = () => isSynced;

/**
 * Get current accurate UTC timestamp in seconds
 * Uses the synced offset for accuracy
 */
export const getAccurateUTCTimestamp = () => {
    const localTimestampUTC = Math.floor(Date.now() / 1000);
    return localTimestampUTC + timeOffset;
};

/**
 * Get current accurate IST timestamp in seconds
 * This includes the IST offset (UTC+5:30) for chart display
 */
export const getAccurateISTTimestamp = () => {
    return getAccurateUTCTimestamp() + IST_OFFSET_SECONDS;
};

/**
 * Check if resync is needed (5 minutes since last sync)
 */
export const shouldResync = () => {
    return Date.now() - lastSyncTime >= SYNC_INTERVAL_MS;
};

/**
 * Get time offset (for debugging)
 */
export const getTimeOffset = () => timeOffset;

/**
 * Initialize time service - call this on app startup
 */
export const initTimeService = async () => {
    // Prevent duplicate intervals
    if (syncIntervalId !== null) {
        return;
    }

    await syncTimeWithAPI();

    // Set up periodic resync
    syncIntervalId = setInterval(() => {
        syncTimeWithAPI();
    }, SYNC_INTERVAL_MS);

    console.log('[TimeService] Initialized with offset:', timeOffset, 'seconds');
};

/**
 * Cleanup time service - call this on app shutdown
 */
export const destroyTimeService = () => {
    if (syncIntervalId !== null) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
    }
};

export default {
    syncTimeWithAPI,
    getAccurateUTCTimestamp,
    getAccurateISTTimestamp,
    shouldResync,
    getTimeOffset,
    getIsSynced,
    initTimeService,
    destroyTimeService
};
