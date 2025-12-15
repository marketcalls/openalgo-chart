/**
 * Option Chain Service
 * Handles option chain fetching using OpenAlgo Option Chain API
 */

import { getOptionChain as fetchOptionChainAPI, getOptionGreeks, getKlines, searchSymbols } from './openalgo';

// Common F&O underlyings with their index exchanges
export const UNDERLYINGS = [
    { symbol: 'NIFTY', name: 'NIFTY 50', exchange: 'NFO', indexExchange: 'NSE_INDEX' },
    { symbol: 'BANKNIFTY', name: 'BANK NIFTY', exchange: 'NFO', indexExchange: 'NSE_INDEX' },
    { symbol: 'FINNIFTY', name: 'FIN NIFTY', exchange: 'NFO', indexExchange: 'NSE_INDEX' },
    { symbol: 'MIDCPNIFTY', name: 'MIDCAP NIFTY', exchange: 'NFO', indexExchange: 'NSE_INDEX' },
    { symbol: 'SENSEX', name: 'SENSEX', exchange: 'BFO', indexExchange: 'BSE_INDEX' },
    { symbol: 'BANKEX', name: 'BANKEX', exchange: 'BFO', indexExchange: 'BSE_INDEX' }
];

// Month codes for option symbols (NSE format)
const MONTH_CODES = {
    1: 'JAN', 2: 'FEB', 3: 'MAR', 4: 'APR', 5: 'MAY', 6: 'JUN',
    7: 'JUL', 8: 'AUG', 9: 'SEP', 10: 'OCT', 11: 'NOV', 12: 'DEC'
};

// Reverse month codes
const MONTH_TO_NUM = Object.fromEntries(
    Object.entries(MONTH_CODES).map(([k, v]) => [v, parseInt(k)])
);

/**
 * Parse expiry date string in DDMMMYY format to Date object
 * @param {string} expiryStr - Expiry string like "30DEC25"
 * @returns {Date|null} Date object or null if invalid
 */
export const parseExpiryDate = (expiryStr) => {
    if (!expiryStr || expiryStr.length < 7) return null;

    const match = expiryStr.match(/^(\d{2})([A-Z]{3})(\d{2})$/);
    if (!match) return null;

    const [, dayStr, monthStr, yearStr] = match;
    const day = parseInt(dayStr, 10);
    const month = MONTH_TO_NUM[monthStr];
    const year = 2000 + parseInt(yearStr, 10);

    if (!month || isNaN(day) || isNaN(year)) return null;

    return new Date(year, month - 1, day);
};

/**
 * Format Date to DDMMMYY format for API
 * @param {Date} date - Date object
 * @returns {string} Formatted string like "30DEC25"
 */
export const formatExpiryDate = (date) => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = MONTH_CODES[date.getMonth() + 1];
    const year = String(date.getFullYear()).slice(-2);
    return `${day}${month}${year}`;
};

/**
 * Calculate days to expiry from expiry date string
 * @param {string} expiryStr - Expiry string like "30DEC25"
 * @returns {number} Days to expiry
 */
export const getDaysToExpiry = (expiryStr) => {
    const expiryDate = parseExpiryDate(expiryStr);
    if (!expiryDate) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
};

/**
 * Get option chain for an underlying using OpenAlgo Option Chain API
 * @param {string} underlying - Underlying symbol (NIFTY, BANKNIFTY)
 * @param {string} exchange - Exchange (NFO, BFO) - will be converted to index exchange for API
 * @param {string} expiryDate - Optional expiry date in DDMMMYY format
 * @param {number} strikeCount - Number of strikes above/below ATM (default 15)
 * @returns {Promise<Object>} Option chain data with LTP, OI, etc.
 */
