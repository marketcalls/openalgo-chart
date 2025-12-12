import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const DEFAULT_HOST = 'http://127.0.0.1:5000';

const ApiKeyDialog = ({ onSave, onClose }) => {
    const [hostUrl, setHostUrl] = useState(() => {
        return localStorage.getItem('oa_host_url') || DEFAULT_HOST;
    });
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!apiKey.trim()) {
            setError('Please enter your API key');
            return;
        }
        // Save host URL to localStorage
        localStorage.setItem('oa_host_url', hostUrl);
        onSave(apiKey.trim());
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        backgroundColor: '#131722',
        border: '1px solid #363a45',
        borderRadius: '4px',
        color: '#d1d4dc',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box'
    };

    const labelStyle = {
        display: 'block',
        color: '#d1d4dc',
        fontSize: '13px',
        marginBottom: '8px',
        fontWeight: 500
    };

    const hintStyle = {
        margin: '6px 0 0 0',
        color: '#787b86',
        fontSize: '11px',
        lineHeight: 1.4
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000
        }}>
            <div style={{
                backgroundColor: '#1e222d',
                borderRadius: '8px',
                padding: '24px',
                width: '420px',
                maxWidth: '90%',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)'
            }}>
                <h2 style={{
                    margin: '0 0 8px 0',
                    color: '#d1d4dc',
                    fontSize: '18px',
                    fontWeight: 500
                }}>
                    Connect to OpenAlgo
                </h2>
                <p style={{
                    margin: '0 0 20px 0',
                    color: '#787b86',
                    fontSize: '13px',
                    lineHeight: 1.5
                }}>
                    Configure your OpenAlgo server connection.
                </p>

                <form onSubmit={handleSubmit}>
                    {/* Host URL Field */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Host URL</label>
                        <input
                            type="text"
                            value={hostUrl}
                            onChange={(e) => setHostUrl(e.target.value)}
                            placeholder="http://127.0.0.1:5000"
                            style={inputStyle}
                        />
                        <p style={hintStyle}>
                            Default: http://127.0.0.1:5000
                        </p>
                    </div>

                    {/* API Key Field */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>API Key</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                type={showApiKey ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => {
                                    setApiKey(e.target.value);
                                    setError('');
                                }}
                                placeholder="Enter your API key"
                                autoFocus
                                style={{
                                    ...inputStyle,
                                    paddingRight: '40px',
                                    border: error ? '1px solid #f23645' : '1px solid #363a45'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                title={showApiKey ? "Hide API key" : "Show API key"}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'none',
                                    border: 'none',
                                    color: '#787b86',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '4px'
                                }}
                            >
                                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {error && (
                            <p style={{
                                margin: '8px 0 0 0',
                                color: '#f23645',
                                fontSize: '12px'
                            }}>
                                {error}
                            </p>
                        )}
                        <p style={hintStyle}>
                            Find your API key in the{' '}
                            <a
                                href={`${hostUrl}/apikey`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#2962ff' }}
                            >
                                OpenAlgo Dashboard
                            </a>
                        </p>
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '20px',
                        justifyContent: 'flex-end'
                    }}>
                        <a
                            href={`${hostUrl}/auth/login`}
                            style={{
                                padding: '10px 16px',
                                backgroundColor: 'transparent',
                                border: '1px solid #363a45',
                                borderRadius: '4px',
                                color: '#787b86',
                                fontSize: '14px',
                                cursor: 'pointer',
                                textDecoration: 'none'
                            }}
                        >
                            Login to OpenAlgo
                        </a>
                        <button
                            type="submit"
                            style={{
                                padding: '10px 24px',
                                backgroundColor: '#2962ff',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#fff',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            Connect
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApiKeyDialog;
