import { AlertCondition } from '../line-tool-alert-manager';

export interface AlertNotificationData {
    alertId: string;
    symbol: string;
    price: string; // Formatted price string
    timestamp: number;
    direction: 'up' | 'down';
    condition: AlertCondition;
    onEdit?: (data: AlertNotificationData) => void;
}

import { LineToolManager } from '../../line-tool-manager';

export class AlertNotification {
    private _container: HTMLElement | null;
    private _notifications: Map<string, HTMLElement> = new Map();
    private _manager: LineToolManager | null;
    private _dismissTimeouts: Map<string, number> = new Map(); // RC-5

    constructor(manager: LineToolManager) {
        this._manager = manager;
        this._injectStyles();
        this._container = this._createContainer();
        document.body.appendChild(this._container);
    }

    private _injectStyles(): void {
        const styleId = 'alert-notification-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .alert-notifications-container {
                position: fixed;
                /* Position set by JS */
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
                font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif;
            }

            .alert-notification {
                background: #F5F8FA;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 16px;
                min-width: 320px;
                max-width: 400px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
                animation: slideIn 0.3s ease-out;
                pointer-events: auto;
            }

            .alert-notification.dismissing {
                animation: slideOut 0.3s ease-out;
            }

            .alert-notification-icon {
                font-size: 24px;
                line-height: 1;
                flex-shrink: 0;
            }

            .alert-notification-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .alert-notification-header {
                font-size: 14px;
                font-weight: 600;
                color: #131722;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .alert-notification-message {
                font-size: 13px;
                color: #131722;
                font-weight: 500;
            }

