import React, { useState } from 'react';
import { X, Globe, Lock, Share2, Copy, Check, Loader2 } from 'lucide-react';
import { publishSaunter } from '../utils/publish';

export const PublishModal = ({ recording, onClose }) => {
    const [isPublic, setIsPublic] = useState(true);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishedUrl, setPublishedUrl] = useState(null);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    const durationMinutes = Math.floor(recording.duration / 60);
    const canPublish = durationMinutes <= 30;

    const handlePublish = async () => {
        setError(null);

        // Validation
        if (!isPublic && !password) {
            setError('Password is required for private saunters');
            return;
        }

        if (!isPublic && password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsPublishing(true);

        try {
            const result = await publishSaunter(recording, {
                isPublic,
                password: isPublic ? null : password
            });

            setPublishedUrl(result.url);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsPublishing(false);
        }
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(publishedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (publishedUrl) {
        return (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-slide-up">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Published Successfully!</h2>
                        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                            <p className="text-sm text-green-800 mb-2">Your saunter link is ready!</p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={publishedUrl}
                                    readOnly
                                    className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-lg text-sm font-mono"
                                />
                                <button
                                    onClick={handleCopyUrl}
                                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    {copied ? <Check size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-sm text-blue-800">
                                <strong>Note:</strong> Shared links include your path and annotations, but not the audio recording (to keep links short and shareable).
                            </p>
                        </div>

                        {!isPublic && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <p className="text-sm text-amber-800">
                                    <Lock className="inline w-4 h-4 mr-1" />
                                    This saunter is password-protected. Share the password separately with your audience.
                                </p>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-slide-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Publish Saunter</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {!canPublish ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
                        <p className="text-sm text-red-800">
                            Only saunters up to 30 minutes can be published online. This saunter is {durationMinutes} minutes long.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-sm text-blue-800">
                                Share your {durationMinutes} minute saunter with the world or keep it private with a password.
                            </p>
                        </div>

                        {/* Privacy Options */}
                        <div className="space-y-3">
                            <label className="block">
                                <div
                                    onClick={() => setIsPublic(true)}
                                    className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${isPublic ? 'border-brand-red bg-red-50' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isPublic ? 'border-brand-red' : 'border-gray-300'
                                        }`}>
                                        {isPublic && <div className="w-3 h-3 rounded-full bg-brand-red" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Globe size={18} className="text-brand-red" />
                                            <span className="font-semibold text-gray-900">Public</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1">Anyone with the link can view</p>
                                    </div>
                                </div>
                            </label>

                            <label className="block">
                                <div
                                    onClick={() => setIsPublic(false)}
                                    className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${!isPublic ? 'border-brand-red bg-red-50' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!isPublic ? 'border-brand-red' : 'border-gray-300'
                                        }`}>
                                        {!isPublic && <div className="w-3 h-3 rounded-full bg-brand-red" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Lock size={18} className="text-gray-700" />
                                            <span className="font-semibold text-gray-900">Password Protected</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1">Encrypted with your password</p>
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* Password Fields */}
                        {!isPublic && (
                            <div className="space-y-3 pt-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-transparent"
                                        placeholder="Enter password"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-transparent"
                                        placeholder="Confirm password"
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        <button
                            onClick={handlePublish}
                            disabled={isPublishing}
                            className="w-full py-3 bg-brand-red text-white font-bold rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isPublishing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Publishing...
                                </>
                            ) : (
                                <>
                                    <Share2 className="w-5 h-5" />
                                    Publish Saunter
                                </>
                            )}
                        </button>

                        <p className="text-xs text-gray-500 text-center">
                            You can always save locally without publishing
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
