/**
 * Average True Range (ATR) Indicator
 * Measures market volatility using the true range of price movements
 *
 * @param {Array} data - Array of OHLC data points with {time, open, high, low, close}
 * @param {number} period - Number of periods (default: 14)
 * @returns {Array} Array of {time, value} objects
 */
export const calculateATR = (data, period = 14) => {
  if (!Array.isArray(data) || data.length < period + 1 || period <= 0) {
    return [];
  }

  const atrData = [];
  const trueRanges = [];

  // Calculate True Range for each bar
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;

    // True Range is the greatest of:
    // 1. Current High - Current Low
    // 2. |Current High - Previous Close|
    // 3. |Current Low - Previous Close|
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  // First ATR is simple average of first 'period' true ranges
  let atr = 0;
  for (let i = 0; i < period; i++) {
    atr += trueRanges[i];
  }
  atr /= period;
  atrData.push({ time: data[period].time, value: atr });

  // Subsequent ATR values using Wilder's smoothing
  for (let i = period; i < trueRanges.length; i++) {
    atr = ((atr * (period - 1)) + trueRanges[i]) / period;
    atrData.push({ time: data[i + 1].time, value: atr });
  }

  return atrData;
};
