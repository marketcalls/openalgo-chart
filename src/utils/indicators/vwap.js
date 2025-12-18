/**
 * Volume Weighted Average Price (VWAP) Indicator
 * Calculates the average price weighted by volume throughout the trading session
 *
 * VWAP = Cumulative(Typical Price × Volume) / Cumulative(Volume)
 * Typical Price = (High + Low + Close) / 3
 *
 * @param {Array} data - Array of OHLC data points with {time, open, high, low, close, volume}
 * @param {Object|boolean} options - Options object or legacy resetDaily boolean
 * @param {boolean} options.resetDaily - Whether to reset VWAP at start of new day (default: true)
 * @param {string} options.exchange - Exchange for session times (NSE, MCX, CDS, etc.)
 * @param {boolean} options.resetAtMarketOpen - Reset at actual market open instead of midnight
 * @returns {Array} Array of {time, value} objects representing VWAP values
 */

/**
 * Default market open times per exchange (IST) in minutes from midnight
 */
const EXCHANGE_OPEN_MINUTES = {
  'NSE': 9 * 60 + 15,   // 09:15
  'BSE': 9 * 60 + 15,   // 09:15
  'NFO': 9 * 60 + 15,   // 09:15
  'BFO': 9 * 60 + 15,   // 09:15
  'MCX': 9 * 60,        // 09:00
  'CDS': 9 * 60,        // 09:00
  'BCD': 9 * 60,        // 09:00
  'NSE_INDEX': 9 * 60 + 15,
  'BSE_INDEX': 9 * 60 + 15,
};

/**
 * Get market open time in minutes from midnight for an exchange
 */
const getMarketOpenMinutes = (exchange = 'NSE') => {
  return EXCHANGE_OPEN_MINUTES[exchange] || EXCHANGE_OPEN_MINUTES['NSE'];
};

export const calculateVWAP = (data, options = {}) => {
  // Support legacy boolean parameter
  const opts = typeof options === 'boolean'
    ? { resetDaily: options }
    : options;

  const {
    resetDaily = true,
    exchange = 'NSE',
    resetAtMarketOpen = false,
  } = opts;

  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const vwapData = [];
  let cumTPV = 0; // Cumulative Typical Price × Volume
  let cumVolume = 0;
  let lastSessionKey = null;

  // Get market open time for this exchange
  const marketOpenMinutes = getMarketOpenMinutes(exchange);

  for (let i = 0; i < data.length; i++) {
    const candle = data[i];
    const volume = candle.volume || 0;

    // Handle candles with no volume - use typical price as fallback
    if (volume === 0) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      const fallbackValue = vwapData.length > 0 ? vwapData[vwapData.length - 1].value : typicalPrice;
      vwapData.push({ time: candle.time, value: fallbackValue });
      continue;
    }

    // Check if we need to reset (new trading session)
    if (resetDaily) {
      const candleDate = new Date(candle.time * 1000);
      let sessionKey;

      if (resetAtMarketOpen) {
        // Reset at market open time instead of midnight
        // For MCX evening sessions, this treats 09:00-23:55 as one session
        const minutesFromMidnight = candleDate.getHours() * 60 + candleDate.getMinutes();

        // If before market open, this candle belongs to previous day's session
        if (minutesFromMidnight < marketOpenMinutes) {
          const prevDate = new Date(candleDate);
          prevDate.setDate(prevDate.getDate() - 1);
          sessionKey = prevDate.toDateString();
        } else {
          sessionKey = candleDate.toDateString();
        }
      } else {
        // Simple date-based reset (midnight)
        sessionKey = candleDate.toDateString();
      }

      if (lastSessionKey !== null && sessionKey !== lastSessionKey) {
        // Reset cumulative values for new session
        cumTPV = 0;
        cumVolume = 0;
      }
      lastSessionKey = sessionKey;
    }

    // Calculate typical price
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;

    // Update cumulative values
    cumTPV += typicalPrice * volume;
    cumVolume += volume;

    // Calculate VWAP
    const vwap = cumVolume > 0 ? cumTPV / cumVolume : typicalPrice;

    vwapData.push({ time: candle.time, value: vwap });
  }

  return vwapData;
};
