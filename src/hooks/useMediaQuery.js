import { useState, useEffect } from 'react';

/**
 * Breakpoint definitions for responsive design
 * Mobile: ≤480px - Bottom nav, hidden sidebars
 * Tablet: 481-768px - Compact layout
 * Desktop: ≥769px - Full layout
 */
export const BREAKPOINTS = {
  mobile: '(max-width: 480px)',
  tablet: '(min-width: 481px) and (max-width: 768px)',
  desktop: '(min-width: 769px)',
  touch: '(hover: none) and (pointer: coarse)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  highContrast: '(prefers-contrast: more)',
};

/**
 * Generic media query hook
 * @param {string} query - CSS media query string
 * @returns {boolean} - Whether the media query matches
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event) => setMatches(event.matches);

    // Modern browsers use addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [query]);

  return matches;
}

/**
 * Hook to detect mobile viewport (≤480px)
 * @returns {boolean}
 */
export function useIsMobile() {
  return useMediaQuery(BREAKPOINTS.mobile);
}

/**
 * Hook to detect tablet viewport (481-768px)
 * @returns {boolean}
 */
export function useIsTablet() {
  return useMediaQuery(BREAKPOINTS.tablet);
}

/**
 * Hook to detect desktop viewport (≥769px)
 * @returns {boolean}
 */
export function useIsDesktop() {
  return useMediaQuery(BREAKPOINTS.desktop);
}

/**
 * Hook to detect touch device (no hover, coarse pointer)
 * @returns {boolean}
 */
export function useIsTouchDevice() {
  return useMediaQuery(BREAKPOINTS.touch);
}

/**
 * Hook to detect user's reduced motion preference
 * @returns {boolean}
 */
export function usePrefersReducedMotion() {
  return useMediaQuery(BREAKPOINTS.reducedMotion);
}

/**
 * Hook to detect user's high contrast preference
 * @returns {boolean}
 */
export function usePrefersHighContrast() {
  return useMediaQuery(BREAKPOINTS.highContrast);
}

export default useMediaQuery;