export const getOptionChain = async (underlying, exchange = 'NFO', expiryDate = null, strikeCount = 15) => {
    try {
        // Find the underlying config to get correct index exchange
        const underlyingConfig = UNDERLYINGS.find(u => u.symbol === underlying);
        const indexExchange = underlyingConfig?.indexExchange || (exchange === 'BFO' ? 'BSE_INDEX' : 'NSE_INDEX');

        console.log('[OptionChain] Fetching chain:', { underlying, indexExchange, expiryDate, strikeCount });

        // Call OpenAlgo Option Chain API
        const result = await fetchOptionChainAPI(underlying, indexExchange, expiryDate, strikeCount);

        if (!result) {
            console.error('[OptionChain] API returned null');
            return {
                underlying,
                exchange,
                underlyingLTP: 0,
                atmStrike: 0,
                expiryDate: null,
                expiries: [],
                chain: [],
                chainByExpiry: {}
            };
        }

        console.log('[OptionChain] API response:', {
            underlying: result.underlying,
            ltp: result.underlyingLTP,
            atm: result.atmStrike,
            expiry: result.expiryDate,
            chainLength: result.chain?.length
        });

        // Transform chain data to our format
        // API returns: { strike, ce: { symbol, label, ltp, bid, ask, oi, volume, ... }, pe: { ... } }
        const chain = (result.chain || []).map(row => ({
            strike: parseFloat(row.strike),
            ce: row.ce ? {
                symbol: row.ce.symbol,
                ltp: parseFloat(row.ce.ltp || 0),
                bid: parseFloat(row.ce.bid || 0),
                ask: parseFloat(row.ce.ask || 0),
                oi: parseInt(row.ce.oi || 0),
                volume: parseInt(row.ce.volume || 0),
                label: row.ce.label, // ITM, ATM, OTM
                lotSize: parseInt(row.ce.lot_size || 0)
            } : null,
            pe: row.pe ? {
                symbol: row.pe.symbol,
                ltp: parseFloat(row.pe.ltp || 0),
                bid: parseFloat(row.pe.bid || 0),
                ask: parseFloat(row.pe.ask || 0),
                oi: parseInt(row.pe.oi || 0),
                volume: parseInt(row.pe.volume || 0),
                label: row.pe.label, // ITM, ATM, OTM
                lotSize: parseInt(row.pe.lot_size || 0)
            } : null,
            straddlePremium: (parseFloat(row.ce?.ltp || 0) + parseFloat(row.pe?.ltp || 0)).toFixed(2)
        }));

        // Parse expiry date for display
        const expiryDateObj = parseExpiryDate(result.expiryDate);
        const dte = getDaysToExpiry(result.expiryDate);

        return {
            underlying: result.underlying,
            exchange,
            underlyingLTP: result.underlyingLTP,
            atmStrike: result.atmStrike,
            expiryDate: result.expiryDate,
            expiryDateObj,
            dte,
            expiries: [result.expiryDate], // API returns one expiry at a time
            chain,
            chainByExpiry: {
                [result.expiryDate]: chain
            }
        };
    } catch (error) {
        console.error('[OptionChain] Error fetching option chain:', error);
        return {
            underlying,
            exchange,
            underlyingLTP: 0,
            atmStrike: 0,
            expiryDate: null,
            expiries: [],
            chain: [],
            chainByExpiry: {}
        };
    }
};

/**
 * Get available expiries for an underlying by searching symbols
 * (Fallback when Option Chain API doesn't provide expiry list)
 * @param {string} underlying - Underlying symbol
 * @returns {Promise<Array>} Array of expiry dates in DDMMMYY format
 */
