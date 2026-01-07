
import {
    IChartApi,
    ISeriesApi,
    ISeriesPrimitive,
    SeriesAttachedParameter,
    SeriesType,
    Time,
    Coordinate,
    MouseEventParams,
} from 'lightweight-charts';
import { VisualTradingPaneView } from './pane-view';
import { OrderRendererData } from './renderer';

interface VisualTradingOptions {
    orders: any[];
    positions: any[];
    onModifyOrder: (orderId: string, newPrice: number) => void;
    onCancelOrder: (orderId: string) => void;
}

export class VisualTrading implements ISeriesPrimitive<Time> {
    private _chart: IChartApi | undefined;
    private _series: ISeriesApi<SeriesType> | undefined;
    private _paneViews: VisualTradingPaneView[];
    private _options: VisualTradingOptions;

    private _hoveredOrderId: string | null = null;
    private _draggingOrderId: string | null = null;
    private _dragStartY: number = 0;
    private _lastCrosshairY: number | null = null;
    private _lastCrosshairX: number | null = null;
    private _hoveredRemove: boolean = false; // Track if hovering over X button

    // Cache for order prices during drag to show visual feedback
    private _dragPrices: Map<string, number> = new Map();

    constructor(options: VisualTradingOptions) {
        this._options = options;
        this._paneViews = [new VisualTradingPaneView()];
    }

    attached(param: SeriesAttachedParameter<Time>) {
        this._chart = param.chart;
        this._series = param.series;

        // Subscribe to mouse events for interactivity
        // Note: Lightweight Charts primitive mouse handling is tricky.
        this._chart.subscribeCrosshairMove(this._handleCrosshairMove);
        this._chart.subscribeClick(this._handleClick);
    }

    detached() {
        if (this._chart) {
            this._chart.unsubscribeCrosshairMove(this._handleCrosshairMove);
            this._chart.unsubscribeClick(this._handleClick);
        }
    }

    paneViews() {
        return this._paneViews;
    }

    updateAllViews() {
        this._paneViews.forEach(pw => pw.update(this._getRendererData()));
    }

    setData(orders: any[], positions: any[]) {
        this._options.orders = orders;
        this._options.positions = positions;
        this.updateAllViews();
    }

    setCallbacks(callbacks: { onModifyOrder?: (id: string, price: number) => void; onCancelOrder?: (id: string) => void }) {
        if (callbacks.onModifyOrder) this._options.onModifyOrder = callbacks.onModifyOrder;
        if (callbacks.onCancelOrder) this._options.onCancelOrder = callbacks.onCancelOrder;
    }

    private _getRendererData(): OrderRendererData {
        if (!this._series) return { orders: [], positions: [] };

        const positions = this._options.positions.map(pos => {
            const price = parseFloat(pos.average_price);
            const y = this._series?.priceToCoordinate(price) ?? null;
            if (y === null) return null;

            const pnl = parseFloat(pos.pnl || 0);
            const color = pnl >= 0 ? '#10B981' : '#EF4444'; // Green/Red

            return {
                y: y as number,
                color,
                text: `${pos.quantity} ${pos.symbol} @ ${price} (${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)})`,
                lineWidth: 2
            };
        }).filter(p => p !== null);

        const orders = this._options.orders.map(order => {
            // If dragging, use overridden price
            let price = parseFloat(order.price);
            if (this._dragPrices.has(order.orderid)) {
                price = this._dragPrices.get(order.orderid)!;
            }

            // Market orders don't have price usually, skip them or show at LTP
            // Debug: Check why order might be skipped
            if (order.pricetype === 'MARKET') return null;

            const y = this._series?.priceToCoordinate(price) ?? null;
            if (y === null) {
                // Price is outside visible scale, skip rendering
                return null;
            }

            const isBuy = order.action === 'BUY';
            const color = isBuy ? '#3B82F6' : '#F59E0B'; // Blue / Orange
            const hovered = this._hoveredOrderId === order.orderid;

            return {
                id: order.orderid,
                y: y as number,
                color,
                text: `${order.action} ${order.quantity} @ ${price.toFixed(2)}`,
                hovered,
                showHover: hovered, // Only show label when hovered (like Alerts)
                hoverRemove: hovered && this._hoveredRemove,
                lineWidth: 1,
                lineStyle: [4, 4] // Dashed
            };
        }).filter(p => p !== null);

        // console.log('[VisualTrading] Render Data:', { ordersCount: orders.length });

        return {
            positions: positions as any[],
            orders: orders as any[]
        };
    }

