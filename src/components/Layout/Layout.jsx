import React from 'react';
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
}) => {
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

        {/* Watchlist - slide-out panel on mobile */}
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
            >
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
