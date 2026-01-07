import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, X, Wallet, Minus, Maximize2, Minimize2 } from 'lucide-react';
import styles from './AccountPanel.module.css';
import { getFunds, getPositionBook, getOrderBook, getHoldings, getTradeBook, ping } from '../../services/openalgo';

// Tab definitions
const TABS = [
    { id: 'positions', label: 'Positions' },
    { id: 'orders', label: 'Orders' },
    { id: 'holdings', label: 'Holdings' },
    { id: 'trades', label: 'Trades' },
];

// Format currency values
const formatCurrency = (value) => {
    if (value === null || value === undefined) return '0.00';
    const num = parseFloat(value);
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Format P&L with color class
const formatPnL = (value) => {
    const num = parseFloat(value) || 0;
    const formatted = formatCurrency(Math.abs(num));
    const sign = num >= 0 ? '+' : '-';
    return { value: `${sign}${formatted}`, isPositive: num >= 0 };
};

const AccountPanel = ({
    isOpen,
    onClose,
    isAuthenticated,
    onSymbolSelect,
    isMinimized = false,
    onMinimize,
    isMaximized = false,
    onMaximize,
    isToolbarVisible = true
}) => {
    const [activeTab, setActiveTab] = useState('positions');
    const [isLoading, setIsLoading] = useState(false);
    const [brokerName, setBrokerName] = useState('');
    const [lastRefresh, setLastRefresh] = useState(null);

    // Data states
    const [funds, setFunds] = useState(null);
    const [positions, setPositions] = useState([]);
    const [orders, setOrders] = useState({ orders: [], statistics: {} });
    const [holdings, setHoldings] = useState({ holdings: [], statistics: {} });
    const [trades, setTrades] = useState([]);

    // Fetch all account data
    const fetchAccountData = useCallback(async () => {
        if (!isAuthenticated) return;

        setIsLoading(true);
        try {
            const [fundsData, positionsData, ordersData, holdingsData, tradesData, pingData] = await Promise.all([
                getFunds(),
                getPositionBook(),
                getOrderBook(),
                getHoldings(),
                getTradeBook(),
                ping()
            ]);

            setFunds(fundsData);
            setPositions(positionsData || []);
            setOrders(ordersData || { orders: [], statistics: {} });
            setHoldings(holdingsData || { holdings: [], statistics: {} });
            setTrades(tradesData || []);
            if (pingData?.broker) {
                setBrokerName(pingData.broker);
            }
            setLastRefresh(new Date());
        } catch (error) {
            console.error('[AccountPanel] Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    // Fetch data when panel opens
    useEffect(() => {
        if (isOpen && isAuthenticated) {
            fetchAccountData();
        }
    }, [isOpen, isAuthenticated, fetchAccountData]);

    // Auto-refresh every 30 seconds when panel is open
    useEffect(() => {
        if (!isOpen || !isAuthenticated) return;

        const interval = setInterval(fetchAccountData, 30000);
        return () => clearInterval(interval);
    }, [isOpen, isAuthenticated, fetchAccountData]);

    // Calculate P&L summary from positions
    const calculatePnLSummary = () => {
        let unrealizedPnL = 0;
        let realizedPnL = 0;

        positions.forEach(pos => {
            // Calculate unrealized P&L for open positions
            if (pos.quantity !== 0) {
                unrealizedPnL += parseFloat(pos.pnl || 0);
            }
        });

        // Add realized P&L from today's trades
        trades.forEach(trade => {
            if (trade.action === 'SELL') {
                realizedPnL += parseFloat(trade.trade_value || 0) - (parseFloat(trade.average_price || 0) * parseFloat(trade.quantity || 0));
            }
        });

        return { unrealizedPnL, realizedPnL };
    };

    const { unrealizedPnL, realizedPnL } = calculatePnLSummary();
    const availableMargin = parseFloat(funds?.availablecash || 0);

    // Handle row click to navigate to symbol
    const handleRowClick = (symbol, exchange) => {
        if (onSymbolSelect) {
            onSymbolSelect({ symbol, exchange: exchange || 'NSE' });
        }
    };

    if (!isOpen) return null;

    // Render positions table
    const renderPositions = () => {
        const openPositions = positions.filter(p => p.quantity !== 0);

        if (openPositions.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>📊</span>
                    <p>There are no open positions in your trading account yet</p>
                </div>
            );
        }

        return (
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Symbol</th>
                            <th>Exchange</th>
                            <th>Product</th>
                            <th className={styles.alignRight}>Qty</th>
                            <th className={styles.alignRight}>Avg Price</th>
                            <th className={styles.alignRight}>LTP</th>
                            <th className={styles.alignRight}>P&L</th>
                        </tr>
                    </thead>
                    <tbody>
                        {openPositions.map((pos, idx) => {
                            const pnl = parseFloat(pos.pnl || 0);
                            return (
                                <tr
                                    key={`${pos.symbol}-${pos.exchange}-${idx}`}
                                    onClick={() => handleRowClick(pos.symbol, pos.exchange)}
                                    className={styles.clickableRow}
                                >
                                    <td className={styles.symbolCell}>{pos.symbol}</td>
                                    <td>{pos.exchange}</td>
                                    <td>{pos.product}</td>
                                    <td className={`${styles.alignRight} ${pos.quantity > 0 ? styles.positive : styles.negative}`}>
                                        {pos.quantity > 0 ? '+' : ''}{pos.quantity}
                                    </td>
                                    <td className={styles.alignRight}>{formatCurrency(pos.average_price)}</td>
                                    <td className={styles.alignRight}>{formatCurrency(pos.ltp)}</td>
                                    <td className={`${styles.alignRight} ${pnl >= 0 ? styles.positive : styles.negative}`}>
                                        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    // Render orders table
    const renderOrders = () => {
        const orderList = orders.orders || [];

        if (orderList.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>📋</span>
                    <p>No orders found for today</p>
                </div>
            );
        }

        return (
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Symbol</th>
                            <th>Action</th>
                            <th>Type</th>
                            <th className={styles.alignRight}>Qty</th>
                            <th className={styles.alignRight}>Price</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orderList.map((order, idx) => (
                            <tr
                                key={order.orderid || idx}
                                onClick={() => handleRowClick(order.symbol, order.exchange)}
                                className={styles.clickableRow}
                            >
                                <td className={styles.timeCell}>{order.timestamp}</td>
                                <td className={styles.symbolCell}>{order.symbol}</td>
                                <td className={order.action === 'BUY' ? styles.positive : styles.negative}>
                                    {order.action}
                                </td>
                                <td>{order.pricetype}</td>
                                <td className={styles.alignRight}>{order.quantity}</td>
                                <td className={styles.alignRight}>{formatCurrency(order.price)}</td>
                                <td>
                                    <span className={`${styles.statusBadge} ${styles[`status${order.order_status}`]}`}>
                                        {order.order_status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {orders.statistics && (
                    <div className={styles.orderStats}>
                        <span>Open: {orders.statistics.total_open_orders || 0}</span>
                        <span>Completed: {orders.statistics.total_completed_orders || 0}</span>
                        <span>Rejected: {orders.statistics.total_rejected_orders || 0}</span>
                    </div>
                )}
            </div>
        );
    };

    // Render holdings table
    const renderHoldings = () => {
        const holdingsList = holdings.holdings || [];

        if (holdingsList.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>💼</span>
                    <p>No holdings found in your demat account</p>
                </div>
            );
        }

        return (
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Symbol</th>
                            <th>Exchange</th>
                            <th className={styles.alignRight}>Qty</th>
                            <th className={styles.alignRight}>P&L</th>
                            <th className={styles.alignRight}>P&L %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {holdingsList.map((holding, idx) => {
                            const pnl = parseFloat(holding.pnl || 0);
                            const pnlPercent = parseFloat(holding.pnlpercent || 0);
                            return (
                                <tr
                                    key={`${holding.symbol}-${idx}`}
                                    onClick={() => handleRowClick(holding.symbol, holding.exchange)}
                                    className={styles.clickableRow}
                                >
                                    <td className={styles.symbolCell}>{holding.symbol}</td>
                                    <td>{holding.exchange}</td>
                                    <td className={styles.alignRight}>{holding.quantity}</td>
                                    <td className={`${styles.alignRight} ${pnl >= 0 ? styles.positive : styles.negative}`}>
                                        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                                    </td>
                                    <td className={`${styles.alignRight} ${pnlPercent >= 0 ? styles.positive : styles.negative}`}>
                                        {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {holdings.statistics && (
                    <div className={styles.holdingStats}>
                        <span>Total Value: ₹{formatCurrency(holdings.statistics.totalholdingvalue)}</span>
                        <span className={holdings.statistics.totalprofitandloss >= 0 ? styles.positive : styles.negative}>
                            Total P&L: ₹{formatCurrency(holdings.statistics.totalprofitandloss)} ({holdings.statistics.totalpnlpercentage?.toFixed(2)}%)
                        </span>
                    </div>
                )}
            </div>
        );
    };

    // Render trades table
    const renderTrades = () => {
        if (trades.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>📈</span>
                    <p>No trades executed today</p>
                </div>
            );
        }

        return (
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Symbol</th>
                            <th>Action</th>
                            <th className={styles.alignRight}>Qty</th>
                            <th className={styles.alignRight}>Avg Price</th>
                            <th className={styles.alignRight}>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trades.map((trade, idx) => (
                            <tr
                                key={trade.orderid || idx}
                                onClick={() => handleRowClick(trade.symbol, trade.exchange)}
                                className={styles.clickableRow}
                            >
                                <td className={styles.timeCell}>{trade.timestamp}</td>
                                <td className={styles.symbolCell}>{trade.symbol}</td>
                                <td className={trade.action === 'BUY' ? styles.positive : styles.negative}>
                                    {trade.action}
                                </td>
                                <td className={styles.alignRight}>{trade.quantity}</td>
                                <td className={styles.alignRight}>{formatCurrency(trade.average_price)}</td>
                                <td className={styles.alignRight}>₹{formatCurrency(trade.trade_value)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // Render content based on active tab
    const renderContent = () => {
        switch (activeTab) {
            case 'positions':
                return renderPositions();
            case 'orders':
                return renderOrders();
            case 'holdings':
                return renderHoldings();
            case 'trades':
                return renderTrades();
            default:
                return renderPositions();
        }
    };

    return (
        <div className={styles.accountPanel}>
            {/* Header */}
            <div className={`${styles.header} ${!isToolbarVisible ? styles.noToolbar : ''}`}>
                <div className={styles.headerLeft}>
                    <Wallet size={16} className={styles.headerIcon} />
                    <span className={styles.title}>Account Manager</span>
                    {brokerName && (
                        <span className={styles.brokerBadge}>{brokerName}</span>
                    )}
                </div>

                <div className={styles.headerCenter}>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Unrealized P&L</span>
                        <span className={`${styles.summaryValue} ${unrealizedPnL >= 0 ? styles.positive : styles.negative}`}>
                            {unrealizedPnL >= 0 ? '+' : ''}₹{formatCurrency(unrealizedPnL)}
                        </span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Realized P&L</span>
                        <span className={`${styles.summaryValue} ${realizedPnL >= 0 ? styles.positive : styles.negative}`}>
                            {realizedPnL >= 0 ? '+' : ''}₹{formatCurrency(realizedPnL)}
                        </span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Margin</span>
                        <span className={styles.summaryValue}>₹{formatCurrency(availableMargin)}</span>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    <button
                        className={styles.refreshBtn}
                        onClick={fetchAccountData}
                        disabled={isLoading}
                        title="Refresh data"
                    >
                        <RefreshCw size={14} className={isLoading ? styles.spinning : ''} />
                    </button>
                    <button
                        className={styles.controlBtn}
                        onClick={onMinimize}
                        title={isMinimized ? "Restore panel" : "Minimize panel"}
                    >
                        <Minus size={14} />
                    </button>
                    <button
                        className={styles.controlBtn}
                        onClick={onMaximize}
                        title={isMaximized ? "Restore size" : "Maximize panel"}
                    >
                        {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button className={styles.closeBtn} onClick={onClose} title="Close panel">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Tabs - hidden when minimized */}
            {!isMinimized && (
                <div className={`${styles.tabs} ${!isToolbarVisible ? styles.noToolbar : ''}`}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                            {tab.id === 'positions' && positions.filter(p => p.quantity !== 0).length > 0 && (
                                <span className={styles.tabBadge}>{positions.filter(p => p.quantity !== 0).length}</span>
                            )}
                            {tab.id === 'orders' && orders.statistics?.total_open_orders > 0 && (
                                <span className={styles.tabBadge}>{orders.statistics.total_open_orders}</span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Content - hidden when minimized */}
            {!isMinimized && (
                <div className={styles.content}>
                    {!isAuthenticated ? (
                        <div className={styles.emptyState}>
                            <p>Connect to OpenAlgo to view account data</p>
                        </div>
                    ) : isLoading && positions.length === 0 ? (
                        <div className={styles.loading}>
                            <RefreshCw size={24} className={styles.spinning} />
                            <p>Loading account data...</p>
                        </div>
                    ) : (
                        renderContent()
                    )}
                </div>
            )}
        </div>
    );
};

export default AccountPanel;
