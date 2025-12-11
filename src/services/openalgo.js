/**
 * OpenAlgo API Service
 * Replaces binance.js for OpenAlgo-compatible chart data
 */

const API_BASE = '/api/v1';
const WS_BASE = 'ws://127.0.0.1:8765';
const LOGIN_URL = 'http://127.0.0.1:5000/auth/login';

/**
 * Check if user is authenticated with OpenAlgo
 * OpenAlgo stores API key in localStorage after login
 */
export const checkAuth = async () => {
    try {
        // Check if API key exists in localStorage (set by OpenAlgo after login)
        const apiKey = localStorage.getItem('oa_apikey');

        if (!apiKey || apiKey.trim() === '') {
            // No API key means not logged in
            return false;
        }

        // API key exists, user is authenticated
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
};

/**
 * Get API key from localStorage (set by OpenAlgo after login)
 */
const getApiKey = () => {
    return localStorage.getItem('oa_apikey') || '';
};

/**
 * Convert chart interval to OpenAlgo API format
 * Chart uses: 1d, 1w, 1M
 * OpenAlgo uses: D, W, M for daily/weekly/monthly
 */
const convertInterval = (interval) => {
    const mapping = {
        '1d': 'D',
        '1w': 'W',
        '1M': 'M',
        'D': 'D',
        'W': 'W',
        'M': 'M',
    };
    return mapping[interval] || interval;
};

/**
 * Create managed WebSocket with OpenAlgo protocol support
 * - Authentication on connect
 * - Ping/pong heartbeat handling
 * - Auto-reconnect with re-auth and re-subscribe
 */
const createManagedWebSocket = (urlBuilder, options) => {
    const { onMessage, subscriptions = [], mode = 2 } = options;

    let socket = null;
    let manualClose = false;
    let reconnectAttempts = 0;
    let authenticated = false;
    const maxAttempts = 5;
    const apiKey = getApiKey();

    const sendSubscriptions = () => {
        if (!socket || socket.readyState !== WebSocket.OPEN || !authenticated) return;

        subscriptions.forEach(sub => {
            const subscribeMsg = {
                action: 'subscribe',
                symbol: sub.symbol,
                exchange: sub.exchange || 'NSE',
                mode: mode
            };
            console.log('[WebSocket] Subscribing:', subscribeMsg);
            socket.send(JSON.stringify(subscribeMsg));
        });
    };

    const connect = () => {
        const url = typeof urlBuilder === 'function' ? urlBuilder() : urlBuilder;
        authenticated = false;

        try {
            socket = new WebSocket(url);
        } catch (error) {
            console.error('[WebSocket] Failed to create WebSocket:', error);
            return;
        }

        socket.onopen = () => {
            console.log('[WebSocket] Connected, authenticating...');
            reconnectAttempts = 0;

            // Send authentication message
            const authMsg = {
                action: 'authenticate',
                api_key: apiKey
            };
            console.log('[WebSocket] Sending auth:', { action: 'authenticate', api_key: '***' });
            socket.send(JSON.stringify(authMsg));
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                // Log all incoming messages for debugging
                console.log('[WebSocket] Received message:', message);

                // Handle ping - respond with pong
                if (message.type === 'ping') {
                    socket.send(JSON.stringify({ type: 'pong' }));
                    return;
                }

                // Handle authentication response
                // Server sends: { type: 'auth', status: 'success', message: '...', broker: '...' }
                if ((message.type === 'auth' && message.status === 'success') ||
                    message.type === 'authenticated' ||
                    message.status === 'authenticated') {
                    console.log('[WebSocket] Authenticated successfully, broker:', message.broker);
                    authenticated = true;
                    sendSubscriptions();
                    return;
                }

                // Handle auth error
                if (message.type === 'error' || (message.type === 'auth' && message.status !== 'success')) {
                    console.error('[WebSocket] Error:', message.message || message.code);
                    return;
                }

                // Forward market data to callback
                if (onMessage) {
                    onMessage(message);
                }
            } catch (error) {
                console.error('[WebSocket] Error parsing message:', error);
            }
        };

        socket.onerror = (error) => {
            console.error('[WebSocket] Error:', error);
        };

        socket.onclose = (event) => {
            authenticated = false;
            if (manualClose) return;

            if (!event.wasClean && reconnectAttempts < maxAttempts) {
                const delay = Math.min(1000 * 2 ** reconnectAttempts, 10000);
                console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxAttempts})`);
                reconnectAttempts += 1;
                setTimeout(connect, delay);
            }
        };
    };

    connect();

    return {
        close: () => {
            manualClose = true;
            if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
                socket.close();
            }
        },
        get readyState() {
            return socket ? socket.readyState : WebSocket.CLOSED;
        },
        get isAuthenticated() {
            return authenticated;
        }
    };
};

/**
 * Get historical OHLC data (klines)
 * @param {string} symbol - Trading symbol (e.g., 'RELIANCE')
 * @param {string} exchange - Exchange code (e.g., 'NSE')
 * @param {string} interval - Interval (e.g., '1d', '1h', '5m')
 * @param {number} limit - Number of candles (default 1000)
 * @param {AbortSignal} signal - Optional abort signal
 */
export const getKlines = async (symbol, exchange = 'NSE', interval = '1d', limit = 1000, signal) => {
    try {
        // Calculate date range (last 2 years for daily, adjust for intraday)
        const endDate = new Date();
        const startDate = new Date();

        // Adjust start date based on interval
        if (interval.includes('m') || interval.includes('h')) {
            startDate.setDate(startDate.getDate() - 30); // 30 days for intraday
        } else {
            startDate.setFullYear(startDate.getFullYear() - 2); // 2 years for daily+
        }

        const formatDate = (d) => d.toISOString().split('T')[0];

        const response = await fetch(`${API_BASE}/history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            signal,
            body: JSON.stringify({
                apikey: getApiKey(),
                symbol,
                exchange,
                interval: convertInterval(interval),
                start_date: formatDate(startDate),
                end_date: formatDate(endDate)
            })
        });

        console.log('[OpenAlgo] History request:', { symbol, exchange, interval: convertInterval(interval), start_date: formatDate(startDate), end_date: formatDate(endDate) });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = LOGIN_URL;
                return [];
            }
            throw new Error(`OpenAlgo history error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[OpenAlgo] History response:', data);

        // Transform OpenAlgo response to lightweight-charts format
        // OpenAlgo returns: { data: [ { timestamp, open, high, low, close, volume }, ... ] }
        // timestamp is in UTC seconds, add IST offset for local display
        const IST_OFFSET_SECONDS = 19800; // 5 hours 30 minutes in seconds

        if (data && data.data && Array.isArray(data.data)) {
            return data.data.map(d => {
                // If timestamp is a number, use directly (already in seconds)
                // Otherwise parse date string
                let time;
                if (typeof d.timestamp === 'number') {
                    // Add IST offset to display in Indian Standard Time
                    time = d.timestamp + IST_OFFSET_SECONDS;
                } else if (d.date || d.datetime) {
                    time = new Date(d.date || d.datetime).getTime() / 1000 + IST_OFFSET_SECONDS;
                } else {
                    time = 0;
                }

                return {
                    time,
                    open: parseFloat(d.open),
                    high: parseFloat(d.high),
                    low: parseFloat(d.low),
                    close: parseFloat(d.close),
                };
            }).filter(candle =>
                candle.time > 0 && [candle.open, candle.high, candle.low, candle.close].every(value => Number.isFinite(value))
            );
        }

        return [];
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error fetching klines:', error);
        }
        return [];
    }
};

/**
 * Get 24hr ticker price data
 * @param {string} symbol - Trading symbol
 * @param {string} exchange - Exchange code
 * @param {AbortSignal} signal - Optional abort signal
 */
export const getTickerPrice = async (symbol, exchange = 'NSE', signal) => {
    try {
        const response = await fetch(`${API_BASE}/quotes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            signal,
            body: JSON.stringify({
                apikey: getApiKey(),
                symbol,
                exchange
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = LOGIN_URL;
                return null;
            }
            throw new Error(`OpenAlgo quotes error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[OpenAlgo] Quotes request:', { symbol, exchange });
        console.log('[OpenAlgo] Quotes response:', data);

        // Transform to match Binance response format expected by App.jsx
        // OpenAlgo returns: { data: { ltp, open, high, low, prev_close, ... }, status: 'success' }
        if (data && data.data) {
            const quoteData = data.data;
            const ltp = parseFloat(quoteData.ltp || quoteData.last_price || 0);
            // Use open price as fallback if prev_close is 0
            const prevClose = parseFloat(quoteData.prev_close || quoteData.previous_close || quoteData.open || ltp);
            const change = ltp - prevClose;
            const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

            // Cache prev_close for WebSocket updates (WebSocket mode 2 doesn't include prev_close)
            if (!window._prevCloseCache) window._prevCloseCache = {};
            window._prevCloseCache[`${symbol}:${exchange}`] = prevClose;

            return {
                lastPrice: ltp.toString(),
                priceChange: change.toFixed(2),
                priceChangePercent: changePercent.toFixed(2),
                symbol: symbol
            };
        }

        return null;
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error fetching ticker price:', error);
        }
        return null;
    }
};

// IST offset for consistent time display (matches getKlines)
const IST_OFFSET_SECONDS = 19800; // 5 hours 30 minutes

/**
 * Subscribe to real-time ticker updates via WebSocket
 * Uses OpenAlgo WebSocket protocol with mode 2 (Quote) for OHLC data
 * @param {string} symbol - Trading symbol
 * @param {string} exchange - Exchange code
 * @param {string} interval - Interval for candle updates
 * @param {function} callback - Callback for each update
 */
export const subscribeToTicker = (symbol, exchange = 'NSE', interval, callback) => {
    const subscriptions = [{ symbol, exchange }];

    return createManagedWebSocket(
        () => WS_BASE,
        {
            subscriptions,
            mode: 2, // Quote mode - includes OHLC, volume, etc.
            onMessage: (message) => {
                // Only process market_data messages for our symbol
                if (message.type !== 'market_data' || message.symbol !== symbol) return;

                // Data is nested in message.data
                const data = message.data || {};
                const ltp = parseFloat(data.ltp || data.last_price || 0);

                if (ltp > 0) {
                    // For chart time: use server timestamp if available (to match historical candles)
                    // Add IST offset to match historical data format
                    let time;
                    let brokerTimestamp; // Raw broker timestamp in seconds for time sync

                    if (data.timestamp) {
                        // Server timestamp is in milliseconds, convert to seconds
                        brokerTimestamp = Math.floor(data.timestamp / 1000);
                        time = brokerTimestamp + IST_OFFSET_SECONDS;
                    } else {
                        // Fallback to local time if broker doesn't provide timestamp
                        brokerTimestamp = Math.floor(Date.now() / 1000);
                        time = brokerTimestamp + IST_OFFSET_SECONDS;
                    }

                    // Transform to candle format for chart
                    const candle = {
                        time, // With IST offset for chart display
                        brokerTimestamp, // Raw broker timestamp for UI clock sync
                        open: parseFloat(data.open || ltp),
                        high: parseFloat(data.high || ltp),
                        low: parseFloat(data.low || ltp),
                        close: ltp,
                    };

                    console.log('[WebSocket] Quote for', symbol, ':', { time: candle.time, brokerTimestamp: candle.brokerTimestamp, ltp });
                    callback(candle);
                }
            }
        }
    );
};
/**
 * Subscribe to multiple tickers for watchlist
 * Uses OpenAlgo WebSocket protocol with mode 2 (Quote)
 * @param {Array<{symbol: string, exchange: string}>} symbols - Array of symbol objects
 * @param {function} callback - Callback for each update
 */
export const subscribeToMultiTicker = (symbols, callback) => {
    if (!symbols || symbols.length === 0) return null;

    // Normalize symbols to array of {symbol, exchange} objects
    const subscriptions = symbols.map(sym => {
        if (typeof sym === 'string') {
            return { symbol: sym, exchange: 'NSE' };
        }
        return { symbol: sym.symbol, exchange: sym.exchange || 'NSE' };
    });

    return createManagedWebSocket(
        () => WS_BASE,
        {
            subscriptions,
            mode: 2, // Quote mode - includes OHLC, volume, prev_close, etc.
            onMessage: (message) => {
                // Only process market_data messages
                if (message.type !== 'market_data' || !message.symbol) return;

                // Data is nested in message.data
                const data = message.data || {};
                const ltp = parseFloat(data.ltp || data.last_price || 0);
                const exchange = message.exchange || 'NSE';

                if (ltp > 0) {
                    // WebSocket mode 2 doesn't include prev_close, use cached value from initial quotes fetch
                    const cacheKey = `${message.symbol}:${exchange}`;
                    const cachedPrevClose = window._prevCloseCache?.[cacheKey];

                    // Use cached prev_close, fallback to open (if available), then ltp
                    const prevClose = cachedPrevClose || parseFloat(data.open || ltp);
                    const change = ltp - prevClose;
                    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

                    callback({
                        symbol: message.symbol,
                        last: ltp,
                        open: parseFloat(data.open || prevClose),
                        chg: change,
                        chgP: changePercent
                    });
                }
            }
        }
    );
};

/**
 * Search for symbols
 * @param {string} query - Search query
 * @param {string} exchange - Optional exchange filter (NSE, BSE, NFO, MCX, BFO, NSE_INDEX, BSE_INDEX)
 * @param {string} instrumenttype - Optional instrument type filter (EQ, FUT, CE, PE, OPTIDX, etc.)
 */
export const searchSymbols = async (query, exchange, instrumenttype) => {
    try {
        const requestBody = {
            apikey: getApiKey(),
            query
        };

        // Add exchange filter if specified
        if (exchange) {
            requestBody.exchange = exchange;
        }

        // Add instrumenttype filter if specified
        if (instrumenttype) {
            requestBody.instrumenttype = instrumenttype;
        }

        const response = await fetch(`${API_BASE}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = LOGIN_URL;
                return [];
            }
            throw new Error(`OpenAlgo search error: ${response.status}`);
        }

        const data = await response.json();
        return data.data || data || [];
    } catch (error) {
        console.error('Error searching symbols:', error);
        return [];
    }
};

/**
 * Get available intervals
 */
export const getIntervals = async () => {
    try {
        const response = await fetch(`${API_BASE}/intervals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                apikey: getApiKey()
            })
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        return data.data || data || [];
    } catch (error) {
        console.error('Error fetching intervals:', error);
        return [];
    }
};

export default {
    checkAuth,
    getKlines,
    getTickerPrice,
    subscribeToTicker,
    subscribeToMultiTicker,
    searchSymbols,
    getIntervals
};
