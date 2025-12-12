import React from 'react';
import styles from './MobileNav.module.css';

// SVG Icons for tabs
const ChartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3v18h18" />
    <path d="M7 16l4-4 4 4 5-6" />
  </svg>
);

const WatchlistIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 8h10M7 12h10M7 16h6" />
  </svg>
);

const AlertsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const ToolsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const TAB_CONFIG = [
  { id: 'chart', label: 'Chart', Icon: ChartIcon },
  { id: 'watchlist', label: 'Watchlist', Icon: WatchlistIcon },
  { id: 'alerts', label: 'Alerts', Icon: AlertsIcon },
  { id: 'tools', label: 'Tools', Icon: ToolsIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

/**
 * Mobile bottom navigation component
 * @param {Object} props
 * @param {string} props.activeTab - Currently active tab ID
 * @param {Function} props.onTabChange - Callback when tab changes
 * @param {number} props.alertCount - Number of unread alerts (for badge)
 * @param {string} props.theme - Current theme ('dark' or 'light')
 */
const MobileNav = ({ activeTab = 'chart', onTabChange, alertCount = 0, theme = 'dark' }) => {
  const handleTabClick = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  const handleKeyDown = (event, tabId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTabClick(tabId);
    }
  };

  return (
    <nav
      className={`${styles.nav} ${theme === 'light' ? styles.light : ''}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className={styles.tabs}>
        {TAB_CONFIG.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`${styles.tab} ${activeTab === id ? styles.active : ''}`}
            onClick={() => handleTabClick(id)}
            onKeyDown={(e) => handleKeyDown(e, id)}
            aria-current={activeTab === id ? 'page' : undefined}
            aria-label={id === 'alerts' && alertCount > 0 ? `${label} (${alertCount} unread)` : label}
          >
            <span className={styles.icon}>
              <Icon />
              {id === 'alerts' && alertCount > 0 && (
                <span className={styles.badge} aria-hidden="true">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </span>
            <span className={styles.label}>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;
