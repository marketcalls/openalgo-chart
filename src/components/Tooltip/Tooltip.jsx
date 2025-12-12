import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import styles from './Tooltip.module.css';
import classNames from 'classnames';

/**
 * Reusable Tooltip Component
 * Features:
 * - Position-aware (auto-adjusts to viewport)
 * - Hover delay to prevent flicker
 * - Keyboard shortcut display support
 * - Portal-free (positioned relative to trigger)
 */
const Tooltip = ({
    children,
    content,
    shortcut,
    position = 'top',
    delay = 200,
    disabled = false
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [actualPosition, setActualPosition] = useState(position);
    const timeoutRef = useRef(null);
    const tooltipRef = useRef(null);
    const triggerRef = useRef(null);

    // Calculate best position based on viewport
    const calculatePosition = useCallback(() => {
        if (!tooltipRef.current || !triggerRef.current) return position;

        const trigger = triggerRef.current.getBoundingClientRect();
        const tooltip = tooltipRef.current.getBoundingClientRect();
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        // Check if tooltip fits in preferred position
        const spaceTop = trigger.top;
        const spaceBottom = viewport.height - trigger.bottom;
        const spaceLeft = trigger.left;
        const spaceRight = viewport.width - trigger.right;

        let bestPosition = position;

        if (position === 'top' && spaceTop < tooltip.height + 8) {
            bestPosition = 'bottom';
        } else if (position === 'bottom' && spaceBottom < tooltip.height + 8) {
            bestPosition = 'top';
        } else if (position === 'left' && spaceLeft < tooltip.width + 8) {
            bestPosition = 'right';
        } else if (position === 'right' && spaceRight < tooltip.width + 8) {
            bestPosition = 'left';
        }

        return bestPosition;
    }, [position]);

    const handleMouseEnter = useCallback(() => {
        if (disabled) return;

        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    }, [delay, disabled]);

    const handleMouseLeave = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    }, []);

    // Update position when tooltip becomes visible
    useEffect(() => {
        if (isVisible) {
            const newPosition = calculatePosition();
            setActualPosition(newPosition);
        }
    }, [isVisible, calculatePosition]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Don't render tooltip if no content
    if (!content && !shortcut) {
        return children;
    }

    return (
        <div
            className={styles.tooltipWrapper}
            ref={triggerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {isVisible && (
                <div
                    ref={tooltipRef}
                    className={classNames(styles.tooltip, styles[actualPosition])}
                    role="tooltip"
                >
                    <span className={styles.content}>{content}</span>
                    {shortcut && (
                        <span className={styles.shortcut}>{shortcut}</span>
                    )}
                </div>
            )}
        </div>
    );
};

Tooltip.propTypes = {
    children: PropTypes.node.isRequired,
    content: PropTypes.string,
    shortcut: PropTypes.string,
    position: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
    delay: PropTypes.number,
    disabled: PropTypes.bool
};

export default Tooltip;
