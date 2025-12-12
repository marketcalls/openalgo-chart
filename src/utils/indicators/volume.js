/**
 * Volume Indicator with Color Coding
 * Shows trading volume with color based on price direction
 *
 * @param {Array} data - Array of OHLC data points with {time, open, high, low, close, volume}
 * @param {string} upColor - Color for up candles (default: '#089981')
 * @param {string} downColor - Color for down candles (default: '#F23645')
 * @returns {Array} Array of {time, value, color} objects
 */
export const calculateVolume = (data, upColor = '#089981', downColor = '#F23645') => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data.map(candle => ({
    time: candle.time,
    value: candle.volume || 0,
    color: candle.close >= candle.open ? upColor : downColor
  }));
};
