import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchPublishedSaunter } from '../utils/publish';
import { PlayerView } from './PlayerView';
import { Lock, Loader2 } from 'lucide-react';

export const ViewPublishedView = () => {
    const [searchParams] = useSearchParams();
    const dataParam = searchParams.get('data');

    const [recording, setRecording] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [needsPassword, setNeedsPassword] = useState(false);
    const [password, setPassword] = useState('');
    const [attempting, setAttempting] = useState(false);

    useEffect(() => {
        if (dataParam) {
            loadSaunter();
        } else {
            setError('No saunter data found in URL');
            setLoading(false);
        }
    }, [dataParam]);

    const loadSaunter = async (pwd = null) => {
        setLoading(true);
        setError(null);
        setAttempting(!!pwd);

        try {
            const data = await fetchPublishedSaunter(dataParam, pwd);
            setRecording(data);
            setNeedsPassword(false);
        } catch (err) {
            if (err.message === 'PASSWORD_REQUIRED') {
                setNeedsPassword(true);
            } else if (err.message.includes('Decryption failed')) {
                setError('Incorrect password. Please try again.');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
            setAttempting(false);
        }
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (password) {
            loadSaunter(password);
        }
    };

    if (loading && !attempting) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-brand-red mx-auto mb-4" />
                    <p className="text-gray-600">Loading saunter...</p>
                </div>
            </div>
        );
    }

    if (needsPassword) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                            <Lock className="w-8 h-8 text-amber-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Protected</h1>
                        <p className="text-gray-600">This saunter is private. Enter the password to view.</p>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-transparent"
                                placeholder="Enter password"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={attempting || !password}
                            className="w-full py-3 bg-brand-red text-white font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {attempting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Unlocking...
                                </>
                            ) : (
                                'Unlock Saunter'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (error && !needsPassword) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">😕</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Share Link</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <a
                        href="/#/"
                        className="inline-block px-6 py-3 bg-brand-red text-white font-bold rounded-xl hover:brightness-110 transition-all"
                    >
                        Go Home
                    </a>
                </div>
            </div>
        );
    }

    if (recording) {
        // Note: Audio won't be available in shared saunters
        return (
            <div>
                <div className="bg-amber-50 border-b border-amber-200 p-3 text-center">
                    <p className="text-sm text-amber-800">
                        <strong>Note:</strong> Audio is not included in shared links (path and annotations only)
                    </p>
                </div>
                <PlayerView initialRecording={recording} />
            </div>
        );
    }

    return null;
};