            .alert-notification-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 6px;
            }

            .alert-notification-edit {
                font-size: 12px;
                color: #2962FF;
                text-decoration: none;
                cursor: pointer;
            }

            .alert-notification-edit:hover {
                text-decoration: underline;
            }

            .alert-notification-timestamp {
                font-size: 11px;
                color: #787B86;
            }

            .alert-notification-close {
                background: none;
                border: none;
                font-size: 24px;
                line-height: 1;
                color: #787B86;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                border-radius: 4px;
                transition: all 0.2s ease;
                z-index: 1;
            }

            .alert-notification-close:hover {
                background: rgba(0, 0, 0, 0.05);
                color: #131722;
            }

            @keyframes slideIn {
                from { opacity: 0; transform: translateX(100%); }
                to { opacity: 1; transform: translateX(0); }
            }

            @keyframes slideOut {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(100%); }
            }
        `;
        document.head.appendChild(style);
    }

    public show(data: AlertNotificationData): void {
        if (!this._container) return;
        
        // Update position before showing
        this._updatePosition();

        // If notification already exists for this alert, dismiss it first
        if (this._notifications.has(data.alertId)) {
            this.dismiss(data.alertId);
        }

        const notification = this._createNotification(data);
        this._container.appendChild(notification);
        this._notifications.set(data.alertId, notification);

        // Auto-dismiss after 60 seconds (RC-5)
        const timeoutId = window.setTimeout(() => {
            this._dismissTimeouts.delete(data.alertId);
            this.dismiss(data.alertId);
        }, 60000);
        this._dismissTimeouts.set(data.alertId, timeoutId);

        this._playAlarm();
    }

    private _playAlarm(): void {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = "square";          // matches uploaded alarm tone
            oscillator.frequency.value = 2048;   // ~2kHz sharp alarm pitch

            const now = ctx.currentTime;

            /**
             * 3 seconds total:
             * beep ON 150ms → OFF 150ms repeating
             * Each cycle = 0.30s → 3s total = 10 pulses
             */
            for (let i = 0; i < 10; i++) {
                const t = now + i * 0.30;
                gainNode.gain.setValueAtTime(1.0, t);        // beep
                gainNode.gain.setValueAtTime(0.0, t + 0.15);  // off pause
            }

            oscillator.start(now);
            oscillator.stop(now + 3.1);         // full alarm = 3 seconds (10 pulses * 0.3s)

            oscillator.onended = () => ctx.close();  // cleanup

        } catch (error) {
            console.error("Alarm sound failed:", error);
        }
    }

    private _updatePosition(): void {
        if (!this._container || !this._manager) return;
        
        const chartRect = this._manager.getChartRect();
        if (chartRect) {
            // 30px from left, 15px from bottom (relative to chart)
            // Since container is fixed, we use client coordinates
            const left = chartRect.left + 15;
            const bottom = window.innerHeight - chartRect.bottom + 30;

            this._container.style.left = `${left}px`;
            this._container.style.bottom = `${bottom}px`;
            this._container.style.top = 'auto';
            this._container.style.right = 'auto';
        } else {
            // Fallback
            this._container.style.left = '20px';
            this._container.style.bottom = '20px';
            this._container.style.top = 'auto';
            this._container.style.right = 'auto';
        }
    }

    public dismiss(alertId: string): void {
        // Clear timeout if exists (RC-5)
        const timeoutId = this._dismissTimeouts.get(alertId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this._dismissTimeouts.delete(alertId);
        }
        
        const notification = this._notifications.get(alertId);
        if (notification) {
            notification.classList.add('dismissing');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this._notifications.delete(alertId);
            }, 300);
        }
    }

    public destroy(): void {
        // Clear all timeouts
        this._dismissTimeouts.forEach((timeoutId) => {
            clearTimeout(timeoutId);
        });
        this._dismissTimeouts.clear();
        
        this._notifications.forEach((_, alertId) => {
            this.dismiss(alertId);
        });
        if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
        this._container = null;
        this._manager = null;
    }

    private _createContainer(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'alert-notifications-container';
        return container;
    }

    private _createNotification(data: AlertNotificationData): HTMLElement {
        const notification = document.createElement('div');
        notification.className = 'alert-notification';

        // Alert icon (coin emoji)
        const iconDiv = document.createElement('div');
        iconDiv.className = 'alert-notification-icon';
        iconDiv.textContent = '🪙';
        notification.appendChild(iconDiv);

        // Content section
        const contentDiv = document.createElement('div');
        contentDiv.className = 'alert-notification-content';

        // Header with "Alert on SYMBOL"
        const headerDiv = document.createElement('div');
        headerDiv.className = 'alert-notification-header';
        headerDiv.textContent = `Alert on ${data.symbol}`;
        contentDiv.appendChild(headerDiv);

        // Message with crossing price
        const messageDiv = document.createElement('div');
        messageDiv.className = 'alert-notification-message';
        // Format message based on condition
        let action = 'Crossing';
        if (data.condition === 'crossing_up') action = 'Crossing Up';
        else if (data.condition === 'crossing_down') action = 'Crossing Down';
        else if (data.condition === 'entering') action = 'Entering';
        else if (data.condition === 'exiting') action = 'Exiting';
        else if (data.condition === 'inside') action = 'Inside';
        else if (data.condition === 'outside') action = 'Outside';

        messageDiv.textContent = `${data.symbol} ${action} ${data.price}`;
        contentDiv.appendChild(messageDiv);

        // Footer with edit link and timestamp
        const footerDiv = document.createElement('div');
        footerDiv.className = 'alert-notification-footer';

        const editLink = document.createElement('a');
        editLink.className = 'alert-notification-edit';
        editLink.href = '#';
        editLink.textContent = 'Edit alert';
        editLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (data.onEdit) {
                data.onEdit(data);
            }
        });
        footerDiv.appendChild(editLink);

        const timestamp = document.createElement('span');
        timestamp.className = 'alert-notification-timestamp';
        timestamp.textContent = this._formatTime(data.timestamp);
        footerDiv.appendChild(timestamp);

        contentDiv.appendChild(footerDiv);
        notification.appendChild(contentDiv);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'alert-notification-close';
        closeBtn.innerHTML = '×';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dismiss(data.alertId);
        });
        notification.appendChild(closeBtn);

        return notification;
    }

    private _formatTime(timestamp: number): string {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }
}
