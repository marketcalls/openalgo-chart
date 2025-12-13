/**
 * Connection Status Service
 * Tracks WebSocket connection state for UI feedback
 */

// Connection states
export const ConnectionState = {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    DISCONNECTED: 'disconnected'
};

// Store for current status and listeners
let currentStatus = ConnectionState.DISCONNECTED;
const listeners = new Set();

/**
 * Get current connection status
 */
export const getConnectionStatus = () => currentStatus;

/**
 * Update connection status and notify listeners
 */
export const setConnectionStatus = (status) => {
    if (currentStatus !== status) {
        currentStatus = status;
        listeners.forEach(listener => listener(status));
    }
};

/**
 * Subscribe to connection status changes
 * @param {function} callback - Called with new status when it changes
 * @returns {function} Unsubscribe function
 */
export const subscribeToConnectionStatus = (callback) => {
    listeners.add(callback);
    // Immediately call with current status
    callback(currentStatus);

    return () => {
        listeners.delete(callback);
    };
};

/**
 * React hook for connection status
 * Usage: const status = useConnectionStatus();
 */
export const useConnectionStatus = () => {
    const { useState, useEffect } = require('react');
    const [status, setStatus] = useState(currentStatus);

    useEffect(() => {
        return subscribeToConnectionStatus(setStatus);
    }, []);

    return status;
};

export default {
    ConnectionState,
    getConnectionStatus,
    setConnectionStatus,
    subscribeToConnectionStatus,
    useConnectionStatus
};
