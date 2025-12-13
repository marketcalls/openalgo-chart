import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './ColorPicker.module.css';
import { PRESET_COLORS } from '../../hooks/useDrawingProperties';

/**
 * Color picker component with preset swatches and custom color input
 */
const ColorPicker = ({ value, onChange, label, presets = PRESET_COLORS }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsExpanded(false);
            }
        };

        if (isExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isExpanded]);

    const handleSwatchClick = useCallback((color) => {
        onChange(color);
        setIsExpanded(false);
    }, [onChange]);

    const handleInputChange = useCallback((e) => {
        onChange(e.target.value);
    }, [onChange]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            setIsExpanded(false);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
        }
    }, [isExpanded]);

    return (
        <div className={styles.container} ref={containerRef}>
            {label && <span className={styles.label}>{label}</span>}
            <div className={styles.inputWrapper}>
                <button
                    type="button"
                    className={styles.colorButton}
                    onClick={() => setIsExpanded(!isExpanded)}
                    onKeyDown={handleKeyDown}
                    aria-label={`Select color, current: ${value}`}
                    aria-expanded={isExpanded}
                    aria-haspopup="listbox"
                >
                    <span
                        className={styles.colorPreview}
                        style={{ backgroundColor: value }}
                    />
                    <span className={styles.colorValue}>{value}</span>
                </button>

                {isExpanded && (
                    <div
                        className={styles.dropdown}
                        role="listbox"
                        aria-label="Color options"
                    >
                        <div className={styles.presets}>
                            {presets.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={`${styles.swatch} ${value === color ? styles.swatchActive : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleSwatchClick(color)}
                                    aria-label={`Select ${color}`}
                                    aria-selected={value === color}
                                    role="option"
                                />
                            ))}
                        </div>
                        <div className={styles.customColor}>
                            <label className={styles.customLabel}>
                                Custom:
                                <input
                                    ref={inputRef}
                                    type="color"
                                    value={value}
                                    onChange={handleInputChange}
                                    className={styles.colorInput}
                                    aria-label="Choose custom color"
                                />
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

ColorPicker.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    label: PropTypes.string,
    presets: PropTypes.arrayOf(PropTypes.string),
};

export default ColorPicker;
