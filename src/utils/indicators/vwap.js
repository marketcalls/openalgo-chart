/**
 * Volume Weighted Average Price (VWAP) Indicator
 * Calculates the average price weighted by volume throughout the trading session
 *
 * VWAP = Cumulative(Typical Price × Volume) / Cumulative(Volume)
 * Typical Price = (High + Low + Close) / 3
 *
 * @param {Array} data - Array of OHLC data points with {time, open, high, low, close, volume}
 * @param {boolean} resetDaily - Whether to reset VWAP at start of new day (default: true)
 * @returns {Array} Array of {time, value} objects representing VWAP values
 */
export const calculateVWAP = (data, resetDaily = true) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const vwapData = [];
  let cumTPV = 0; // Cumulative Typical Price × Volume
  let cumVolume = 0;
  let lastDate = null;

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

    // Check if we need to reset (new trading day)
    if (resetDaily) {
      // Extract date from timestamp (assuming Unix timestamp in seconds)
      const currentDate = new Date(candle.time * 1000).toDateString();
      if (lastDate !== null && currentDate !== lastDate) {
        // Reset cumulative values for new day
        cumTPV = 0;
        cumVolume = 0;
      }
      lastDate = currentDate;
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
