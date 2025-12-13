import { useRef, useEffect, useCallback } from 'react';

/**
 * Selector for all focusable elements
 */
const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Hook to trap focus within a container (for modals/dialogs)
 * @param {boolean} isActive - Whether the focus trap is active
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoFocus - Auto-focus first element on activation (default: true)
 * @param {boolean} options.restoreFocus - Restore focus on deactivation (default: true)
 * @returns {React.RefObject} - Ref to attach to the container element
 */
export function useFocusTrap(isActive, options = {}) {
  const { autoFocus = true, restoreFocus = true } = options;
  const containerRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll(FOCUSABLE_SELECTORS))
      .filter(el => {
        // Ensure element is visible
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
  }, []);

  // Handle tab key to trap focus
  const handleKeyDown = useCallback((event) => {
    if (event.key !== 'Tab' || !containerRef.current) return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Shift+Tab on first element -> go to last
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
    // Tab on last element -> go to first
    else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }, [getFocusableElements]);

  useEffect(() => {
    if (!isActive) return;

    // Store currently focused element
    if (restoreFocus) {
      previousActiveElement.current = document.activeElement;
    }

    // Auto-focus first focusable element
    if (autoFocus) {
      // Small delay to ensure modal content is rendered
      const timeoutId = setTimeout(() => {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else if (containerRef.current) {
          // If no focusable elements, focus the container itself
          containerRef.current.setAttribute('tabindex', '-1');
          containerRef.current.focus();
        }
      }, 10);

      return () => clearTimeout(timeoutId);
    }
  }, [isActive, autoFocus, restoreFocus, getFocusableElements]);

  // Add/remove keydown listener
  useEffect(() => {
    if (!isActive) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleKeyDown]);

  // Restore focus on deactivation
  useEffect(() => {
    return () => {
      if (restoreFocus && previousActiveElement.current) {
        // Small delay to ensure state updates complete
        setTimeout(() => {
          if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
            previousActiveElement.current.focus();
          }
        }, 10);
      }
    };
  }, [restoreFocus]);

  return containerRef;
}

export default useFocusTrap;
