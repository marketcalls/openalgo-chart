/**
 * Renko Chart Utility Functions
 * Converts OHLC data to Renko bricks for charting
 */

/**
 * Calculate the Average True Range (ATR) for determining brick size
 * @param {Array} data - OHLC data array with { time, open, high, low, close }
 * @param {number} period - ATR period (default: 14)
 * @returns {number} ATR value
 */
export const calculateATR = (data, period = 14) => {
    if (!data || data.length < period + 1) {
        // Not enough data, return a percentage of price range
        if (data && data.length > 0) {
            const prices = data.map(d => d.close);
            const max = Math.max(...prices);
            const min = Math.min(...prices);
            return (max - min) * 0.02; // 2% of price range
        }
        return 1;
    }

    const trueRanges = [];

    for (let i = 1; i < data.length; i++) {
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

    // Calculate average of last 'period' true ranges
    const recentTRs = trueRanges.slice(-period);
    const atr = recentTRs.reduce((sum, tr) => sum + tr, 0) / recentTRs.length;

    return atr;
};

/**
 * Calculate default brick size based on ATR or price range
 * @param {Array} data - OHLC data array
 * @returns {number} Suggested brick size
 */
export const calculateDefaultBrickSize = (data) => {
    if (!data || data.length === 0) return 1;

    // Use ATR-based calculation
    const atr = calculateATR(data, 14);

    // Round to a nice number for readability
    const magnitude = Math.pow(10, Math.floor(Math.log10(atr)));
    const normalized = atr / magnitude;

    let rounded;
    if (normalized < 1.5) rounded = 1;
    else if (normalized < 3.5) rounded = 2.5;
    else if (normalized < 7.5) rounded = 5;
    else rounded = 10;

    return rounded * magnitude;
};

/**
 * Calculate Renko bricks from OHLC data
 * @param {Array} data - OHLC data array with { time, open, high, low, close }
 * @param {number|null} brickSize - Size of each Renko brick (null = auto-calculate)
 * @returns {Array} Renko bricks with { time, open, high, low, close }
 */
export const calculateRenko = (data, brickSize = null) => {
    if (!data || data.length === 0) return [];

    // Calculate brick size if not provided
    const boxSize = brickSize || calculateDefaultBrickSize(data);

    if (boxSize <= 0) return data; // Fallback to original data

    const renkoBricks = [];
    let currentPrice = data[0].close;
    let brickPrice = Math.floor(currentPrice / boxSize) * boxSize; // Align to box size
    let lastDirection = null; // 'up' or 'down'

    // Use sequential timestamps to avoid duplicate time values
    // Lightweight Charts requires strictly ascending timestamps
    const baseTime = data[0].time;
    const timeIncrement = 1; // 1 second increment for unique timestamps
    let brickIndex = 0;

    // Helper to create a brick with unique sequential timestamp
    const createBrick = (open, close, direction) => {
        const isUp = direction === 'up';
        const brick = {
            time: baseTime + (brickIndex * timeIncrement),
            open: open,
            high: isUp ? close : open,
            low: isUp ? open : close,
            close: close
        };
        brickIndex++;
        return brick;
    };

    for (let i = 0; i < data.length; i++) {
        const candle = data[i];
        const closePrice = candle.close;

        // Calculate how many bricks we need to draw
        const priceDiff = closePrice - brickPrice;

        if (lastDirection === null) {
            // First brick - determine initial direction
            if (priceDiff >= boxSize) {
                // Up brick(s)
                const bricksToAdd = Math.floor(priceDiff / boxSize);
                for (let j = 0; j < bricksToAdd; j++) {
                    const brickOpen = brickPrice;
                    const brickClose = brickPrice + boxSize;
                    renkoBricks.push(createBrick(brickOpen, brickClose, 'up'));
                    brickPrice = brickClose;
                }
                lastDirection = 'up';
            } else if (priceDiff <= -boxSize) {
                // Down brick(s)
                const bricksToAdd = Math.floor(Math.abs(priceDiff) / boxSize);
                for (let j = 0; j < bricksToAdd; j++) {
                    const brickOpen = brickPrice;
                    const brickClose = brickPrice - boxSize;
                    renkoBricks.push(createBrick(brickOpen, brickClose, 'down'));
                    brickPrice = brickClose;
                }
                lastDirection = 'down';
            }
        } else if (lastDirection === 'up') {
            // Currently in uptrend
            if (priceDiff >= boxSize) {
                // Continue uptrend
                const bricksToAdd = Math.floor(priceDiff / boxSize);
                for (let j = 0; j < bricksToAdd; j++) {
                    const brickOpen = brickPrice;
                    const brickClose = brickPrice + boxSize;
                    renkoBricks.push(createBrick(brickOpen, brickClose, 'up'));
                    brickPrice = brickClose;
                }
            } else if (priceDiff <= -2 * boxSize) {
                // Reversal to downtrend (requires 2x box size)
                const reversalDiff = Math.abs(priceDiff);
                const bricksToAdd = Math.floor(reversalDiff / boxSize);
                for (let j = 0; j < bricksToAdd; j++) {
                    const brickOpen = brickPrice;
                    const brickClose = brickPrice - boxSize;
                    renkoBricks.push(createBrick(brickOpen, brickClose, 'down'));
                    brickPrice = brickClose;
                }
                lastDirection = 'down';
            }
        } else if (lastDirection === 'down') {
            // Currently in downtrend
            if (priceDiff <= -boxSize) {
                // Continue downtrend
                const bricksToAdd = Math.floor(Math.abs(priceDiff) / boxSize);
                for (let j = 0; j < bricksToAdd; j++) {
                    const brickOpen = brickPrice;
                    const brickClose = brickPrice - boxSize;
                    renkoBricks.push(createBrick(brickOpen, brickClose, 'down'));
                    brickPrice = brickClose;
                }
            } else if (priceDiff >= 2 * boxSize) {
                // Reversal to uptrend (requires 2x box size)
                const bricksToAdd = Math.floor(priceDiff / boxSize);
                for (let j = 0; j < bricksToAdd; j++) {
                    const brickOpen = brickPrice;
                    const brickClose = brickPrice + boxSize;
                    renkoBricks.push(createBrick(brickOpen, brickClose, 'up'));
                    brickPrice = brickClose;
                }
                lastDirection = 'up';
            }
        }
    }

    // If no bricks were created, return at least one brick based on the data range
    if (renkoBricks.length === 0 && data.length > 0) {
        const firstCandle = data[0];
        const lastCandle = data[data.length - 1];
        const direction = lastCandle.close >= firstCandle.close ? 'up' : 'down';

        renkoBricks.push(createBrick(
            firstCandle.close,
            lastCandle.close,
            direction
        ));
    }

    return renkoBricks;
};

export default calculateRenko;
