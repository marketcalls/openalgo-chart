/**
 * Strategy Templates Service
 * Defines option strategy templates and helper functions for multi-leg strategies
 */

// Strategy template definitions
export const STRATEGY_TEMPLATES = {
    straddle: {
        name: 'Straddle',
        shortName: 'STR',
        description: 'Buy ATM CE + Buy ATM PE (same strike)',
        legs: [
            { type: 'CE', strikeOffset: 0, direction: 'buy', quantity: 1 },
            { type: 'PE', strikeOffset: 0, direction: 'buy', quantity: 1 },
        ],
        minLegs: 2,
        maxLegs: 2,
    },
    strangle: {
        name: 'Strangle',
        shortName: 'STRG',
        description: 'Buy OTM CE + Buy OTM PE (different strikes)',
        legs: [
            { type: 'CE', strikeOffset: 1, direction: 'buy', quantity: 1 },
            { type: 'PE', strikeOffset: -1, direction: 'buy', quantity: 1 },
        ],
        minLegs: 2,
        maxLegs: 2,
    },
    'iron-condor': {
        name: 'Iron Condor',
        shortName: 'IC',
        description: 'Sell OTM strangle, buy further OTM protection',
        legs: [
            { type: 'PE', strikeOffset: -2, direction: 'buy', quantity: 1 },
            { type: 'PE', strikeOffset: -1, direction: 'sell', quantity: 1 },
            { type: 'CE', strikeOffset: 1, direction: 'sell', quantity: 1 },
            { type: 'CE', strikeOffset: 2, direction: 'buy', quantity: 1 },
        ],
        minLegs: 4,
        maxLegs: 4,
    },
    butterfly: {
        name: 'Butterfly',
        shortName: 'BF',
        description: 'Buy 1 ITM, Sell 2 ATM, Buy 1 OTM (CE)',
        legs: [
            { type: 'CE', strikeOffset: -1, direction: 'buy', quantity: 1 },
            { type: 'CE', strikeOffset: 0, direction: 'sell', quantity: 2 },
            { type: 'CE', strikeOffset: 1, direction: 'buy', quantity: 1 },
        ],
        minLegs: 3,
        maxLegs: 3,
    },
    'bull-call-spread': {
        name: 'Bull Call Spread',
        shortName: 'BCS',
        description: 'Buy lower strike CE, Sell higher strike CE',
        legs: [
            { type: 'CE', strikeOffset: 0, direction: 'buy', quantity: 1 },
            { type: 'CE', strikeOffset: 1, direction: 'sell', quantity: 1 },
        ],
        minLegs: 2,
        maxLegs: 2,
    },
    'bear-put-spread': {
        name: 'Bear Put Spread',
        shortName: 'BPS',
        description: 'Buy higher strike PE, Sell lower strike PE',
        legs: [
            { type: 'PE', strikeOffset: 0, direction: 'buy', quantity: 1 },
            { type: 'PE', strikeOffset: -1, direction: 'sell', quantity: 1 },
        ],
        minLegs: 2,
        maxLegs: 2,
    },
    custom: {
        name: 'Custom',
        shortName: 'CUST',
        description: 'Build your own strategy (2-4 legs)',
        legs: [],
        minLegs: 2,
        maxLegs: 4,
    },
};

/**
 * Generate unique leg ID
 */
