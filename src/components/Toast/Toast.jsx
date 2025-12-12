import React from 'react';
import PropTypes from 'prop-types';
import styles from './Toast.module.css';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const Toast = ({ message, type = 'error', onClose, action }) => {
    const icons = {
        error: <AlertCircle size={20} />,
        success: <CheckCircle size={20} />,
        info: <Info size={20} />,
        warning: <AlertTriangle size={20} />
    };

    return (
        <div className={`${styles.toast} ${styles[type]}`}>
            <div className={styles.icon}>{icons[type]}</div>
            <div className={styles.content}>
                <div className={styles.message}>{message}</div>
                {action && (
                    <button className={styles.actionBtn} onClick={action.onClick}>
                        {action.label}
                    </button>
                )}
            </div>
            <button className={styles.closeBtn} onClick={onClose}>
                <X size={16} />
            </button>
        </div>
    );
};

Toast.propTypes = {
    message: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['error', 'success', 'info', 'warning']),
    onClose: PropTypes.func.isRequired,
    action: PropTypes.shape({
        label: PropTypes.string.isRequired,
        onClick: PropTypes.func.isRequired
    })
};

export default Toast;
