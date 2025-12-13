import React, { useState, useEffect, useCallback } from 'react';
import styles from './AlertDialog.module.css';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useKeyboardNav } from '../../hooks/useKeyboardNav';

const AlertDialog = ({ isOpen, onClose, onSave, initialPrice, theme = 'dark' }) => {
    const [condition, setCondition] = useState('Crossing');
    const [value, setValue] = useState('');

    // Handle close
    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    // Focus trap for accessibility
    const focusTrapRef = useFocusTrap(isOpen);

    // Escape key to close
    useKeyboardNav({
        enabled: isOpen,
        onEscape: handleClose,
    });

    useEffect(() => {
        if (isOpen && initialPrice) {
            setValue(initialPrice.toString());
        }
    }, [isOpen, initialPrice]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({ condition, value });
        onClose();
    };

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div
                ref={focusTrapRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="alert-dialog-title"
                className={styles.dialog}
                onClick={e => e.stopPropagation()}
            >
                <div className={styles.header}>
                    <h2 id="alert-dialog-title" className={styles.title}>Edit alert on</h2>
                    <button
                        className={styles.closeButton}
                        onClick={handleClose}
                        aria-label="Close alert dialog"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className={styles.content}>
                    <div className={styles.field}>
                        <label htmlFor="alert-condition" className={styles.label}>Condition</label>
                        <select
                            id="alert-condition"
                            className={styles.select}
                            value={condition}
                            onChange={(e) => setCondition(e.target.value)}
                        >
                            <option value="Crossing">Crossing</option>
                            <option value="Crossing Up">Crossing Up</option>
                            <option value="Crossing Down">Crossing Down</option>
                            <option value="Greater Than">Greater Than</option>
                            <option value="Less Than">Less Than</option>
                        </select>
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="alert-value" className={styles.label}>Value</label>
                        <input
                            id="alert-value"
                            type="number"
                            className={styles.input}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                        />
                    </div>
                </div>
                <div className={styles.footer}>
                    <button className={`${styles.button} ${styles.cancelButton}`} onClick={handleClose}>
                        Cancel
                    </button>
                    <button
                        className={`${styles.button} ${styles.saveButton}`}
                        onClick={handleSave}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertDialog;
