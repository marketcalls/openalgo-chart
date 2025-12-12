/**
 * Keyboard Shortcuts Configuration
 * Single source of truth for all keyboard shortcuts in the application.
 */

/**
 * Shortcut Categories
 */
export const SHORTCUT_CATEGORIES = {
    NAVIGATION: 'navigation',
    CHART: 'chart',
    DRAWING: 'drawing',
    ZOOM: 'zoom',
    ACTIONS: 'actions',
};

/**
 * Category display labels
 */
export const CATEGORY_LABELS = {
    [SHORTCUT_CATEGORIES.NAVIGATION]: 'Navigation',
    [SHORTCUT_CATEGORIES.CHART]: 'Chart Types',
    [SHORTCUT_CATEGORIES.DRAWING]: 'Drawing Tools',
    [SHORTCUT_CATEGORIES.ZOOM]: 'Zoom',
    [SHORTCUT_CATEGORIES.ACTIONS]: 'Actions',
};

/**
 * All keyboard shortcuts
 *
 * Structure:
 * - key: The keyboard key (lowercase)
 * - modifiers: Array of modifier keys ['cmd', 'shift', 'alt']
 * - category: SHORTCUT_CATEGORIES value
 * - label: Display label for the shortcut
 * - action: Action identifier for handler mapping
 */
export const SHORTCUTS = {
    // Navigation
    openCommandPalette: {
        key: 'k',
        modifiers: ['cmd'],
        category: SHORTCUT_CATEGORIES.NAVIGATION,
        label: 'Open Command Palette',
        action: 'openCommandPalette',
    },
    openShortcutsHelp: {
        key: '?',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.NAVIGATION,
        label: 'Keyboard Shortcuts',
        action: 'openShortcutsHelp',
    },
    openSymbolSearch: {
        key: 'p',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.NAVIGATION,
        label: 'Symbol Search',
        action: 'openSymbolSearch',
    },
    closeDialog: {
        key: 'Escape',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.NAVIGATION,
        label: 'Close / Cancel',
        action: 'closeDialog',
    },

    // Chart Types
    chartCandlestick: {
        key: '1',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.CHART,
        label: 'Candlestick Chart',
        action: 'setChartType',
        payload: 'Candlestick',
    },
    chartBar: {
        key: '2',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.CHART,
        label: 'Bar Chart',
        action: 'setChartType',
        payload: 'Bar',
    },
    chartHollowCandles: {
        key: '3',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.CHART,
        label: 'Hollow Candles',
        action: 'setChartType',
        payload: 'Hollow candles',
    },
    chartLine: {
        key: '4',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.CHART,
        label: 'Line Chart',
        action: 'setChartType',
        payload: 'Line',
    },
    chartArea: {
        key: '5',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.CHART,
        label: 'Area Chart',
        action: 'setChartType',
        payload: 'Area',
    },
    chartBaseline: {
        key: '6',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.CHART,
        label: 'Baseline Chart',
        action: 'setChartType',
        payload: 'Baseline',
    },
    chartHeikinAshi: {
        key: '7',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.CHART,
        label: 'Heikin Ashi',
        action: 'setChartType',
        payload: 'Heikin Ashi',
    },

    // Drawing Tools
    activateDrawMode: {
        key: 'd',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.DRAWING,
        label: 'Draw Mode',
        action: 'activateDrawMode',
    },
    activateCursorMode: {
        key: 'c',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.DRAWING,
        label: 'Cursor Mode',
        action: 'activateCursorMode',
    },

    // Zoom
    zoomIn: {
        key: '+',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.ZOOM,
        label: 'Zoom In',
        action: 'zoomIn',
        altKey: '=', // = without shift is also +
    },
    zoomOut: {
        key: '-',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.ZOOM,
        label: 'Zoom Out',
        action: 'zoomOut',
    },

    // Actions
    undo: {
        key: 'z',
        modifiers: ['cmd'],
        category: SHORTCUT_CATEGORIES.ACTIONS,
        label: 'Undo',
        action: 'undo',
    },
    redo: {
        key: 'y',
        modifiers: ['cmd'],
        category: SHORTCUT_CATEGORIES.ACTIONS,
        label: 'Redo',
        action: 'redo',
    },
    createAlert: {
        key: 'a',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.ACTIONS,
        label: 'Create Alert',
        action: 'createAlert',
    },
    toggleFullscreen: {
        key: 'F11',
        modifiers: [],
        category: SHORTCUT_CATEGORIES.ACTIONS,
        label: 'Toggle Fullscreen',
        action: 'toggleFullscreen',
    },
};

