# openalgo-chart

> **WARNING — Localhost Only:** This project is intended to run on a local development server (http://localhost). Some features (API access, CORS, or websocket connections) may not work correctly when served from a remote host or different origin.

A professional charting application using `lightweight-charts` and React.

*Inspired by [TradingView](https://www.tradingview.com/) — UI and charting concepts influenced this project.*

## Features

### Multi-Chart Layout
- Support for 1, 2, 3, or 4 chart grid layouts
- Each chart maintains independent symbol, interval, and strategy configuration
- Click on any chart to make it active for symbol changes

### Option Chain Picker
- Professional option chain interface with real-time data
- Strategy templates: Straddle, Strangle, Iron Condor, Butterfly, Bull Call Spread, Bear Put Spread
- Custom multi-leg strategy builder
- Greeks display (Delta, IV)
- OI bars visualization
- Per-chart strategy configuration - run different strategies in each chart panel

### Chart Types
- Candlestick
- Line
- Area
- Baseline
- Renko

### Technical Indicators
- SMA (Simple Moving Average)
- EMA (Exponential Moving Average)
- RSI (Relative Strength Index)
- MACD
- Bollinger Bands
- Volume
- ATR (Average True Range)
- Stochastic
- VWAP

### Drawing Tools
- Trend lines
- Horizontal lines
- Vertical lines
- Ray lines
- Fibonacci retracement
- Shapes (Rectangle, Circle, Triangle, Arc)
- Text annotations
- Price alerts
- Brush and Highlighter
- Parallel Channel

### Watchlist
- Multiple watchlists support
- Favorites list
- Real-time price updates
- Drag-and-drop reordering
- Import/Export functionality

### Additional Features
- Symbol comparison overlay
- Replay mode for historical analysis
- Price alerts with notifications
- Session break markers
- Customizable chart appearance
- Keyboard shortcuts
- Command palette
- Shift+Click Quick Measure Tool (measure distance between any two points)

## Quick Start

Clone the repo:

```bash
git clone https://github.com/crypt0inf0/openalgo-chart.git
```

Change into the project directory:

```bash
cd openalgo-chart
```

Install dependencies:

```bash
npm install
```

Build for production:

```bash
npm run build
```

Run the dev server:

```bash
npm run dev
```

You can also preview a production build locally with:

```bash
npm run preview
```

## Recent Updates

### Arc Drawing Tool
- New Arc tool for highlighting chart patterns (cup and handle, rounded bottoms, etc.)
- 3-point input: click start, apex/control point, then end
- Quadratic bezier curve with customizable border and fill
- Full editing support: select, move anchor points, delete

### Shift+Click Quick Measure
- Hold Shift and click two points on the chart to quickly measure distance
- Shows price change (absolute and percentage), bar count, and time duration
- Visual line connecting the two measurement points

### Option Chain & Strategy Charts
- Added professional Option Chain Picker with Greeks (Delta, IV)
- Strategy templates for common option strategies
- Custom multi-leg strategy builder with buy/sell direction toggle
- Per-chart strategy configuration for multi-chart layouts
- Dynamic OHLC header showing strategy name (e.g., "NIFTY +25350PE/+25150PE (16 DEC)")

### Multi-Chart Improvements
- Each chart panel now maintains its own independent strategy configuration
- Selecting a regular stock clears strategy config for that chart only
- Strategy names display correctly in both OHLC header and price label

### UI Enhancements
- Larger Option Chain Picker modal (950px width, 550px content height)
- More strikes visible at once for easier strategy building

## Screenshot

![App screenshot](./chart.png)

## License

MIT
