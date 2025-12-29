import { AlertCondition } from '../line-tool-alert-manager';

export interface AlertEditData {
    alertId: string;
    price: number;
    condition: AlertCondition;
    symbol: string;
    isTrendline?: boolean;
    toolType?: 'line' | 'shape' | 'vertical'; // Optional helper to filter options
}

export class AlertEditDialog {
    private _overlay: HTMLElement | null = null;
    private _onSave: ((data: AlertEditData) => void) | null = null;
    private _currentData: AlertEditData | null = null;
    private _overlayClickHandler: ((e: MouseEvent) => void) | null = null; // B-9

    constructor() {
        this._injectStyles();
    }

    private _injectStyles(): void {
        const styleId = 'alert-edit-dialog-styles';
        if (document.getElementById(styleId)) return;

        // We'll fetch the CSS content we just created or inline it. 
        // For simplicity and robustness in this environment, I'll inline the CSS content here 
        // to ensure it's always available without loading external files.
        const css = `
            .alert-edit-dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.4);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif;
            }

            .alert-edit-dialog {
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
                width: 400px;
                max-width: 90%;
                overflow: hidden;
                animation: dialogFadeIn 0.2s ease-out;
            }

            .alert-edit-dialog-header {
                padding: 16px 20px;
                border-bottom: 1px solid #E0E3EB;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .alert-edit-dialog-title {
                font-size: 18px;
                font-weight: 600;
                color: #131722;
                margin: 0;
            }

            .alert-edit-dialog-close {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                color: #787B86;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
            }

            .alert-edit-dialog-close:hover {
                background: #F0F3FA;
                color: #131722;
            }

            .alert-edit-dialog-content {
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .alert-edit-form-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .alert-edit-label {
                font-size: 14px;
                color: #787B86;
            }

            .alert-edit-input, .alert-edit-select {
                padding: 8px 12px;
                border: 1px solid #E0E3EB;
                border-radius: 4px;
                font-size: 14px;
                color: #131722;
                outline: none;
                transition: border-color 0.2s;
            }

            .alert-edit-input:focus, .alert-edit-select:focus {
                border-color: #2962FF;
            }

            .alert-edit-dialog-footer {
                padding: 16px 20px;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                border-top: 1px solid #E0E3EB;
                background: #F8F9FD;
            }

            .alert-edit-btn {
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                border: none;
                transition: background 0.2s;
            }

            .alert-edit-btn-cancel {
                background: transparent;
                color: #131722;
                border: 1px solid #E0E3EB;
            }

            .alert-edit-btn-cancel:hover {
                background: #F0F3FA;
            }

            .alert-edit-btn-save {
                background: #2962FF;
                color: white;
            }

            .alert-edit-btn-save:hover {
                background: #1E53E5;
            }

            @keyframes dialogFadeIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
        `;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }

    public show(data: AlertEditData, onSave: (data: AlertEditData) => void): void {
        this._currentData = { ...data };
        this._onSave = onSave;
        this._createOverlay();
        document.body.appendChild(this._overlay!);
    }

    public hide(): void {
        if (this._overlay) {
            if (this._overlayClickHandler) {
                this._overlay.removeEventListener('click', this._overlayClickHandler);
                this._overlayClickHandler = null;
            }
            if (this._overlay.parentNode) {
                this._overlay.parentNode.removeChild(this._overlay);
            }
        }
        this._overlay = null;
        this._onSave = null;
        this._currentData = null;
    }

