/**
 * Supertrend Indicator
 *
 * A trend-following indicator that uses ATR to determine trend direction.
 * - Green line when bullish (price above lower band)
 * - Red line when bearish (price below upper band)
 *
 * @param {Array} data - OHLC data array with {time, open, high, low, close}
 * @param {number} period - ATR period (default: 10)
 * @param {number} multiplier - ATR multiplier (default: 3)
 * @returns {Array} Array of {time, value, color, trend} where trend is 1 (bullish) or -1 (bearish)
 */
export function calculateSupertrend(data, period = 10, multiplier = 3) {
    if (!data || data.length < period + 1) {
        return [];
    }

    const result = [];

    // Calculate True Range for each bar
    const trueRanges = [];
    for (let i = 0; i < data.length; i++) {
        if (i === 0) {
            trueRanges.push(data[i].high - data[i].low);
        } else {
            const high = data[i].high;
            const low = data[i].low;
            const prevClose = data[i - 1].close;
            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trueRanges.push(tr);
        }
    }

    // Calculate ATR using Wilder's smoothing
    const atrValues = [];
    let atr = 0;

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            atrValues.push(null);
        } else if (i === period - 1) {
            // First ATR is SMA of first 'period' TRs
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += trueRanges[j];
            }
            atr = sum / period;
            atrValues.push(atr);
        } else {
            // Wilder's smoothing
            atr = ((atr * (period - 1)) + trueRanges[i]) / period;
            atrValues.push(atr);
        }
    }

    // Calculate Supertrend
    let prevUpperBand = 0;
    let prevLowerBand = 0;
    let prevSupertrend = 0;
    let prevTrend = 1; // 1 = bullish, -1 = bearish

    for (let i = 0; i < data.length; i++) {
        if (atrValues[i] === null) {
            continue;
        }

        const hl2 = (data[i].high + data[i].low) / 2;
        const atrVal = atrValues[i];

        // Basic bands
        let basicUpperBand = hl2 + (multiplier * atrVal);
        let basicLowerBand = hl2 - (multiplier * atrVal);

        // Final Upper Band
        // If basic upper band < previous final upper band OR previous close > previous final upper band
        // then final upper band = basic upper band
        // else final upper band = previous final upper band
        let finalUpperBand;
        if (i === period - 1 || result.length === 0) {
            finalUpperBand = basicUpperBand;
        } else {
            const prevClose = data[i - 1].close;
            if (basicUpperBand < prevUpperBand || prevClose > prevUpperBand) {
                finalUpperBand = basicUpperBand;
            } else {
                finalUpperBand = prevUpperBand;
            }
        }

        // Final Lower Band
        // If basic lower band > previous final lower band OR previous close < previous final lower band
        // then final lower band = basic lower band
        // else final lower band = previous final lower band
        let finalLowerBand;
        if (i === period - 1 || result.length === 0) {
            finalLowerBand = basicLowerBand;
        } else {
            const prevClose = data[i - 1].close;
            if (basicLowerBand > prevLowerBand || prevClose < prevLowerBand) {
                finalLowerBand = basicLowerBand;
            } else {
                finalLowerBand = prevLowerBand;
            }
        }

        // Supertrend calculation
        let supertrend;
        let trend;
        const close = data[i].close;

        if (result.length === 0) {
            // First value - determine initial trend
            if (close <= finalUpperBand) {
                supertrend = finalUpperBand;
                trend = -1; // bearish
            } else {
                supertrend = finalLowerBand;
                trend = 1; // bullish
            }
        } else {
            // Previous supertrend was upper band (bearish)
            if (prevSupertrend === prevUpperBand) {
                if (close > finalUpperBand) {
                    // Trend reversal to bullish
                    supertrend = finalLowerBand;
                    trend = 1;
                } else {
                    // Continue bearish
                    supertrend = finalUpperBand;
                    trend = -1;
                }
            }
            // Previous supertrend was lower band (bullish)
            else {
                if (close < finalLowerBand) {
                    // Trend reversal to bearish
                    supertrend = finalUpperBand;
                    trend = -1;
                } else {
                    // Continue bullish
                    supertrend = finalLowerBand;
                    trend = 1;
                }
            }
        }

        result.push({
            time: data[i].time,
            value: supertrend,
            color: trend === 1 ? '#26a69a' : '#ef5350', // Green for bullish, Red for bearish
            trend: trend
        });

        // Store for next iteration
        prevUpperBand = finalUpperBand;
        prevLowerBand = finalLowerBand;
        prevSupertrend = supertrend;
        prevTrend = trend;
    }

    return result;
}

export default calculateSupertrend;