export const getAvailableExpiries = async (underlying) => {
    try {
        const allOptions = await searchSymbols(underlying);

        // Parse symbols to extract unique expiries
        const expirySet = new Set();

        for (const opt of allOptions) {
            if (!opt.symbol?.endsWith('CE') && !opt.symbol?.endsWith('PE')) continue;

            // Parse symbol: UNDERLYING + DD + MMM + YY + STRIKE + TYPE
            const withoutType = opt.symbol.slice(0, -2);
            const match = withoutType.match(/^([A-Z]+)(\d{2})([A-Z]{3})(\d{2})(\d+)$/);

            if (match && match[1] === underlying) {
                const [, , dayStr, monthStr, yearStr] = match;
                const expiryStr = `${dayStr}${monthStr}${yearStr}`;
                expirySet.add(expiryStr);
            }
        }

        // Sort expiries chronologically
        const expiries = Array.from(expirySet).sort((a, b) => {
            const dateA = parseExpiryDate(a);
            const dateB = parseExpiryDate(b);
            return dateA - dateB;
        });

        console.log('[OptionChain] Available expiries for', underlying, ':', expiries);
        return expiries;
    } catch (error) {
        console.error('[OptionChain] Error getting expiries:', error);
        return [];
    }
};

/**
 * Get option greeks for a symbol
 * @param {string} symbol - Option symbol
 * @param {string} exchange - Exchange (NFO, BFO)
 * @returns {Promise<Object|null>} Greeks data or null
 */
export const fetchOptionGreeks = async (symbol, exchange = 'NFO') => {
    return await getOptionGreeks(symbol, exchange);
};

/**
 * Combine CE and PE OHLC data into straddle/strangle premium
 * @param {Array} ceData - CE candle data
 * @param {Array} peData - PE candle data
 * @returns {Array} Combined OHLC data
 */
export const combinePremiumOHLC = (ceData, peData) => {
    if (!ceData?.length || !peData?.length) return [];

    // Create a map of PE data by timestamp for O(1) lookup
    const peMap = new Map(peData.map(d => [d.time, d]));

    const combined = [];
    for (const ce of ceData) {
        const pe = peMap.get(ce.time);
        if (pe) {
            combined.push({
                time: ce.time,
                open: ce.open + pe.open,
                high: ce.high + pe.high,
                low: ce.low + pe.low,
                close: ce.close + pe.close,
                volume: (ce.volume || 0) + (pe.volume || 0)
            });
        }
    }

    return combined;
};

/**
 * Fetch combined straddle/strangle premium data
 * @param {string} ceSymbol - CE option symbol
 * @param {string} peSymbol - PE option symbol
 * @param {string} exchange - Exchange (NFO, BFO)
 * @param {string} interval - Time interval
 * @returns {Promise<Array>} Combined OHLC data
 */
export const fetchStraddlePremium = async (ceSymbol, peSymbol, exchange = 'NFO', interval = '5m') => {
    try {
        const [ceData, peData] = await Promise.all([
            getKlines(ceSymbol, exchange, interval),
            getKlines(peSymbol, exchange, interval)
        ]);

        return combinePremiumOHLC(ceData, peData);
    } catch (error) {
        console.error('Error fetching straddle premium:', error);
        return [];
    }
};

/**
 * Format straddle display name
 * @param {Object} config - Straddle config with ceSymbol, peSymbol, etc.
 * @returns {string} Display name
 */
export const formatStraddleName = (config) => {
    if (!config) return '';

    const { underlying, ceStrike, peStrike, expiry } = config;

    // Handle expiry as string (DDMMMYY) or Date
    let expiryStr;
    if (typeof expiry === 'string') {
        expiryStr = expiry;
    } else if (expiry instanceof Date) {
        expiryStr = formatExpiryDate(expiry);
    } else {
        expiryStr = '';
    }

    // Parse for display
    const day = expiryStr.slice(0, 2);
    const month = expiryStr.slice(2, 5);

    if (ceStrike === peStrike) {
        // Straddle (same strike)
        return `${underlying} ${ceStrike} Straddle (${day} ${month})`;
    } else {
        // Strangle (different strikes)
        return `${underlying} ${ceStrike}/${peStrike} Strangle (${day} ${month})`;
    }
};

export default {
    UNDERLYINGS,
    parseExpiryDate,
    formatExpiryDate,
    getDaysToExpiry,
    getOptionChain,
    getAvailableExpiries,
    fetchOptionGreeks,
    combinePremiumOHLC,
    fetchStraddlePremium,
    formatStraddleName
};
