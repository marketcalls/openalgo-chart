/**
 * Moving Average Convergence Divergence (MACD) Indicator
 * Shows the relationship between two EMAs of closing prices
 *
 * @param {Array} data - Array of OHLC data points with {time, open, high, low, close}
 * @param {number} fastPeriod - Fast EMA period (default: 12)
 * @param {number} slowPeriod - Slow EMA period (default: 26)
 * @param {number} signalPeriod - Signal line period (default: 9)
 * @returns {Object} { macdLine: [], signalLine: [], histogram: [] }
 */
export const calculateMACD = (data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  if (!Array.isArray(data) || data.length < slowPeriod + signalPeriod || slowPeriod <= fastPeriod) {
    return { macdLine: [], signalLine: [], histogram: [] };
  }

  // Helper to calculate EMA
  const calcEMA = (values, period) => {
    const k = 2 / (period + 1);
    const ema = [];

    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += values[i];
    }
    let prevEma = sum / period;
    ema.push(prevEma);

    for (let i = period; i < values.length; i++) {
      prevEma = (values[i] - prevEma) * k + prevEma;
      ema.push(prevEma);
    }
    return ema;
  };

  // Extract close prices
  const closes = data.map(d => d.close);

  // Calculate fast and slow EMAs
  const fastEMA = calcEMA(closes, fastPeriod);
  const slowEMA = calcEMA(closes, slowPeriod);

  // Calculate MACD line (fast EMA - slow EMA)
  const macdValues = [];
  const startIndex = slowPeriod - fastPeriod;

  for (let i = 0; i < slowEMA.length; i++) {
    macdValues.push(fastEMA[i + startIndex] - slowEMA[i]);
  }

  // Calculate signal line (EMA of MACD)
  const signalValues = calcEMA(macdValues, signalPeriod);

  // Build output arrays with time
  const macdLine = [];
  const signalLine = [];
  const histogram = [];

  const dataOffset = slowPeriod - 1;
  const signalOffset = signalPeriod - 1;

  // MACD line starts at slowPeriod - 1
  for (let i = 0; i < macdValues.length; i++) {
    macdLine.push({
      time: data[dataOffset + i].time,
      value: macdValues[i]
    });
  }

  // Signal line starts signalPeriod after MACD starts
  for (let i = 0; i < signalValues.length; i++) {
    const idx = dataOffset + signalOffset + i;
    signalLine.push({
      time: data[idx].time,
      value: signalValues[i]
    });

    // Histogram is MACD - Signal
    histogram.push({
      time: data[idx].time,
      value: macdValues[signalOffset + i] - signalValues[i],
      color: macdValues[signalOffset + i] - signalValues[i] >= 0 ? '#089981' : '#F23645'
    });
  }

  return { macdLine, signalLine, histogram };
};
