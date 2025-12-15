import React, { useState, useCallback, useRef, useEffect } from 'react';
import styles from './Layout.module.css';

const Layout = ({
  leftToolbar,
  drawingPropertiesPanel,
  topbar,
  chart,
  bottomBar,
  watchlist,
  optionsPanel,
  rightToolbar,
  mobileNav,
  isLeftToolbarVisible = true,
  isMobile = false,
  isWatchlistVisible = true,
  onWatchlistOverlayClick,
  watchlistWidth: controlledWidth,
  onWatchlistWidthChange,
}) => {
  // Internal state for watchlist width (used if not controlled)
  const [internalWidth, setInternalWidth] = useState(() => {
    const saved = localStorage.getItem('tv_watchlist_width');
    return saved ? parseInt(saved, 10) : 320;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Use controlled or internal width
  const watchlistWidth = controlledWidth ?? internalWidth;
  const setWatchlistWidth = onWatchlistWidthChange ?? setInternalWidth;

  // Handle resize start
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = watchlistWidth;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [watchlistWidth]);

  // Handle resize move and end
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      // Resize from left edge: dragging left (decreasing X) should INCREASE width
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.min(600, Math.max(200, startWidthRef.current + delta));
      setWatchlistWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Save to localStorage
      localStorage.setItem('tv_watchlist_width', watchlistWidth.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setWatchlistWidth, watchlistWidth]);
  return (
    <div className={`${styles.container} ${isMobile ? styles.mobile : ''}`}>
      {/* Skip link for keyboard accessibility */}
      <a href="#main-chart" className="skip-link">
        Skip to chart
      </a>

      <div className={styles.topbarArea}>
        {topbar}
      </div>

      <div className={styles.mainArea}>
        {/* Left toolbar - hidden on mobile */}
        {!isMobile && (
          <div className={`${styles.leftToolbarArea} ${!isLeftToolbarVisible ? styles.leftToolbarHidden : ''}`}>
            {leftToolbar}
          </div>
        )}

        {/* Drawing properties panel - shown when drawing tool is active */}
        {!isMobile && drawingPropertiesPanel}

        <div className={styles.centerArea}>
          <div id="main-chart" className={styles.chartArea} tabIndex="-1">
            {chart}
          </div>
          {/* Bottom bar - hidden on mobile (replaced by MobileNav) */}
          {!isMobile && (
            <div className={styles.bottomBarArea}>
              {bottomBar}
            </div>
          )}
        </div>

        {/* Watchlist - slide-out panel on mobile, resizable on desktop */}
        {watchlist && (
          <>
            {/* Overlay for mobile - clicking closes watchlist */}
            {isMobile && isWatchlistVisible && (
              <div
                className={styles.watchlistOverlay}
                onClick={onWatchlistOverlayClick}
                aria-hidden="true"
              />
            )}
            <div
              className={`${styles.watchlistArea} ${isMobile ? styles.watchlistMobile : ''} ${isMobile && !isWatchlistVisible ? styles.watchlistHidden : ''}`}
              style={!isMobile ? { width: watchlistWidth } : undefined}
            >
              {/* Resize handle - desktop only */}
              {!isMobile && (
                <div
                  className={`${styles.resizeHandle} ${isResizing ? styles.resizeHandleActive : ''}`}
                  onMouseDown={handleResizeStart}
                  title="Drag to resize"
                />
              )}
              {watchlist}
            </div>
          </>
        )}

        {optionsPanel && (
          <div className={styles.optionsPanelArea}>
            {optionsPanel}
          </div>
        )}

        {!isMobile && rightToolbar && (
          <div className={styles.rightToolbarArea}>
            {rightToolbar}
          </div>
        )}
      </div>

      {/* Mobile bottom navigation */}
      {isMobile && mobileNav}
    </div>
  );
};

export default Layout;
