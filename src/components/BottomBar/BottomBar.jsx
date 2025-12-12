import React, { useState, useEffect } from 'react';
import styles from './BottomBar.module.css';
import classNames from 'classnames';
import { getAccurateUTCTimestamp, getIsSynced } from '../../services/timeService';
import { ConnectionState, subscribeToConnectionStatus } from '../../services/connectionStatus';

const BottomBar = ({
    onTimeRangeChange,
    currentTimeRange,
    timezone = 'UTC+5:30',
    isLogScale,
    isAutoScale,
    onToggleLogScale,
    onToggleAutoScale,
    onResetZoom,
    isToolbarVisible = true
}) => {
    // Local time state - updates every second
    const [localTime, setLocalTime] = useState(new Date());
    // IST time from TimeService
    const [istTime, setIstTime] = useState(null);
    // Sync status
    const [isSynced, setIsSynced] = useState(false);
    // WebSocket connection status
    const [connectionStatus, setConnectionStatus] = useState(ConnectionState.DISCONNECTED);

    // Update times every second
    useEffect(() => {
        const timer = setInterval(() => {
            setLocalTime(new Date());

            // Get IST time from shared TimeService
            const utcTimestamp = getAccurateUTCTimestamp();
            setIstTime(new Date(utcTimestamp * 1000));

            // Check sync status
            setIsSynced(getIsSynced());
        }, 1000);

        // Initial values
        const utcTimestamp = getAccurateUTCTimestamp();
        setIstTime(new Date(utcTimestamp * 1000));
        setIsSynced(getIsSynced());

        return () => clearInterval(timer);
    }, []);

    // Subscribe to WebSocket connection status
    useEffect(() => {
        return subscribeToConnectionStatus(setConnectionStatus);
    }, []);

    // Format time as HH:MM:SS
    const formatTime = (date) => {
        if (!date) return '--:--:--';
        return date.toLocaleTimeString('en-IN', { hour12: false });
    };

    // Get connection status display info
    const getConnectionInfo = () => {
        switch (connectionStatus) {
            case ConnectionState.CONNECTED:
                return { label: 'Live', className: styles.wsConnected, title: 'WebSocket connected - receiving live data' };
            case ConnectionState.CONNECTING:
                return { label: 'Connecting', className: styles.wsConnecting, title: 'Connecting to WebSocket server...' };
            case ConnectionState.RECONNECTING:
                return { label: 'Reconnecting', className: styles.wsReconnecting, title: 'Connection lost - attempting to reconnect...' };
            default:
                return { label: 'Offline', className: styles.wsDisconnected, title: 'WebSocket disconnected - no live data' };
        }
    };

    const wsInfo = getConnectionInfo();

    // Each time range has an associated interval for the candles
    const timeRanges = [
        { label: '1D', value: '1D', interval: '1m' },
        { label: '5D', value: '5D', interval: '5m' },
        { label: '1M', value: '1M', interval: '30m' },
        { label: '3M', value: '3M', interval: '1h' },
        { label: '6M', value: '6M', interval: '4h' },
        { label: 'YTD', value: 'YTD', interval: '1d' },
        { label: '1Y', value: '1Y', interval: '1d' },
        { label: '5Y', value: '5Y', interval: '1w' },
        { label: 'All', value: 'All', interval: '1d' },
    ];

    return (
        <div
            className={classNames(styles.bottomBar, {
                [styles.withLeftToolbar]: isToolbarVisible,
            })}
        >
            <div className={styles.leftSection}>
                {timeRanges.map((range) => (
                    <div
                        key={range.value}
                        className={classNames(styles.timeRangeItem, {
                            [styles.active]: currentTimeRange === range.value
                        })}
                        onClick={() => onTimeRangeChange && onTimeRangeChange(range.value, range.interval)}
                    >
                        {range.label}
                    </div>
                ))}
            </div>

            <div className={styles.rightSection}>
                {/* WebSocket connection status */}
                <div className={styles.connectionStatus} title={wsInfo.title}>
                    <span className={classNames(styles.wsDot, wsInfo.className)} />
                    <span className={classNames(styles.wsLabel, wsInfo.className)}>{wsInfo.label}</span>
                </div>
                <div className={styles.separator} />
                {/* Time display section */}
                <div className={styles.timeDisplay}>
                    <span className={styles.timeLabel}>Local:</span>
                    <span className={styles.timeValue}>{formatTime(localTime)}</span>
                </div>
                <div className={styles.separator} />
                <div className={styles.timeDisplay}>
                    <span
                        className={classNames(styles.syncDot, {
                            [styles.synced]: isSynced,
                            [styles.notSynced]: !isSynced
                        })}
                        title={isSynced ? 'Time synced with WorldTimeAPI' : 'Time not synced - using local time'}
                    />
                    <span className={styles.timeLabel}>IST:</span>
                    <span className={classNames(styles.timeValue, styles.serverTime)}>
                        {istTime ? formatTime(istTime) : '--:--:--'}
                    </span>
                </div>
                <div className={styles.separator} />
                <div className={styles.item}>
                    <span className={styles.timezone}>{timezone}</span>
                </div>
                <div className={styles.separator} />
                <div
                    className={classNames(styles.item, styles.actionItem, { [styles.active]: isLogScale })}
                    onClick={onToggleLogScale}
                >
                    log
                </div>
                <div
                    className={classNames(styles.item, styles.actionItem, { [styles.active]: isAutoScale })}
                    onClick={onToggleAutoScale}
                >
                    auto
                </div>
                <div
                    className={classNames(styles.item, styles.actionItem)}
                    onClick={onResetZoom}
                    title="Reset Chart View"
                >
                    reset
                </div>
            </div>
        </div>
    );
};

export default BottomBar;