    // Helper functions matching constants in renderer
    private _calculateLabelWidth(textLength: number) {
        // approximate width calculation matching renderer
        const averageWidthPerCharacter = 6;
        const removeButtonWidth = 26;
        const centreLabelInlinePadding = 9;
        const dynamicPadding = textLength > 25 ? Math.min(25, (textLength - 25) * 1.5) : 3;
        return (
            centreLabelInlinePadding * 2 +
            removeButtonWidth +
            dynamicPadding +
            textLength * averageWidthPerCharacter
        );
    }

    private _isHoveringRemoveButton(
        mouseX: number,
        mouseY: number,
        timescaleWidth: number,
        alertY: number,
        textLength: number
    ): boolean {
        const centreLabelHeight = 20;
        const removeButtonWidth = 26;
        const paddingRight = 5;

        const distanceY = Math.abs(mouseY - alertY);
        if (distanceY > centreLabelHeight / 2) return false;

        // Button is always anchored to the right edge
        const buttonRight = timescaleWidth - paddingRight;
        const buttonLeft = buttonRight - removeButtonWidth;

        return mouseX >= buttonLeft && mouseX <= buttonRight;
    }

    // Interaction Handlers

    private _handleCrosshairMove = (param: MouseEventParams) => {
        if (!param.point || !this._series) return;

        if (!param.point || !this._series) return;

        const y = param.point.y;
        this._lastCrosshairY = y;
        this._lastCrosshairX = param.point.x; // Track X for close button hit test

        // Hit test orders
        // We assume 10px hit radius
        let foundOrder = null;
        const data = this._getRendererData(); // Ideally optimize this to not recalculate every move

        for (const order of data.orders) {
            if (Math.abs(order.y - y) < 10) {
                foundOrder = order.id;
                break;
            }
        }

        if (this._hoveredOrderId !== foundOrder) {
            this._hoveredOrderId = foundOrder;
            this._hoveredRemove = false;
        }

        // Check for remove button hover if over an order
        if (this._hoveredOrderId && this._lastCrosshairX && this._series && this._chart) {
            const data = this._getRendererData();
            const order = data.orders.find(o => o.id === this._hoveredOrderId);
            if (order) {
                const width = this._chart.timeScale().width();
                const isHoveringRemove = this._isHoveringRemoveButton(
                    this._lastCrosshairX,
                    this._lastCrosshairY!,
                    width,
                    order.y,
                    order.text.length
                );
                this._hoveredRemove = isHoveringRemove;
            }
        } else {
            this._hoveredRemove = false;
        }

        this.updateAllViews();

        // Change cursor
        document.body.style.cursor = this._hoveredOrderId ? (this._hoveredRemove ? 'pointer' : 'grab') : 'default';
    };

    private _handleClick = (param: MouseEventParams) => {
        // Handled by React via handleMouseDown
    };

    // Public methods for React to call
    public handleMouseDown(x: number, y: number) {
        if (this._hoveredRemove) {
            // Clicked Close
            if (this._hoveredOrderId) {
                this._options.onCancelOrder(this._hoveredOrderId);
            }
            return true; // Handled
        }

        if (this._hoveredOrderId) {
            console.log('[VisualTrading] Drag Start:', this._hoveredOrderId);
            this._draggingOrderId = this._hoveredOrderId;

            // Lock chart interactions during drag
            if (this._chart) {
                this._chart.applyOptions({
                    handleScroll: false,
                    handleScale: false,
                    kineticScroll: { touch: false, mouse: false }
                });
            }

            return true; // handled
        }
        return false;
    }

    public handleMouseMove(x: number, y: number) {
        if (this._draggingOrderId && this._series) {
            // Use crosshair Y if available for better accuracy in pane coordinates
            // Fallback to y (raw) if crosshair is stale, but verify coordinate space
            const effectiveY = (this._lastCrosshairY !== null) ? this._lastCrosshairY : y;

            // console.log('[VisualTrading] Drag Move:', { y, lastCrosshairY: this._lastCrosshairY, effectiveY });

            const price = this._series.coordinateToPrice(effectiveY as Coordinate);
            if (price) {
                this._dragPrices.set(this._draggingOrderId, price);
                this.updateAllViews();
            }
        }
    }

    public handleMouseUp(x: number, y: number) {
        if (this._draggingOrderId) {
            const price = this._dragPrices.get(this._draggingOrderId);
            if (price) {
                this._options.onModifyOrder(this._draggingOrderId, price);
            }

            // Unlock chart interactions
            if (this._chart) {
                this._chart.applyOptions({
                    handleScroll: true,
                    handleScale: true,
                    kineticScroll: { touch: true, mouse: true }
                });
            }

            this._draggingOrderId = null;
            this._dragPrices.clear();
            this.updateAllViews();
        }
    }

    public getHoveredOrderId(): string | null {
        return this._hoveredOrderId;
    }
}
