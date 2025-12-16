/**
 * TPO Profile Primitive for lightweight-charts
 * Implements ISeriesPrimitive interface to render TPO/Market Profile
 *
 * This primitive renders:
 * - TPO letters/blocks at each price level (with gradient colors)
 * - POC (Point of Control) line
 * - Value Area shading (VAH/VAL)
 * - Initial Balance range
 * - Poor High/Low indicators
 * - Single Prints highlighting
 * - Midpoint line
 * - Open/Close markers
 */

import { getLetterColor, TPO_LINE_COLORS } from './TPOConstants';

const DEFAULT_OPTIONS = {
  // Display options
  showLetters: true,
  showPOC: true,
  showValueArea: true,
  showInitialBalance: true,
  showVAH: true,
  showVAL: true,
  showPoorHigh: false,
  showPoorLow: false,
  showSinglePrints: false,
  showMidpoint: false,
  showOpen: false,
  showClose: false,
  useGradientColors: true,  // Use TradingView-style gradient
  position: 'right', // 'left', 'right', 'overlay'

  // Sizing
  letterWidth: 12,
  letterHeight: 14,
  letterSpacing: 2,
  maxLettersVisible: 26,

  // Colors - defaults from TPO_LINE_COLORS
  letterColor: '#1E88E5',  // Fallback if gradient disabled
  letterBackgroundColor: 'transparent',
  pocColor: TPO_LINE_COLORS.poc,
  pocLineWidth: 2,
  vahColor: TPO_LINE_COLORS.vah,
  valColor: TPO_LINE_COLORS.val,
  valueAreaColor: TPO_LINE_COLORS.valueArea,
  ibColor: TPO_LINE_COLORS.ibFill,
  ibBorderColor: TPO_LINE_COLORS.ibBorder,
  poorHighColor: TPO_LINE_COLORS.poorHigh,
  poorLowColor: TPO_LINE_COLORS.poorLow,
  singlePrintColor: TPO_LINE_COLORS.singlePrint,
  midpointColor: TPO_LINE_COLORS.midpoint,
  openColor: '#4CAF50',   // Green for open
  closeColor: '#F44336',  // Red for close

  // Font
  fontSize: 11,
  fontFamily: 'Arial, sans-serif',
};

/**
 * TPO Pane Renderer - handles actual Canvas2D drawing
 */
