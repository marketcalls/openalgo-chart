/**
 * Bollinger Bands Indicator
 * Shows price volatility using a middle SMA and upper/lower bands at standard deviations
 *
 * @param {Array} data - Array of OHLC data points with {time, open, high, low, close}
 * @param {number} period - SMA period (default: 20)
 * @param {number} stdDev - Number of standard deviations (default: 2)
 * @returns {Object} { upper: [], middle: [], lower: [] }
 */
export const calculateBollingerBands = (data, period = 20, stdDev = 2) => {
  if (!Array.isArray(data) || data.length < period || period <= 0) {
    return { upper: [], middle: [], lower: [] };
  }

  const upper = [];
  const middle = [];
  const lower = [];

  for (let i = period - 1; i < data.length; i++) {
    // Calculate SMA
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    const sma = sum / period;

    // Calculate standard deviation
    let squaredDiffSum = 0;
    for (let j = 0; j < period; j++) {
      const diff = data[i - j].close - sma;
      squaredDiffSum += diff * diff;
    }
    const sd = Math.sqrt(squaredDiffSum / period);

    const time = data[i].time;
    middle.push({ time, value: sma });
    upper.push({ time, value: sma + (stdDev * sd) });
    lower.push({ time, value: sma - (stdDev * sd) });
  }

  return { upper, middle, lower };
};
