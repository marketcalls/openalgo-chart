import React, { useState } from 'react';

const ApiKeyDialog = ({ onSave, onClose }) => {
    const [apiKey, setApiKey] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!apiKey.trim()) {
            setError('Please enter your API key');
            return;
        }
        onSave(apiKey.trim());
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
                width: '400px',
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
                    Enter your OpenAlgo API key to connect. You can find your API key in the
                    <a
                        href="http://127.0.0.1:5000/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2962ff', marginLeft: '4px' }}
                    >
                        OpenAlgo Dashboard
                    </a>.
                </p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => {
                            setApiKey(e.target.value);
                            setError('');
                        }}
                        placeholder="Enter your API key"
                        autoFocus
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#131722',
                            border: error ? '1px solid #f23645' : '1px solid #363a45',
                            borderRadius: '4px',
                            color: '#d1d4dc',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                    {error && (
                        <p style={{
                            margin: '8px 0 0 0',
                            color: '#f23645',
                            fontSize: '12px'
                        }}>
                            {error}
                        </p>
                    )}

                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '20px',
                        justifyContent: 'flex-end'
                    }}>
                        <a
                            href="http://127.0.0.1:5000/auth/login"
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