export const generateLegId = () => {
    return `leg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Apply a strategy template to create legs based on ATM strike
 * @param {string} templateKey - Template key from STRATEGY_TEMPLATES
 * @param {number} atmStrike - ATM strike price
 * @param {number} strikeGap - Gap between strikes (e.g., 50 for NIFTY)
 * @param {Array} chainData - Option chain data with strike, ce, pe objects
 * @returns {Array|null} Array of leg objects or null if template not found
 */
export const applyTemplate = (templateKey, atmStrike, strikeGap, chainData) => {
    const template = STRATEGY_TEMPLATES[templateKey];
    if (!template || templateKey === 'custom') return null;

    const legs = [];

    for (const legTemplate of template.legs) {
        const strike = atmStrike + (legTemplate.strikeOffset * strikeGap);
        const row = chainData.find(r => r.strike === strike);

        // DEBUG: Log strike lookup details
        console.log('[StrategyTemplates] Strike lookup:', {
            legType: legTemplate.type,
            direction: legTemplate.direction,
            atmStrike,
            strikeOffset: legTemplate.strikeOffset,
            strikeGap,
            targetStrike: strike,
            found: !!row,
            availableStrikes: chainData.map(r => r.strike).slice(0, 10)
        });

        if (!row) {
            // DEBUG: Log detailed miss info
            console.error('[StrategyTemplates] Strike NOT FOUND:', {
                targetStrike: strike,
                calculation: `${atmStrike} + (${legTemplate.strikeOffset} * ${strikeGap})`,
                nearestStrikes: chainData
                    .map(r => ({ strike: r.strike, diff: Math.abs(r.strike - strike) }))
                    .sort((a, b) => a.diff - b.diff)
                    .slice(0, 3)
            });
            continue;
        }

        const optionData = legTemplate.type === 'CE' ? row.ce : row.pe;

        if (!optionData?.symbol) {
            // DEBUG: Log option data issue
            console.error('[StrategyTemplates] Option symbol missing:', {
                legType: legTemplate.type,
                strike,
                rowCE: row.ce ? { symbol: row.ce.symbol, ltp: row.ce.ltp } : null,
                rowPE: row.pe ? { symbol: row.pe.symbol, ltp: row.pe.ltp } : null
            });
            continue;
        }

        legs.push({
            id: generateLegId(),
            type: legTemplate.type,
            strike,
            symbol: optionData.symbol,
            direction: legTemplate.direction,
            quantity: legTemplate.quantity || 1,
            ltp: optionData.ltp || 0,
        });
    }

    // Validate we got all required legs
    if (legs.length !== template.legs.length) {
        console.warn(`[StrategyTemplates] Could not create all legs for ${templateKey}`);
        return null;
    }

    return legs;
};

/**
 * Validate a strategy configuration
 * @param {Array} legs - Array of leg objects
 * @returns {Object} { valid: boolean, error: string|null }
 */
export const validateStrategy = (legs) => {
    if (!legs || !Array.isArray(legs)) {
        return { valid: false, error: 'Invalid legs array' };
    }

    if (legs.length < 2) {
        return { valid: false, error: 'Minimum 2 legs required' };
    }

    if (legs.length > 4) {
        return { valid: false, error: 'Maximum 4 legs allowed' };
    }

    // Check each leg has required fields
    for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        if (!leg.symbol) {
            return { valid: false, error: `Leg ${i + 1} missing symbol` };
        }
        if (!leg.type || !['CE', 'PE'].includes(leg.type)) {
            return { valid: false, error: `Leg ${i + 1} has invalid type` };
        }
        if (!leg.direction || !['buy', 'sell'].includes(leg.direction)) {
            return { valid: false, error: `Leg ${i + 1} has invalid direction` };
        }
        if (!leg.strike || leg.strike <= 0) {
            return { valid: false, error: `Leg ${i + 1} has invalid strike` };
        }
    }

    return { valid: true, error: null };
};

/**
 * Calculate net premium from legs
 * @param {Array} legs - Array of leg objects with ltp field
 * @returns {number} Net premium (positive = debit, negative = credit)
 */
export const calculateNetPremium = (legs) => {
    if (!legs?.length) return 0;

    return legs.reduce((total, leg) => {
        const multiplier = leg.direction === 'buy' ? 1 : -1;
        const qty = leg.quantity || 1;
        const price = leg.ltp || 0;
        return total + (multiplier * qty * price);
    }, 0);
};

/**
 * Format strategy display name
 * @param {Object} config - Strategy config with strategyType, underlying, legs, expiry
 * @returns {string} Display name like "NIFTY Iron Condor (30 DEC)"
 */
export const formatStrategyName = (config) => {
    const { strategyType, underlying, legs, expiry } = config;

    if (!underlying) return 'Unknown Strategy';

    // Format expiry for display
    const expiryDisplay = expiry ? `(${expiry.slice(0, 2)} ${expiry.slice(2, 5)})` : '';

    // Use template name if available
    if (strategyType && strategyType !== 'custom' && STRATEGY_TEMPLATES[strategyType]) {
        return `${underlying} ${STRATEGY_TEMPLATES[strategyType].name} ${expiryDisplay}`.trim();
    }

    // Custom: Show leg summary
    if (legs?.length) {
        const legSummary = legs.map(l =>
            `${l.direction === 'buy' ? '+' : '-'}${l.strike}${l.type}`
        ).join('/');
        return `${underlying} ${legSummary} ${expiryDisplay}`.trim();
    }

    return `${underlying} Custom ${expiryDisplay}`.trim();
};

/**
 * Detect strategy type from legs
 * @param {Array} legs - Array of leg objects
 * @param {number} atmStrike - ATM strike for reference
 * @param {number} strikeGap - Strike gap for offset calculation
 * @returns {string} Strategy type key or 'custom'
 */
export const detectStrategyType = (legs, atmStrike, strikeGap) => {
    if (!legs?.length || legs.length < 2) return 'custom';

    // Sort legs by strike
    const sortedLegs = [...legs].sort((a, b) => a.strike - b.strike);

    // Check for straddle (same strike, CE+PE, both buy)
    if (legs.length === 2) {
        const [l1, l2] = sortedLegs;
        if (l1.strike === l2.strike &&
            l1.type !== l2.type &&
            l1.direction === 'buy' && l2.direction === 'buy') {
            return 'straddle';
        }
    }

    // Check for strangle (different strikes, CE+PE, both buy)
    if (legs.length === 2) {
        const [l1, l2] = sortedLegs;
        if (l1.strike !== l2.strike &&
            l1.type !== l2.type &&
            l1.direction === 'buy' && l2.direction === 'buy') {
            return 'strangle';
        }
    }

    // More complex patterns can be detected here...
    return 'custom';
};

export default STRATEGY_TEMPLATES;
