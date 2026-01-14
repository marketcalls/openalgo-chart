/**
 * useTablePreferences Hook
 * Manages AccountPanel table preferences in localStorage
 */
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'accountPanel_preferences';
const DEFAULT_PREFERENCES = {
    showSearchFilter: true
};

/**
 * Hook to manage table preferences with localStorage persistence
 * @returns {Object} { preferences, updatePreference }
 */
export const useTablePreferences = () => {
    const [preferences, setPreferences] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
        } catch (error) {
            console.warn('[useTablePreferences] Failed to load preferences from localStorage:', error);
            return DEFAULT_PREFERENCES;
        }
    });

    // Sync to localStorage whenever preferences change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        } catch (error) {
            console.error('[useTablePreferences] Failed to save preferences to localStorage:', error);
        }
    }, [preferences]);

    /**
     * Update a single preference
     * @param {string} key - Preference key
     * @param {any} value - New value
     */
    const updatePreference = (key, value) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
    };

    return { preferences, updatePreference };
};

export default useTablePreferences;
