import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { createChart, LineSeries, HistogramSeries } from 'lightweight-charts';
import styles from './IndicatorPane.module.css';

/**
 * IndicatorPane - A separate chart pane for oscillator indicators
 * Creates its own chart instance for indicators that need separate price scales
 * (RSI, MACD, Stochastic, Volume, ATR)
 */
const IndicatorPane = forwardRef(({
    type, // 'rsi' | 'macd' | 'stochastic' | 'volume' | 'atr'
    data,
    settings,
    height = 120,
    theme = 'dark',
    onRemove,
    onSyncTimeScale,
    onSyncCrosshair,
}, ref) => {
    const containerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRefs = useRef({});

    // Expose methods to parent for synchronization
    useImperativeHandle(ref, () => ({
        getChart: () => chartRef.current,
        getTimeScale: () => chartRef.current?.timeScale(),
        setVisibleLogicalRange: (range) => {
            if (chartRef.current) {
                try {
                    chartRef.current.timeScale().setVisibleLogicalRange(range);
                } catch (e) {
                    // Ignore range errors
                }
            }
        },
        setCrosshairPosition: (time, price) => {
            if (chartRef.current) {
                try {
                    chartRef.current.setCrosshairPosition(price, time, seriesRefs.current.main);
                } catch (e) {
                    // Ignore
                }
            }
        },
        clearCrosshairPosition: () => {
            if (chartRef.current) {
                try {
                    chartRef.current.clearCrosshairPosition();
                } catch (e) {
                    // Ignore
                }
            }
        },
        resize: () => {
            if (chartRef.current && containerRef.current) {
                chartRef.current.applyOptions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                });
            }
        }
    }));

    // Get chart options based on indicator type
    const getChartOptions = useCallback(() => {
        const baseOptions = {
            layout: {
                textColor: theme === 'dark' ? '#787B86' : '#131722',
                background: { color: 'transparent' },
                attributionLogo: false,
            },
            grid: {
                vertLines: { color: theme === 'dark' ? '#2A2E39' : '#e0e3eb' },
                horzLines: { color: theme === 'dark' ? '#2A2E39' : '#e0e3eb' },
            },
            crosshair: {
                mode: 0,
                vertLine: {
                    width: 1,
                    color: theme === 'dark' ? '#758696' : '#9598a1',
                    style: 3,
                    labelVisible: false,
                },
                horzLine: {
                    width: 1,
                    color: theme === 'dark' ? '#758696' : '#9598a1',
                    style: 3,
                    labelBackgroundColor: theme === 'dark' ? '#758696' : '#9598a1',
                },
            },
            timeScale: {
                visible: false, // Hide time axis - synced with main chart
                borderVisible: false,
            },
            rightPriceScale: {
                borderColor: theme === 'dark' ? '#2A2E39' : '#e0e3eb',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            leftPriceScale: {
                visible: false,
            },
            handleScroll: false,
            handleScale: false,
        };

        // RSI and Stochastic need 0-100 scale
        if (type === 'rsi' || type === 'stochastic') {
            baseOptions.rightPriceScale.autoScale = false;
            baseOptions.rightPriceScale.scaleMargins = { top: 0.05, bottom: 0.05 };
        }

        return baseOptions;
    }, [theme, type]);

    // Create series based on indicator type
    const createIndicatorSeries = useCallback((chart) => {
        const series = {};

        switch (type) {
            case 'rsi':
                series.main = chart.addSeries(LineSeries, {
                    color: settings?.color || '#7B1FA2',
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: true,
                    title: 'RSI',
                });
                break;

            case 'macd':
                series.histogram = chart.addSeries(HistogramSeries, {
                    priceLineVisible: false,
                    lastValueVisible: false,
                    title: '',
                });
                series.macd = chart.addSeries(LineSeries, {
                    color: settings?.macdColor || '#2962FF',
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: true,
                    title: 'MACD',
                });
                series.signal = chart.addSeries(LineSeries, {
                    color: settings?.signalColor || '#FF6D00',
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: true,
                    title: 'Signal',
                });
                series.main = series.macd; // For crosshair sync
                break;

            case 'stochastic':
                series.k = chart.addSeries(LineSeries, {
                    color: settings?.kColor || '#2962FF',
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: true,
                    title: '%K',
                });
                series.d = chart.addSeries(LineSeries, {
                    color: settings?.dColor || '#FF6D00',
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: true,
                    title: '%D',
                });
                series.main = series.k;
                break;

            case 'volume':
                series.main = chart.addSeries(HistogramSeries, {
                    priceLineVisible: false,
                    lastValueVisible: true,
                    title: 'Volume',
                    priceFormat: {
                        type: 'volume',
                    },
                });
                break;

            case 'atr':
                series.main = chart.addSeries(LineSeries, {
                    color: settings?.color || '#FF9800',
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: true,
                    title: 'ATR',
                });
                break;

            default:
                break;
        }

        return series;
    }, [type, settings]);

    // Initialize chart
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            ...getChartOptions(),
            width: containerRef.current.clientWidth,
            height: height,
        });

        chartRef.current = chart;
        seriesRefs.current = createIndicatorSeries(chart);

        // Subscribe to time scale changes for sync
        const timeScale = chart.timeScale();
        timeScale.subscribeVisibleLogicalRangeChange((range) => {
            if (onSyncTimeScale && range) {
                onSyncTimeScale(range, type);
            }
        });

        // Subscribe to crosshair move for sync
        chart.subscribeCrosshairMove((param) => {
            if (onSyncCrosshair) {
                onSyncCrosshair(param, type);
            }
        });

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            if (containerRef.current) {
                chart.applyOptions({
                    width: containerRef.current.clientWidth,
                });
            }
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
            seriesRefs.current = {};
        };
    }, [type, getChartOptions, createIndicatorSeries, onSyncTimeScale, onSyncCrosshair, height]);

    // Update data when it changes
    useEffect(() => {
        if (!data || !seriesRefs.current.main) return;

        switch (type) {
            case 'rsi':
            case 'atr':
                seriesRefs.current.main.setData(data);
                break;

            case 'macd':
                if (data.macdLine) seriesRefs.current.macd?.setData(data.macdLine);
                if (data.signalLine) seriesRefs.current.signal?.setData(data.signalLine);
                if (data.histogram) seriesRefs.current.histogram?.setData(data.histogram);
                break;

            case 'stochastic':
                if (data.kLine) seriesRefs.current.k?.setData(data.kLine);
                if (data.dLine) seriesRefs.current.d?.setData(data.dLine);
                break;

            case 'volume':
                seriesRefs.current.main.setData(data);
                break;

            default:
                break;
        }

        // Set fixed scale for RSI/Stochastic (0-100)
        if (type === 'rsi' || type === 'stochastic') {
            if (chartRef.current) {
                chartRef.current.priceScale('right').applyOptions({
                    autoScale: false,
                    scaleMargins: { top: 0.05, bottom: 0.05 },
                });
                // Force scale to 0-100 range by setting visible price range
                // This requires a bit of a workaround with lightweight-charts
            }
        }
    }, [data, type]);

    // Update height
    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.applyOptions({ height });
        }
    }, [height]);

    // Get indicator label
    const getLabel = () => {
        switch (type) {
            case 'rsi': return `RSI (${settings?.period || 14})`;
            case 'macd': return `MACD (${settings?.fast || 12}, ${settings?.slow || 26}, ${settings?.signal || 9})`;
            case 'stochastic': return `Stoch (${settings?.kPeriod || 14}, ${settings?.dPeriod || 3})`;
            case 'volume': return 'Volume';
            case 'atr': return `ATR (${settings?.period || 14})`;
            default: return type.toUpperCase();
        }
    };

    return (
        <div className={styles.paneContainer} style={{ height }}>
            <div className={styles.paneHeader}>
                <span className={styles.paneLabel}>{getLabel()}</span>
                <button
                    className={styles.closeBtn}
                    onClick={() => onRemove?.(type)}
                    title="Remove indicator"
                >
                    ×
                </button>
            </div>
            <div ref={containerRef} className={styles.chartContainer} />
        </div>
    );
});

IndicatorPane.displayName = 'IndicatorPane';

export default IndicatorPane;
