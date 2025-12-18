import React, { memo, useState, useEffect, useRef } from 'react';
import classNames from 'classnames';
import { ArrowUp, ArrowDown, Minus, X } from 'lucide-react';
import styles from './PositionTrackerItem.module.css';

const PositionTrackerItem = memo(({ item, onClick, onRemove, showRemove }) => {
  const {
    symbol,
    exchange,
    ltp,
    percentChange,
    currentRank,
    rankChange,
  } = item;

  const [animationClass, setAnimationClass] = useState('');
  const prevRankChangeRef = useRef(rankChange);

  // Trigger animation when rank changes
  useEffect(() => {
    if (rankChange !== prevRankChangeRef.current) {
      if (rankChange > 0) {
        setAnimationClass(styles.rankUp);
      } else if (rankChange < 0) {
        setAnimationClass(styles.rankDown);
      }

      // Clear animation class after animation completes
      const timer = setTimeout(() => {
        setAnimationClass('');
      }, 500);

      prevRankChangeRef.current = rankChange;
      return () => clearTimeout(timer);
    }
  }, [rankChange]);

  // Movement indicator
  const renderMovementIndicator = () => {
    if (rankChange > 0) {
      return (
        <span className={classNames(styles.movement, styles.up)}>
          <ArrowUp size={12} />
          <span className={styles.changeNum}>{rankChange}</span>
        </span>
      );
    } else if (rankChange < 0) {
      return (
        <span className={classNames(styles.movement, styles.down)}>
          <ArrowDown size={12} />
          <span className={styles.changeNum}>{Math.abs(rankChange)}</span>
        </span>
      );
    }
    return (
      <span className={classNames(styles.movement, styles.neutral)}>
        <Minus size={12} />
      </span>
    );
  };

  // Format LTP with appropriate decimals
  const formatLtp = (price) => {
    if (price === null || price === undefined) return '--';
    return price >= 1000 ? price.toFixed(1) : price.toFixed(2);
  };

  // Format percent change
  const formatPercentChange = (pct) => {
    if (pct === null || pct === undefined) return '--';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  const isPositive = percentChange >= 0;

  return (
    <div
      className={classNames(styles.item, animationClass)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      <span className={styles.rank}>{currentRank}</span>

      <span className={styles.moveCol}>
        {renderMovementIndicator()}
      </span>

      <span className={styles.symbolCol}>
        <span className={styles.symbolName}>{symbol}</span>
        {exchange && exchange !== 'NSE' && (
          <span className={styles.exchangeBadge}>{exchange}</span>
        )}
      </span>

      <span className={classNames(styles.ltp, isPositive ? styles.up : styles.down)}>
        {formatLtp(ltp)}
      </span>

      <span className={classNames(styles.change, isPositive ? styles.up : styles.down)}>
        {formatPercentChange(percentChange)}
      </span>

      {showRemove && (
        <button
          className={styles.removeBtn}
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          title="Remove symbol"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
});

PositionTrackerItem.displayName = 'PositionTrackerItem';

export default PositionTrackerItem;
