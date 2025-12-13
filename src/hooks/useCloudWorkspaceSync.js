
import { useState, useEffect, useRef } from 'react';
import openalgo from '../services/openalgo';
import logger from '../utils/logger';

// Debounce delay in milliseconds (5 seconds)
const SYNC_DEBOUNCE_DELAY = 5000;

// Keys to sync
const SYNC_KEYS = [
    'tv_saved_layout',
    'tv_watchlists',
    'tv_theme',
    'tv_fav_intervals_v2',
    'tv_custom_intervals',
    'tv_drawing_defaults',
    'tv_alerts',
    'tv_alert_logs',
    'tv_last_nonfav_interval'
];

/**
 * Hook to manage Cloud Workspace Synchronization
 * - Fetches preferences on mount (after auth is confirmed)
 * - Auto-saves changes to backend after 5s of inactivity
 * 
 * @param {boolean} isAuthenticated - Whether the user is authenticated
 * @returns {{ isLoaded: boolean, isSyncing: boolean }}
 */
export const useCloudWorkspaceSync = (isAuthenticated) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Store last SAVED state (confirmed by server)
    const lastSavedState = useRef({});
    // Store pending changes (scheduled but not yet saved)
    const pendingChanges = useRef({});
    const saveTimeoutRef = useRef(null);
    const hasLoadedFromServer = useRef(false);

    // Initial Load - only when authenticated
    useEffect(() => {
        // If not authenticated yet, set as loaded (with local state) but don't fetch from server
        if (isAuthenticated !== true) {
            logger.debug('[CloudSync] Not authenticated yet, skipping server fetch');
            // Still mark as loaded so the app renders
            setIsLoaded(true);
            return;
        }

        // Already loaded from server, don't reload
        if (hasLoadedFromServer.current) {
            return;
        }

        const loadPreferences = async () => {
            hasLoadedFromServer.current = true;
            logger.info('[CloudSync] User authenticated, loading preferences from server...');

            try {
                const prefs = await openalgo.fetchUserPreferences();
                logger.debug('[CloudSync] Server response:', prefs);

                if (prefs && typeof prefs === 'object' && Object.keys(prefs).length > 0) {
                    // Check if any values differ from current localStorage
                    let needsRefresh = false;

                    Object.entries(prefs).forEach(([key, value]) => {
                        try {
                            if (value !== null && value !== undefined) {
                                const currentValue = localStorage.getItem(key);
                                if (currentValue !== value) {
                                    needsRefresh = true;
                                    logger.debug(`[CloudSync] Key ${key} differs - local vs server`);
                                }
                                localStorage.setItem(key, value);
                                lastSavedState.current[key] = value;
                            }
                        } catch (e) {
                            logger.error(`[CloudSync] Error applying key ${key}:`, e);
                        }
                    });
                    logger.info('[CloudSync] Loaded', Object.keys(prefs).length, 'preferences from server.');

                    // If server data differs from local, reload the page to re-initialize React state
                    if (needsRefresh) {
                        logger.info('[CloudSync] Server preferences differ from local - reloading page to apply...');
                        window.location.reload();
                        return; // Don't continue, page will reload
                    }
                } else {
                    // No prefs from server - initialize lastSavedState with current localStorage
                    logger.info('[CloudSync] No server preferences found, using local state.');
                    SYNC_KEYS.forEach(key => {
                        lastSavedState.current[key] = localStorage.getItem(key);
                    });
                }
            } catch (error) {
                logger.error('[CloudSync] Failed to load preferences:', error);
                // Initialize lastSavedState with current localStorage to avoid immediate sync
                SYNC_KEYS.forEach(key => {
                    lastSavedState.current[key] = localStorage.getItem(key);
                });
            }
        };

        loadPreferences();
    }, [isAuthenticated]);

    // Watcher for changes (Auto-Save) - only when authenticated
    useEffect(() => {
        if (isAuthenticated !== true || !isLoaded) return;

        const checkForChanges = () => {
            const newChanges = {};
            let hasNewChanges = false;

            SYNC_KEYS.forEach(key => {
                const currentValue = localStorage.getItem(key);
                const lastValue = lastSavedState.current[key];

                // Check if this key has changed from last saved state
                if (currentValue !== lastValue) {
                    // Ignore both null/undefined cases
                    if (currentValue == null && lastValue == null) return;

                    newChanges[key] = currentValue || "";
                    hasNewChanges = true;
                }
            });

            if (hasNewChanges) {
                // Check if these are different from pending changes
                const pendingKeys = Object.keys(pendingChanges.current).sort().join(',');
                const newKeys = Object.keys(newChanges).sort().join(',');
                const isDifferentFromPending = pendingKeys !== newKeys;

                if (isDifferentFromPending || !saveTimeoutRef.current) {
                    logger.debug('[CloudSync] New changes detected:', Object.keys(newChanges));

                    // Update pending changes
                    pendingChanges.current = { ...newChanges };

                    // Clear existing timeout only if we have new/different changes
                    if (saveTimeoutRef.current) {
                        clearTimeout(saveTimeoutRef.current);
                    }

                    // Schedule new save
                    saveTimeoutRef.current = setTimeout(async () => {
                        const toSave = { ...pendingChanges.current };
                        logger.info('[CloudSync] Executing auto-save for keys:', Object.keys(toSave));

                        setIsSyncing(true);
                        try {
                            const success = await openalgo.saveUserPreferences(toSave);
                            if (success) {
                                // Update last saved state
                                Object.entries(toSave).forEach(([key, val]) => {
                                    lastSavedState.current[key] = val;
                                });
                                pendingChanges.current = {};
                                logger.info('[CloudSync] Auto-save complete!');
                            } else {
                                logger.error('[CloudSync] Auto-save returned false');
                            }
                        } catch (err) {
                            logger.error('[CloudSync] Auto-save failed:', err);
                        } finally {
                            setIsSyncing(false);
                            saveTimeoutRef.current = null;
                        }
                    }, SYNC_DEBOUNCE_DELAY);
                }
                // If same pending changes, don't reset the timer - let it fire
            }
        };

        // Poll for localStorage changes every second
        const pollInterval = setInterval(checkForChanges, 1000);

        return () => {
            clearInterval(pollInterval);
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [isAuthenticated, isLoaded]);

    return { isLoaded, isSyncing };
};
