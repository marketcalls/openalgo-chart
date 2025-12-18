import React, { memo } from 'react';
import classNames from 'classnames';
import { TrendingUp, Clock } from 'lucide-react';
import styles from './PositionTrackerHeader.module.css';

const PositionTrackerHeader = memo(({
  sourceMode,
  onSourceModeChange,
  marketStatus,
  isMarketOpen,
  symbolCount,
}) => {
  return (
    <div className={styles.header}>
      {/* Title Row */}
      <div className={styles.titleRow}>
        <div className={styles.titleLeft}>
          <TrendingUp size={16} className={styles.titleIcon} />
          <span className={styles.title}>Position Flow</span>
          <span className={styles.count}>{symbolCount}</span>
        </div>
        <div className={styles.marketStatus}>
          <span
            className={classNames(
              styles.statusDot,
              isMarketOpen ? styles.open : styles.closed
            )}
          />
          <span className={styles.statusText}>{marketStatus}</span>
        </div>
      </div>

      {/* Source Toggle */}
      <div className={styles.toggleRow}>
        <div className={styles.sourceToggle}>
          <button
            className={classNames(
              styles.toggleBtn,
              { [styles.active]: sourceMode === 'watchlist' }
            )}
            onClick={() => onSourceModeChange('watchlist')}
          >
            Watchlist
          </button>
          <button
            className={classNames(
              styles.toggleBtn,
              { [styles.active]: sourceMode === 'custom' }
            )}
            onClick={() => onSourceModeChange('custom')}
          >
            Custom
          </button>
        </div>
      </div>
    </div>
  );
});

PositionTrackerHeader.displayName = 'PositionTrackerHeader';

export default PositionTrackerHeader;
