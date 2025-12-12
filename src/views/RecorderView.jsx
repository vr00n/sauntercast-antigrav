import React, { useEffect, useState } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import { MapDisplay } from '../components/MapDisplay';
import { Mic, Square, Save, MessageSquare, MapPin } from 'lucide-react';
import { saveRecording } from '../utils/storage';
import { useNavigate } from 'react-router-dom';

export const RecorderView = () => {
    const {
        isRecording,
        duration,
        locations,
        annotations,
        audioBlob,
        startRecording,
        stopRecording,
        addAnnotation,
        startTime
    } = useRecorder();

    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSave = async () => {
        if (!audioBlob) return;
        setIsSaving(true);
        const recording = {
            id: crypto.randomUUID(),
            startTime,
            duration,
            locations,
            annotations,
            audioBlob,
            createdAt: new Date(),
        };
        await saveRecording(recording);
        setIsSaving(false);
        navigate('/');
    };

    const currentLocation = locations.length > 0 ? locations[locations.length - 1] : null;

    return (
        <div className="flex flex-col h-screen bg-white">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-white z-10">
                <button onClick={() => navigate('/')} className="text-blue-500">Back</button>
                <div className="font-mono text-xl font-medium">{formatTime(duration)}</div>
                <div className="w-10"></div> {/* Spacer */}
            </div>

            {/* Main Content */}
            <div className="flex-1 relative bg-gray-50">
                {isRecording || locations.length > 0 ? (
                    <div className="absolute inset-0">
                        <MapDisplay
                            locations={locations}
                            currentLocation={currentLocation}
                            annotations={annotations}
                        />
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 border-2 border-dashed border-gray-200 m-4 rounded-xl">
                        <h2 className="text-xl font-semibold text-gray-600 mb-2">Ready to record</h2>
                        <p>Your path will appear here</p>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-6 bg-white border-t safe-area-bottom">
                {!audioBlob ? (
                    <div className="flex flex-col gap-4">
                        {isRecording && (
                            <div className="flex justify-center gap-8 mb-4">
                                <button
                                    onClick={() => addAnnotation('comment', 'Note')}
                                    className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition"
                                >
                                    <MessageSquare className="w-6 h-6 text-gray-700" />
                                </button>
                                <button
                                    onClick={() => addAnnotation('icon')}
                                    className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition"
                                >
                                    <MapPin className="w-6 h-6 text-gray-700" />
                                </button>
                            </div>
                        )}

                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${isRecording ? 'bg-gray-900' : 'bg-brand-red shadow-lg shadow-red-200'
                                }`}
                        >
                            {isRecording ? (
                                <>
                                    <Square className="w-5 h-5 fill-current" /> Stop Recording
                                </>
                            ) : (
                                <>
                                    <Mic className="w-5 h-5" /> Start Recording
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-4">
                        <button
                            onClick={() => window.location.reload()} // Simple reset
                            className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 py-3 rounded-xl font-bold text-white bg-brand-red flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" /> {isSaving ? 'Saving...' : 'Save Recording'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
