import { useEffect, useCallback } from 'react';

/**
 * Hook for general keyboard navigation (Escape, Enter, etc.)
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether the hook is active
 * @param {Function} options.onEscape - Callback for Escape key
 * @param {Function} options.onEnter - Callback for Enter key
 * @param {Function} options.onArrowUp - Callback for ArrowUp key
 * @param {Function} options.onArrowDown - Callback for ArrowDown key
 * @param {Function} options.onArrowLeft - Callback for ArrowLeft key
 * @param {Function} options.onArrowRight - Callback for ArrowRight key
 */
export function useKeyboardNav(options = {}) {
  const {
    enabled = true,
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
  } = options;

  const handleKeyDown = useCallback((event) => {
    // Don't interfere with input elements unless it's Escape
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);

    switch (event.key) {
      case 'Escape':
        if (onEscape) {
          event.preventDefault();
          onEscape(event);
        }
        break;
      case 'Enter':
        if (onEnter && !isInput) {
          event.preventDefault();
          onEnter(event);
        }
        break;
      case 'ArrowUp':
        if (onArrowUp && !isInput) {
          event.preventDefault();
          onArrowUp(event);
        }
        break;
      case 'ArrowDown':
        if (onArrowDown && !isInput) {
          event.preventDefault();
          onArrowDown(event);
        }
        break;
      case 'ArrowLeft':
        if (onArrowLeft && !isInput) {
          event.preventDefault();
          onArrowLeft(event);
        }
        break;
      case 'ArrowRight':
        if (onArrowRight && !isInput) {
          event.preventDefault();
          onArrowRight(event);
        }
        break;
      default:
        break;
    }
  }, [onEscape, onEnter, onArrowUp, onArrowDown, onArrowLeft, onArrowRight]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

/**
 * Hook for list/menu keyboard navigation with active index tracking
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether the hook is active
 * @param {number} options.itemCount - Total number of items in the list
 * @param {number} options.activeIndex - Currently active item index
 * @param {Function} options.setActiveIndex - Callback to update active index
 * @param {Function} options.onSelect - Callback when Enter is pressed on active item
 * @param {boolean} options.loop - Whether to loop around at boundaries (default: true)
 * @param {string} options.orientation - 'vertical' or 'horizontal' (default: 'vertical')
 */
export function useListNavigation(options = {}) {
  const {
    enabled = true,
    itemCount = 0,
    activeIndex = 0,
    setActiveIndex,
    onSelect,
    loop = true,
    orientation = 'vertical',
  } = options;

  const navigateUp = useCallback(() => {
    if (!setActiveIndex || itemCount === 0) return;

    setActiveIndex(prev => {
      if (prev <= 0) {
        return loop ? itemCount - 1 : 0;
      }
      return prev - 1;
    });
  }, [setActiveIndex, itemCount, loop]);

  const navigateDown = useCallback(() => {
    if (!setActiveIndex || itemCount === 0) return;

    setActiveIndex(prev => {
      if (prev >= itemCount - 1) {
        return loop ? 0 : itemCount - 1;
      }
      return prev + 1;
    });
  }, [setActiveIndex, itemCount, loop]);

  const handleSelect = useCallback(() => {
    if (onSelect && activeIndex >= 0 && activeIndex < itemCount) {
      onSelect(activeIndex);
    }
  }, [onSelect, activeIndex, itemCount]);

  // Determine which arrow keys do what based on orientation
  const arrowUpHandler = orientation === 'vertical' ? navigateUp : undefined;
  const arrowDownHandler = orientation === 'vertical' ? navigateDown : undefined;
  const arrowLeftHandler = orientation === 'horizontal' ? navigateUp : undefined;
  const arrowRightHandler = orientation === 'horizontal' ? navigateDown : undefined;

  useKeyboardNav({
    enabled,
    onArrowUp: arrowUpHandler,
    onArrowDown: arrowDownHandler,
    onArrowLeft: arrowLeftHandler,
    onArrowRight: arrowRightHandler,
    onEnter: handleSelect,
  });

  return {
    activeIndex,
    navigateUp,
    navigateDown,
    handleSelect,
  };
}

export default useKeyboardNav;
