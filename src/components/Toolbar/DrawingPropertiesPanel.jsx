import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import styles from './DrawingPropertiesPanel.module.css';
import ColorPicker from './ColorPicker';
import LineStyleSelector from './LineStyleSelector';
import { RotateCcw } from 'lucide-react';

/**
 * Floating panel for drawing tool customization
 * Shows color picker, line style, width, and opacity controls
 */
const DrawingPropertiesPanel = ({
    defaults,
    onPropertyChange,
    onReset,
    isVisible,
    activeTool,
}) => {
    if (!isVisible) {
        return null;
    }

    const handleColorChange = useCallback((color) => {
        onPropertyChange('lineColor', color);
        // Auto-generate background color with 20% opacity
        const hex = color.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        onPropertyChange('backgroundColor', `rgba(${r}, ${g}, ${b}, 0.2)`);
    }, [onPropertyChange]);

    const handleWidthChange = useCallback((e) => {
        onPropertyChange('width', parseInt(e.target.value, 10));
    }, [onPropertyChange]);

    const handleOpacityChange = useCallback((e) => {
        onPropertyChange('globalAlpha', parseFloat(e.target.value));
    }, [onPropertyChange]);

    const handleStyleChange = useCallback((style) => {
        onPropertyChange('lineStyle', style);
    }, [onPropertyChange]);

    // Convert globalAlpha (0-1) to percentage display
    const opacityPercent = Math.round(defaults.globalAlpha * 100);

    return (
        <div
            className={styles.panel}
            role="region"
            aria-label="Drawing properties"
        >
            <div className={styles.header}>
                <h3 className={styles.title}>Style</h3>
                <button
                    type="button"
                    className={styles.resetBtn}
                    onClick={onReset}
                    aria-label="Reset to defaults"
                    title="Reset to defaults"
                >
                    <RotateCcw size={14} />
                </button>
            </div>

            <div className={styles.content}>
                {/* Color Picker */}
                <ColorPicker
                    value={defaults.lineColor}
                    onChange={handleColorChange}
                    label="Color"
                />

                {/* Line Style Selector */}
                <div className={styles.field}>
                    <LineStyleSelector
                        value={defaults.lineStyle}
                        onChange={handleStyleChange}
                        label="Style"
                    />
                </div>

                {/* Width Slider */}
                <div className={styles.field}>
                    <div className={styles.sliderHeader}>
                        <label
                            htmlFor="drawing-width"
                            className={styles.sliderLabel}
                        >
                            Width
                        </label>
                        <span className={styles.sliderValue}>{defaults.width}px</span>
                    </div>
                    <input
                        id="drawing-width"
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={defaults.width}
                        onChange={handleWidthChange}
                        className={styles.slider}
                        aria-label={`Line width: ${defaults.width} pixels`}
                    />
                </div>

                {/* Opacity Slider */}
                <div className={styles.field}>
                    <div className={styles.sliderHeader}>
                        <label
                            htmlFor="drawing-opacity"
                            className={styles.sliderLabel}
                        >
                            Opacity
                        </label>
                        <span className={styles.sliderValue}>{opacityPercent}%</span>
                    </div>
                    <input
                        id="drawing-opacity"
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={defaults.globalAlpha}
                        onChange={handleOpacityChange}
                        className={styles.slider}
                        aria-label={`Opacity: ${opacityPercent} percent`}
                    />
                </div>
            </div>

            {/* Active tool indicator */}
            {activeTool && (
                <div className={styles.footer}>
                    <span className={styles.toolIndicator}>
                        Active: {formatToolName(activeTool)}
                    </span>
                </div>
            )}
        </div>
    );
};

/**
 * Format tool name for display (e.g., "TrendLine" -> "Trend Line")
 */
const formatToolName = (toolName) => {
    return toolName
        .replace(/([A-Z])/g, ' $1')
        .trim();
};

DrawingPropertiesPanel.propTypes = {
    defaults: PropTypes.shape({
        lineColor: PropTypes.string.isRequired,
        backgroundColor: PropTypes.string,
        width: PropTypes.number.isRequired,
        lineStyle: PropTypes.number.isRequired,
        globalAlpha: PropTypes.number.isRequired,
    }).isRequired,
    onPropertyChange: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired,
    isVisible: PropTypes.bool.isRequired,
    activeTool: PropTypes.string,
};

export default DrawingPropertiesPanel;