    private _createOverlay(): void {
        this._overlay = document.createElement('div');
        this._overlay.className = 'alert-edit-dialog-overlay';

        // Close on click outside (B-9)
        this._overlayClickHandler = (e: MouseEvent) => {
            if (e.target === this._overlay) {
                this.hide();
            }
        };
        this._overlay.addEventListener('click', this._overlayClickHandler);

        const dialog = document.createElement('div');
        dialog.className = 'alert-edit-dialog';
        this._overlay.appendChild(dialog);

        // Header
        const header = document.createElement('div');
        header.className = 'alert-edit-dialog-header';

        const title = document.createElement('h2');
        title.className = 'alert-edit-dialog-title';
        title.textContent = `Edit alert on ${this._currentData?.symbol || ''}`;
        header.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'alert-edit-dialog-close';
        closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><path fill="currentColor" d="M9 7.586L14.293 2.293l1.414 1.414L10.414 9l5.293 5.293-1.414 1.414L9 10.414l-5.293 5.293-1.414-1.414L7.586 9 2.293 3.707l1.414-1.414L9 7.586z"/></svg>';
        closeBtn.addEventListener('click', () => this.hide());
        header.appendChild(closeBtn);

        dialog.appendChild(header);

        // Content
        const content = document.createElement('div');
        content.className = 'alert-edit-dialog-content';

        // Condition Dropdown
        const conditionGroup = document.createElement('div');
        conditionGroup.className = 'alert-edit-form-group';
        const conditionLabel = document.createElement('label');
        conditionLabel.className = 'alert-edit-label';
        conditionLabel.textContent = 'Condition';
        conditionGroup.appendChild(conditionLabel);

        const conditionSelect = document.createElement('select');
        conditionSelect.className = 'alert-edit-select';

        const allOptions: { value: AlertCondition, label: string }[] = [
            { value: 'crossing', label: 'Crossing' },
            { value: 'crossing_up', label: 'Crossing Up' },
            { value: 'crossing_down', label: 'Crossing Down' },
            { value: 'entering', label: 'Entering' },
            { value: 'exiting', label: 'Exiting' },
            { value: 'inside', label: 'Inside' },
            { value: 'outside', label: 'Outside' }
        ];

        let options = allOptions;
        if (this._currentData?.toolType === 'vertical') {
            options = allOptions.filter(o => o.value === 'crossing');
        } else if (this._currentData?.toolType === 'shape') {
            options = allOptions.filter(o => ['entering', 'exiting', 'inside', 'outside'].includes(o.value));
        } else {
            // Default line tools
            options = allOptions.filter(o => ['crossing', 'crossing_up', 'crossing_down'].includes(o.value));
        }

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            if (opt.value === this._currentData?.condition) {
                option.selected = true;
            }
            conditionSelect.appendChild(option);
        });
        conditionGroup.appendChild(conditionSelect);
        content.appendChild(conditionGroup);

        // Price Input
        let priceInput: HTMLInputElement | null = null;
        if (!this._currentData?.isTrendline) {
            const priceGroup = document.createElement('div');
            priceGroup.className = 'alert-edit-form-group';
            const priceLabel = document.createElement('label');
            priceLabel.className = 'alert-edit-label';
            priceLabel.textContent = 'Value';
            priceGroup.appendChild(priceLabel);

            priceInput = document.createElement('input');
            priceInput.className = 'alert-edit-input';
            priceInput.type = 'number';
            priceInput.step = '0.01';
            priceInput.value = this._currentData?.price.toFixed(2) || '';
            priceGroup.appendChild(priceInput);
            content.appendChild(priceGroup);
        }

        dialog.appendChild(content);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'alert-edit-dialog-footer';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'alert-edit-btn alert-edit-btn-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => this.hide());
        footer.appendChild(cancelBtn);

        const saveBtn = document.createElement('button');
        saveBtn.className = 'alert-edit-btn alert-edit-btn-save';
        saveBtn.textContent = 'Save';
        saveBtn.addEventListener('click', () => {
            if (this._onSave && this._currentData) {
                this._onSave({
                    ...this._currentData,
                    condition: conditionSelect.value as any,
                    price: priceInput ? parseFloat(priceInput.value) : this._currentData.price
                });
            }
            this.hide();
        });
        footer.appendChild(saveBtn);

        dialog.appendChild(footer);
    }
}