class TPOPaneRenderer {
  constructor(source) {
    this._source = source;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const { context: ctx, bitmapSize, horizontalPixelRatio, verticalPixelRatio } = scope;
      const profiles = this._source._profiles;
      const options = this._source._options;
      const series = this._source._series;
      const chart = this._source._chart;

      if (!series || !profiles || profiles.length === 0) return;

      // Get the most recent profile (current session)
      const currentProfile = profiles[profiles.length - 1];
      if (!currentProfile || !currentProfile.priceLevels) return;

      const chartWidth = bitmapSize.width;
      const chartHeight = bitmapSize.height;

      // Calculate x position for TPO display based on position option
      // Calculate required width for TPO letters
      const letterWidth = options.letterWidth * horizontalPixelRatio;
      const spacing = options.letterSpacing * horizontalPixelRatio;
      const maxTpoWidth = options.maxLettersVisible * (letterWidth + spacing);

      let baseX;
      if (options.position === 'left') {
        baseX = 20 * horizontalPixelRatio;
      } else if (options.position === 'overlay') {
        baseX = chartWidth * 0.5; // Center of chart
      } else {
        // Right (default) - position in right 30% of chart
        baseX = chartWidth * 0.7;
      }

      // Draw Initial Balance range (background)
      if (options.showInitialBalance && currentProfile.ibHigh !== undefined && currentProfile.ibLow !== undefined) {
        this._drawInitialBalance(ctx, series, currentProfile, options, chartWidth, horizontalPixelRatio, verticalPixelRatio);
      }

      // Draw Value Area shading (background)
      if (options.showValueArea && currentProfile.vah !== undefined && currentProfile.val !== undefined) {
        this._drawValueArea(ctx, series, currentProfile, options, chartWidth, horizontalPixelRatio, verticalPixelRatio);
      }

      // Draw Single Prints highlighting (background)
      if (options.showSinglePrints && currentProfile.singlePrints?.length > 0) {
        this._drawSinglePrints(ctx, series, currentProfile, options, chartWidth, horizontalPixelRatio, verticalPixelRatio);
      }

      // Draw TPO letters/blocks at each price level
      this._drawTPOLetters(ctx, series, currentProfile, options, baseX, horizontalPixelRatio, verticalPixelRatio);

      // Draw POC line
      if (options.showPOC && currentProfile.poc !== undefined && currentProfile.poc !== 0) {
        this._drawPOCLine(ctx, series, currentProfile.poc, options, chartWidth, horizontalPixelRatio, verticalPixelRatio);
      }

      // Draw VAH/VAL lines
      if (options.showVAH || options.showVAL) {
        this._drawVALines(ctx, series, currentProfile, options, chartWidth, horizontalPixelRatio, verticalPixelRatio);
      }

      // Draw Poor High line
      if (options.showPoorHigh && currentProfile.poorHigh !== null) {
        this._drawPoorHighLine(ctx, series, currentProfile.poorHigh, options, chartWidth, horizontalPixelRatio, verticalPixelRatio);
      }

      // Draw Poor Low line
      if (options.showPoorLow && currentProfile.poorLow !== null) {
        this._drawPoorLowLine(ctx, series, currentProfile.poorLow, options, chartWidth, horizontalPixelRatio, verticalPixelRatio);
      }

      // Draw Midpoint line
      if (options.showMidpoint && currentProfile.midpoint) {
        this._drawMidpointLine(ctx, series, currentProfile.midpoint, options, chartWidth, horizontalPixelRatio, verticalPixelRatio);
      }

      // Draw Open/Close markers
      if (options.showOpen && currentProfile.openPrice) {
        this._drawOpenMarker(ctx, series, currentProfile.openPrice, options, chartWidth, horizontalPixelRatio, verticalPixelRatio);
      }
      if (options.showClose && currentProfile.closePrice) {
        this._drawCloseMarker(ctx, series, currentProfile.closePrice, options, chartWidth, horizontalPixelRatio, verticalPixelRatio);
      }
    });
  }

  _drawTPOLetters(ctx, series, profile, options, baseX, hRatio, vRatio) {
    const letterWidth = options.letterWidth * hRatio;
    const letterHeight = options.letterHeight * vRatio;
    const spacing = options.letterSpacing * hRatio;

    ctx.font = `bold ${options.fontSize * vRatio}px ${options.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const [price, levelData] of profile.priceLevels) {
      const y = series.priceToCoordinate(price);
      if (y === null) continue;

      const yPixel = Math.round(y * vRatio);
      const letters = [...levelData.letters].sort();

      // Determine background color based on level type
      let bgColor = options.letterBackgroundColor;
      if (price === profile.poc) {
        bgColor = options.pocColor + '40'; // 25% opacity
      } else if (price >= profile.val && price <= profile.vah) {
        bgColor = options.valueAreaColor;
      }

      // Draw each letter with gradient colors
      letters.slice(0, options.maxLettersVisible).forEach((letter, idx) => {
        const x = baseX + (idx * (letterWidth + spacing));

        // Draw background block
        if (bgColor && bgColor !== 'transparent') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(
            x - letterWidth / 2,
            yPixel - letterHeight / 2,
            letterWidth,
            letterHeight
          );
        }

        // Get color for this letter (gradient or fallback)
        const letterColor = options.useGradientColors
          ? getLetterColor(letter)
          : options.letterColor;

        // Draw letter or block
        if (options.showLetters) {
          ctx.fillStyle = letterColor;
          ctx.fillText(letter, x, yPixel);
        } else {
          // Draw solid block instead of letter
          ctx.fillStyle = price === profile.poc ? options.pocColor : letterColor;
          ctx.globalAlpha = 0.8;
          ctx.fillRect(
            x - letterWidth / 2 + 1,
            yPixel - letterHeight / 2 + 1,
            letterWidth - 2,
            letterHeight - 2
          );
          ctx.globalAlpha = 1;
        }
      });

      // If more letters than visible, show indicator
      if (letters.length > options.maxLettersVisible) {
        const x = baseX + (options.maxLettersVisible * (letterWidth + spacing));
        ctx.fillStyle = options.useGradientColors ? '#9E9E9E' : options.letterColor;
        ctx.fillText('...', x, yPixel);
      }
    }
  }

  _drawPOCLine(ctx, series, poc, options, chartWidth, hRatio, vRatio) {
    const y = series.priceToCoordinate(poc);
    if (y === null) return;

    const yPixel = Math.round(y * vRatio);

    ctx.beginPath();
    ctx.strokeStyle = options.pocColor;
    ctx.lineWidth = options.pocLineWidth * hRatio;
    ctx.setLineDash([5 * hRatio, 5 * hRatio]);
    ctx.moveTo(0, yPixel);
    ctx.lineTo(chartWidth, yPixel);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw POC label
    ctx.fillStyle = options.pocColor;
    ctx.font = `bold ${10 * vRatio}px ${options.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText('POC', 5 * hRatio, yPixel - 5 * vRatio);
  }

  _drawVALines(ctx, series, profile, options, chartWidth, hRatio, vRatio) {
    // VAH line
    if (options.showVAH) {
      const vahY = series.priceToCoordinate(profile.vah);
      if (vahY !== null) {
        const yPixel = Math.round(vahY * vRatio);
        ctx.beginPath();
        ctx.strokeStyle = options.vahColor;
        ctx.lineWidth = 1 * hRatio;
        ctx.setLineDash([3 * hRatio, 3 * hRatio]);
        ctx.moveTo(0, yPixel);
        ctx.lineTo(chartWidth, yPixel);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = options.vahColor;
        ctx.font = `${9 * vRatio}px ${options.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.fillText('VAH', 5 * hRatio, yPixel - 3 * vRatio);
      }
    }

    // VAL line
    if (options.showVAL) {
      const valY = series.priceToCoordinate(profile.val);
      if (valY !== null) {
        const yPixel = Math.round(valY * vRatio);
        ctx.beginPath();
        ctx.strokeStyle = options.valColor;
        ctx.lineWidth = 1 * hRatio;
        ctx.setLineDash([3 * hRatio, 3 * hRatio]);
        ctx.moveTo(0, yPixel);
        ctx.lineTo(chartWidth, yPixel);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = options.valColor;
        ctx.font = `${9 * vRatio}px ${options.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.fillText('VAL', 5 * hRatio, yPixel + 10 * vRatio);
      }
    }
  }

  _drawValueArea(ctx, series, profile, options, chartWidth, hRatio, vRatio) {
    const vahY = series.priceToCoordinate(profile.vah);
    const valY = series.priceToCoordinate(profile.val);

    if (vahY === null || valY === null) return;

    const top = Math.round(Math.min(vahY, valY) * vRatio);
    const bottom = Math.round(Math.max(vahY, valY) * vRatio);
    const height = bottom - top;

    // LIMIT TO TPO AREA (right 30% of chart) - not full width
    const tpoAreaStart = chartWidth * 0.7;
    const tpoAreaWidth = chartWidth * 0.3;

    ctx.fillStyle = options.valueAreaColor;
    ctx.fillRect(tpoAreaStart, top, tpoAreaWidth, height);
  }

  _drawInitialBalance(ctx, series, profile, options, chartWidth, hRatio, vRatio) {
    const ibHighY = series.priceToCoordinate(profile.ibHigh);
    const ibLowY = series.priceToCoordinate(profile.ibLow);

    if (ibHighY === null || ibLowY === null) return;

    const top = Math.round(Math.min(ibHighY, ibLowY) * vRatio);
    const bottom = Math.round(Math.max(ibHighY, ibLowY) * vRatio);
    const height = bottom - top;

    // LIMIT TO TPO AREA (right 30% of chart) - not full width
    const tpoAreaStart = chartWidth * 0.7;
    const tpoAreaWidth = chartWidth * 0.3;

    // Fill - LIMITED WIDTH
    ctx.fillStyle = options.ibColor;
    ctx.fillRect(tpoAreaStart, top, tpoAreaWidth, height);

    // Border - LIMITED WIDTH
    ctx.strokeStyle = options.ibBorderColor;
    ctx.lineWidth = 1 * hRatio;
    ctx.setLineDash([2 * hRatio, 2 * hRatio]);
    ctx.strokeRect(tpoAreaStart, top, tpoAreaWidth, height);
    ctx.setLineDash([]);

    // Label - position at end of TPO area
    ctx.fillStyle = options.ibBorderColor;
    ctx.font = `${9 * vRatio}px ${options.fontFamily}`;
    ctx.textAlign = 'right';
    ctx.fillText('IB', chartWidth - 5 * hRatio, top + 12 * vRatio);
  }

  _drawPoorHighLine(ctx, series, poorHigh, options, chartWidth, hRatio, vRatio) {
    const y = series.priceToCoordinate(poorHigh);
    if (y === null) return;

    const yPixel = Math.round(y * vRatio);

    ctx.beginPath();
    ctx.strokeStyle = options.poorHighColor;
    ctx.lineWidth = 1.5 * hRatio;
    ctx.setLineDash([4 * hRatio, 4 * hRatio]);
    ctx.moveTo(0, yPixel);
    ctx.lineTo(chartWidth, yPixel);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw label
    ctx.fillStyle = options.poorHighColor;
    ctx.font = `${9 * vRatio}px ${options.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText('Poor High', 5 * hRatio, yPixel - 5 * vRatio);
  }

  _drawPoorLowLine(ctx, series, poorLow, options, chartWidth, hRatio, vRatio) {
    const y = series.priceToCoordinate(poorLow);
    if (y === null) return;

    const yPixel = Math.round(y * vRatio);

    ctx.beginPath();
    ctx.strokeStyle = options.poorLowColor;
    ctx.lineWidth = 1.5 * hRatio;
    ctx.setLineDash([4 * hRatio, 4 * hRatio]);
    ctx.moveTo(0, yPixel);
    ctx.lineTo(chartWidth, yPixel);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw label
    ctx.fillStyle = options.poorLowColor;
    ctx.font = `${9 * vRatio}px ${options.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText('Poor Low', 5 * hRatio, yPixel + 12 * vRatio);
  }

  _drawSinglePrints(ctx, series, profile, options, chartWidth, hRatio, vRatio) {
    // Draw highlighting for single print zones
    const tpoAreaStart = chartWidth * 0.7;
    const tpoAreaWidth = chartWidth * 0.3;

    for (const price of profile.singlePrints) {
      const y = series.priceToCoordinate(price);
      if (y === null) continue;

      const yPixel = Math.round(y * vRatio);
      const height = options.letterHeight * vRatio;

      // Yellow highlight behind single print levels
      ctx.fillStyle = options.singlePrintColor + '40'; // 25% opacity
      ctx.fillRect(tpoAreaStart, yPixel - height / 2, tpoAreaWidth, height);
    }
  }

  _drawMidpointLine(ctx, series, midpoint, options, chartWidth, hRatio, vRatio) {
    const y = series.priceToCoordinate(midpoint);
    if (y === null) return;

    const yPixel = Math.round(y * vRatio);

    ctx.beginPath();
    ctx.strokeStyle = options.midpointColor;
    ctx.lineWidth = 1 * hRatio;
    ctx.setLineDash([2 * hRatio, 4 * hRatio]);
    ctx.moveTo(0, yPixel);
    ctx.lineTo(chartWidth, yPixel);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw label
    ctx.fillStyle = options.midpointColor;
    ctx.font = `${9 * vRatio}px ${options.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText('MID', 5 * hRatio, yPixel - 3 * vRatio);
  }

  _drawOpenMarker(ctx, series, openPrice, options, chartWidth, hRatio, vRatio) {
    const y = series.priceToCoordinate(openPrice);
    if (y === null) return;

    const yPixel = Math.round(y * vRatio);
    const markerSize = 6 * hRatio;

    // Draw triangle pointing right (open)
    ctx.beginPath();
    ctx.fillStyle = options.openColor;
    ctx.moveTo(10 * hRatio, yPixel - markerSize);
    ctx.lineTo(10 * hRatio + markerSize, yPixel);
    ctx.lineTo(10 * hRatio, yPixel + markerSize);
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.font = `${8 * vRatio}px ${options.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText('O', 18 * hRatio, yPixel + 3 * vRatio);
  }

  _drawCloseMarker(ctx, series, closePrice, options, chartWidth, hRatio, vRatio) {
    const y = series.priceToCoordinate(closePrice);
    if (y === null) return;

    const yPixel = Math.round(y * vRatio);
    const markerSize = 6 * hRatio;

    // Draw square (close)
    ctx.fillStyle = options.closeColor;
    ctx.fillRect(
      10 * hRatio - markerSize / 2,
      yPixel - markerSize / 2,
      markerSize,
      markerSize
    );

    // Label
    ctx.font = `${8 * vRatio}px ${options.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText('C', 18 * hRatio, yPixel + 3 * vRatio);
  }
}

/**
 * TPO Pane View - creates renderer for drawing
 */
class TPOPaneView {
  constructor(source) {
    this._source = source;
  }

  update() {
    // Called when chart needs to update
  }

  renderer() {
    return new TPOPaneRenderer(this._source);
  }

  zOrder() {
    return 'bottom'; // Draw behind candlesticks
  }
}

/**
 * Main TPO Profile Primitive class
 * Implements ISeriesPrimitive interface for lightweight-charts
 */
export class TPOProfilePrimitive {
  constructor(options = {}) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._profiles = [];
    this._paneViews = [new TPOPaneView(this)];
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  /**
   * Called when primitive is attached to a series
   */
  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  /**
   * Called when primitive is detached from series
   */
  detached() {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  /**
   * Returns pane views for rendering
   */
  paneViews() {
    return this._paneViews;
  }

  /**
   * Trigger re-render of all views
   */
  updateAllViews() {
    this._paneViews.forEach(view => view.update());
    this._requestUpdate?.();
  }

  /**
   * Set TPO profile data
   * @param {Array} profiles - Array of calculated TPO profiles
   */
  setData(profiles) {
    this._profiles = profiles || [];
    this.updateAllViews();
  }

  /**
   * Get current options
   */
  options() {
    return this._options;
  }

  /**
   * Update options and re-render
   */
  applyOptions(options) {
    this._options = { ...this._options, ...options };
    this.updateAllViews();
  }

  /**
   * Autoscale info - return null to not affect chart scaling
   */
  autoscaleInfo() {
    return null;
  }
}

export default TPOProfilePrimitive;
