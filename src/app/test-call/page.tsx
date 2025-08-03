'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function TestCallPage() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const initiateCall = async () => {
        if (!phoneNumber) {
            setError('Please enter a phone number');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/twilio/initiate-call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ to: phoneNumber }),
            });

            const data = await response.json();

            if (data.success) {
                setResult(data);
            } else {
                setError(data.error || 'Failed to initiate call');
            }
        } catch (err) {
            setError('Network error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const getAnalytics = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/twilio/analytics');
            const data = await response.json();

            if (data.success) {
                setResult(data);
            } else {
                setError(data.error || 'Failed to get analytics');
            }
        } catch (err) {
            setError('Network error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <h1>AI Call System Test</h1>

            <div className={styles.section}>
                <h2>Initiate a Call</h2>
                <div className={styles.form}>
                    <label htmlFor="phoneNumber">Phone Number:</label>
                    <input
                        id="phoneNumber"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1234567890"
                        className={styles.input}
                    />
                    <button
                        onClick={initiateCall}
                        disabled={isLoading}
                        className={styles.button}
                    >
                        {isLoading ? 'Initiating...' : 'Start Call'}
                    </button>
                </div>
            </div>

            <div className={styles.section}>
                <h2>Analytics</h2>
                <button
                    onClick={getAnalytics}
                    disabled={isLoading}
                    className={styles.button}
                >
                    {isLoading ? 'Loading...' : 'Get Analytics'}
                </button>
            </div>

            {error && (
                <div className={styles.error}>
                    <h3>Error:</h3>
                    <p>{error}</p>
                </div>
            )}

            {result && (
                <div className={styles.result}>
                    <h3>Result:</h3>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}

            <div className={styles.info}>
                <h3>How it works:</h3>
                <ol>
                    <li>Enter a phone number in international format (e.g., +1234567890)</li>
                    <li>Click "Start Call" to initiate an AI-powered call</li>
                    <li>The AI will greet the caller and handle their requests</li>
                    <li>Use "Get Analytics" to see active calls and system status</li>
                </ol>

                <h3>Environment Setup Required:</h3>
                <ul>
                    <li>TWILIO_ACCOUNT_SID - Your Twilio Account SID</li>
                    <li>TWILIO_AUTH_TOKEN - Your Twilio Auth Token</li>
                    <li>TWILIO_PHONE_NUMBER - Your Twilio phone number</li>
                    <li>OPENAI_API_KEY - Your OpenAI API key</li>
                    <li>NEXT_PUBLIC_BASE_URL - Your app's base URL (for webhooks)</li>
                </ul>
            </div>
        </div>
    );
} 