/**
 * Detect if running on macOS
 */
export const isMac = () => {
    if (typeof navigator === 'undefined') return false;
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

/**
 * Get the modifier key symbol for the current OS
 * @returns {string} Command symbol (⌘) for Mac, "Ctrl" for others
 */
export const getModifierKey = () => {
    return isMac() ? '⌘' : 'Ctrl';
};

/**
 * Format a shortcut for display
 * @param {Object} shortcutDef - Shortcut definition from SHORTCUTS
 * @returns {string} Formatted shortcut string (e.g., "⌘K" or "Ctrl+K")
 */
export const formatShortcut = (shortcutDef) => {
    if (!shortcutDef) return '';

    const parts = [];
    const mac = isMac();

    // Add modifiers
    if (shortcutDef.modifiers?.includes('cmd')) {
        parts.push(mac ? '⌘' : 'Ctrl');
    }
    if (shortcutDef.modifiers?.includes('shift')) {
        parts.push(mac ? '⇧' : 'Shift');
    }
    if (shortcutDef.modifiers?.includes('alt')) {
        parts.push(mac ? '⌥' : 'Alt');
    }

    // Add key
    let key = shortcutDef.key;

    // Format special keys
    if (key === 'Escape') key = 'Esc';
    else if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();

    parts.push(key);

    // Use different separator for Mac vs Windows
    return mac ? parts.join('') : parts.join('+');
};

/**
 * Get shortcuts grouped by category
 * @returns {Object} Object with category keys and arrays of shortcuts
 */
export const getGroupedShortcuts = () => {
    const grouped = {};

    // Initialize categories in desired order
    Object.values(SHORTCUT_CATEGORIES).forEach(category => {
        grouped[category] = [];
    });

    // Group shortcuts by category
    Object.entries(SHORTCUTS).forEach(([id, shortcut]) => {
        if (grouped[shortcut.category]) {
            grouped[shortcut.category].push({
                id,
                ...shortcut,
                formatted: formatShortcut(shortcut),
            });
        }
    });

    return grouped;
};

/**
 * Check if a keyboard event matches a shortcut
 * @param {KeyboardEvent} event - The keyboard event
 * @param {Object} shortcutDef - Shortcut definition from SHORTCUTS
 * @returns {boolean} True if the event matches the shortcut
 */
export const matchesShortcut = (event, shortcutDef) => {
    if (!shortcutDef) return false;

    const mac = isMac();
    const pressedKey = event.key;

    // Check modifiers
    const cmdPressed = mac ? event.metaKey : event.ctrlKey;
    const altPressed = event.altKey;

    const needsCmd = shortcutDef.modifiers?.includes('cmd') || false;
    const needsAlt = shortcutDef.modifiers?.includes('alt') || false;

    if (cmdPressed !== needsCmd) return false;
    if (altPressed !== needsAlt) return false;

    // For keys that require shift to type (?, +, !, @, etc.),
    // we don't check shiftPressed because it's implicit in the key press
    const shiftRequiredKeys = ['?', '+', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '{', '}', '|', ':', '"', '<', '>', '~'];
    const isShiftImplicit = shiftRequiredKeys.includes(shortcutDef.key);

    if (!isShiftImplicit) {
        const shiftPressed = event.shiftKey;
        const needsShift = shortcutDef.modifiers?.includes('shift') || false;
        if (shiftPressed !== needsShift) return false;
    }

    // Check key match
    const targetKey = shortcutDef.key.toLowerCase();
    const eventKey = pressedKey.toLowerCase();

    if (eventKey === targetKey) return true;

    // Handle alternate keys (e.g., = for +)
    if (shortcutDef.altKey && eventKey === shortcutDef.altKey.toLowerCase()) {
        return true;
    }

    return false;
};

/**
 * Check if the event target is an input field
 * @param {Event} event - The event
 * @returns {boolean} True if typing in an input field
 */
export const isInputField = (event) => {
    const target = event.target;
    if (!target) return false;

    const tagName = target.tagName?.toLowerCase();
    const isEditable = target.isContentEditable;
    const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';

    return isEditable || isInput;
};
