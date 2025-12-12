import React, { useState, useEffect } from 'react';
import styles from './SettingsPopup.module.css';
import { X, Eye, EyeOff } from 'lucide-react';
import { LOG_LEVELS, LOG_LEVEL_LABELS, getLogLevel, setLogLevel } from '../../utils/logger';

const SettingsPopup = ({
    isOpen,
    onClose,
    theme = 'dark',
    // Price Scale settings
    isTimerVisible = false,
    onTimerToggle,
    isSessionBreakVisible = false,
    onSessionBreakToggle,
    // OpenAlgo settings
    hostUrl = 'http://localhost:5000',
    onHostUrlSave,
    apiKey = '',
    onApiKeySave,
    websocketUrl = 'localhost:8765',
    onWebsocketUrlSave
}) => {
    // Logging state
    const [logLevel, setLocalLogLevel] = useState(getLogLevel);
    const [activeSection, setActiveSection] = useState('scales');
    const [localHostUrl, setLocalHostUrl] = useState(hostUrl);
    const [localApiKey, setLocalApiKey] = useState(apiKey);
    const [localWsUrl, setLocalWsUrl] = useState(websocketUrl);
    const [hasChanges, setHasChanges] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    // Sync local state with props
    useEffect(() => {
        setLocalHostUrl(hostUrl);
    }, [hostUrl]);

    useEffect(() => {
        setLocalApiKey(apiKey);
    }, [apiKey]);

    useEffect(() => {
        setLocalWsUrl(websocketUrl);
    }, [websocketUrl]);

    // Track changes
    useEffect(() => {
        const hasHostChange = localHostUrl !== hostUrl;
        const hasApiKeyChange = localApiKey !== apiKey;
        const hasWsUrlChange = localWsUrl !== websocketUrl;
        setHasChanges(hasHostChange || hasApiKeyChange || hasWsUrlChange);
    }, [localHostUrl, localApiKey, localWsUrl, hostUrl, apiKey, websocketUrl]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (localHostUrl !== hostUrl) {
            onHostUrlSave?.(localHostUrl);
        }
        if (localApiKey !== apiKey) {
            onApiKeySave?.(localApiKey);
        }
        if (localWsUrl !== websocketUrl) {
            onWebsocketUrlSave?.(localWsUrl);
        }
        onClose();
    };

    const handleCancel = () => {
        setLocalHostUrl(hostUrl);
        setLocalApiKey(apiKey);
        setLocalWsUrl(websocketUrl);
        onClose();
    };

    const sections = [
        {
            id: 'scales', label: 'Scales and lines', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="18" height="18" fill="none" stroke="currentColor">
                    <path d="M10.5 20.5a2 2 0 1 1-2-2m2 2a2 2 0 0 0-2-2m2 2h14m-16-2v-14m16 16L21 17m3.5 3.5L21 24M8.5 4.5L12 8M8.5 4.5L5 8"></path>
                </svg>
            )
        },
        {
            id: 'openalgo', label: 'OpenAlgo', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="18" height="18" fill="currentColor">
                    <path d="M14 5a2 2 0 0 0-2 2v2h4V7a2 2 0 0 0-2-2Zm3 4V7a3 3 0 1 0-6 0v2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-8 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-8Zm5 3a1 1 0 0 0-.5.13v-.13a.5.5 0 0 0-1 0v2.5a.5.5 0 0 0 1 0v-.13A1 1 0 1 0 14 14Z"></path>
                </svg>
            )
        },
        {
            id: 'logging', label: 'Logging', icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="18" height="18" fill="currentColor">
                    <path d="M4 6h20v2H4V6zm0 5h20v2H4v-2zm0 5h14v2H4v-2zm0 5h10v2H4v-2z"></path>
                </svg>
            )
        }
    ];

    return (
        <div className={styles.overlay} onClick={handleCancel}>
            <div className={`${styles.popup} ${theme === 'light' ? styles.light : ''}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>Settings</h2>
                    <button className={styles.closeButton} onClick={handleCancel}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {/* Sidebar */}
                    <div className={styles.sidebar}>
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                className={`${styles.sidebarItem} ${activeSection === section.id ? styles.active : ''}`}
                                onClick={() => setActiveSection(section.id)}
                            >
                                <span className={styles.sidebarIcon}>{section.icon}</span>
                                <span className={styles.sidebarLabel}>{section.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Main Content Area */}
                    <div className={styles.main}>
                        {activeSection === 'scales' && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>PRICE SCALE</h3>

                                <div className={styles.optionGroup}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={isTimerVisible}
                                            onChange={() => onTimerToggle?.()}
                                            className={styles.checkbox}
                                        />
                                        <span className={styles.checkmark}></span>
                                        <span>Countdown to bar close</span>
                                    </label>
                                </div>

                                <div className={styles.optionGroup}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={isSessionBreakVisible}
                                            onChange={() => onSessionBreakToggle?.()}
                                            className={styles.checkbox}
                                        />
                                        <span className={styles.checkmark}></span>
                                        <span>Session breaks</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeSection === 'openalgo' && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>OPENALGO CONNECTION</h3>

                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>Host URL</label>
                                    <input
                                        type="text"
                                        value={localHostUrl}
                                        onChange={(e) => setLocalHostUrl(e.target.value)}
                                        placeholder="http://localhost:5000"
                                        className={styles.input}
                                    />
                                    <p className={styles.inputHint}>
                                        Default: http://localhost:5000. Change to use a custom OpenAlgo server URL.
                                    </p>
                                </div>


                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>API Key</label>
                                    <div className={styles.inputWithIcon}>
                                        <input
                                            type={showApiKey ? "text" : "password"}
                                            value={localApiKey}
                                            onChange={(e) => setLocalApiKey(e.target.value)}
                                            placeholder="Enter your OpenAlgo API key"
                                            className={styles.input}
                                        />
                                        <button
                                            type="button"
                                            className={styles.eyeButton}
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            title={showApiKey ? "Hide API key" : "Show API key"}
                                        >
                                            {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <p className={styles.inputHint}>
                                        Find your API key in the{' '}
                                        <a
                                            href={`${localHostUrl}/apikey`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.link}
                                        >
                                            OpenAlgo Dashboard
                                        </a>
                                    </p>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>WebSocket URL</label>
                                    <input
                                        type="text"
                                        value={localWsUrl}
                                        onChange={(e) => setLocalWsUrl(e.target.value)}
                                        placeholder="localhost:8765"
                                        className={styles.input}
                                    />
                                    <p className={styles.inputHint}>
                                        Default: localhost:8765. Change to use a custom domain (e.g., openalgo.example.com:8765)
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeSection === 'logging' && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>CONSOLE LOGGING</h3>

                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>Log Level</label>
                                    <select
                                        value={logLevel}
                                        onChange={(e) => {
                                            const newLevel = parseInt(e.target.value, 10);
                                            setLocalLogLevel(newLevel);
                                            setLogLevel(newLevel);
                                        }}
                                        className={styles.select}
                                    >
                                        {Object.entries(LOG_LEVELS).map(([name, value]) => (
                                            <option key={name} value={value}>
                                                {LOG_LEVEL_LABELS[value]}
                                            </option>
                                        ))}
                                    </select>
                                    <p className={styles.inputHint}>
                                        Controls which messages appear in the browser console. Set to "Debug" for detailed troubleshooting.
                                    </p>
                                </div>

                                <div className={styles.optionGroup} style={{ marginTop: '16px' }}>
                                    <div className={styles.levelDescriptions}>
                                        <p><strong>Debug:</strong> All messages including detailed tracing</p>
                                        <p><strong>Info:</strong> General information and above</p>
                                        <p><strong>Warnings:</strong> Warnings and errors only</p>
                                        <p><strong>Errors:</strong> Only error messages</p>
                                        <p><strong>None:</strong> Silent mode - no console output</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button className={styles.cancelButton} onClick={handleCancel}>
                        Cancel
                    </button>
                    <button
                        className={styles.okButton}
                        onClick={handleSave}
                    >
                        Ok
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPopup;
