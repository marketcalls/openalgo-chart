
import { useState, useEffect, useCallback, useRef } from 'react';
import { getPositionBook, getOrderBook, getFunds, ping } from '../services/openalgo';
import logger from '../utils/logger';

/**
 * Hook to manage trading data (Positions, Orders, Funds)
 * Used by Chart and other components to display active trading state.
 */
export const useTradingData = (isAuthenticated, intervalMs = 2000) => {
    const [positions, setPositions] = useState([]);
    const [orders, setOrders] = useState([]); // Array of orders
    const [funds, setFunds] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // To prevent rapid polling if unmounted
    const isMounted = useRef(true);

    const fetchData = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            // Parallel fetch for speed
            const [posData, ordData, fundData] = await Promise.all([
                getPositionBook(),
                getOrderBook(),
                getFunds()
            ]);

            if (isMounted.current) {
                // OpenAlgo returns { data: [...] } structure usually, but getPositionBook returns array directly sometimes
                // We need to be robust.

                // Positions
                // getPositionBook returns array directly in service implementation or []
                setPositions(Array.isArray(posData) ? posData : []);

                // Orders
                // getOrderBook returns { orders: [], statistics: {} }
                const orderList = ordData && ordData.orders ? ordData.orders : [];
                // Filter out rejected, cancelled, and completed orders for visual trading
                // We only want active/modifiable orders
                // Normalize status to uppercase for comparison (API might return 'Open', 'OPEN', 'open')
                const activeOrders = orderList.filter(o => {
                    const status = o.status || o.order_status;
                    if (!status) return false;
                    const s = status.toUpperCase();
                    return s === 'OPEN' ||
                        s === 'PENDING' ||
                        s === 'TRIGGER_PENDING' ||
                        s === 'AMO REQ RECEIVED';
                });
                setOrders(activeOrders);

                // Funds
                setFunds(fundData);

                setLastUpdated(new Date());
            }
        } catch (error) {
            logger.error('[useTradingData] Error fetching data:', error);
        }
    }, [isAuthenticated]);

    // Initial fetch
    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated, fetchData]);

    // Polling interval
    useEffect(() => {
        if (!isAuthenticated || !intervalMs) return;

        const intervalId = setInterval(fetchData, intervalMs);
        return () => clearInterval(intervalId);
    }, [isAuthenticated, intervalMs, fetchData]);

    // Cleanup
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    return {
        positions,
        orders,
        funds,
        lastUpdated,
        refresh: fetchData
    };
};
