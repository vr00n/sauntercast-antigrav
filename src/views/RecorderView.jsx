import React, { useEffect, useState } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import { MapDisplay } from '../components/MapDisplay';
import { StatsDisplay } from '../components/StatsDisplay';
import { Mic, Square, Save, Plus, MapPin, X, MessageSquare, Star, Flag, AlertTriangle, Gauge, Globe } from 'lucide-react';
import { saveRecording } from '../utils/storage';
import { useNavigate } from 'react-router-dom';
import { APP_VERSION } from '../utils/version';
import { PublishModal } from '../components/PublishModal';

export const RecorderView = () => {
    const {
        isRecording,
        isPaused,
        duration,
        locations,
        annotations,
        audioBlob,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        addAnnotation,
        startTime
    } = useRecorder();

    const [isSaving, setIsSaving] = useState(false);
    const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [savedRecording, setSavedRecording] = useState(null);
    const [pendingAnnotation, setPendingAnnotation] = useState(null);
    const [annotationText, setAnnotationText] = useState('');
    const [annotationImage, setAnnotationImage] = useState(null);
    const [selectedIcon, setSelectedIcon] = useState('comment');

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

        // Save locally first
        await saveRecording(recording);
        setSavedRecording(recording);
        setIsSaving(false);

        // Show publish option
        setShowPublishModal(true);
    };

    const handlePublishComplete = () => {
        setShowPublishModal(false);
        navigate('/');
    };

    const handleStartAnnotation = () => {
        if (!isRecording) return;
        // Capture context AT THE MOMENT of clicking "Add"
        setPendingAnnotation({
            timestamp: Date.now() - startTime
        });
        setAnnotationText('');
        setAnnotationImage(null);
        setSelectedIcon('comment');
        setIsAnnotationModalOpen(true);
    };

    const handleSaveAnnotation = () => {
        if (pendingAnnotation) {
            addAnnotation(selectedIcon, annotationText, pendingAnnotation.timestamp, annotationImage);
        }
        setIsAnnotationModalOpen(false);
        setPendingAnnotation(null);
        setAnnotationImage(null);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAnnotationImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const currentLocation = locations.length > 0 ? locations[locations.length - 1] : null;

    return (
        <div className="flex flex-col h-[100dvh] bg-white overflow-hidden relative">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-white z-10">
                <button onClick={() => navigate('/')} className="text-blue-500">Back</button>
                <div className="font-mono text-xl font-medium flex items-center gap-2">
                    {isPaused && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">PAUSED</span>}
                    {formatTime(duration)}
                </div>
                <div className="text-[10px] text-gray-300 font-mono absolute right-4 top-1">{APP_VERSION}</div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative bg-gray-50">
                {isRecording || locations.length > 0 ? (
                    <div className="absolute inset-0">
                        {/* Stats Toggle Button */}
                        <div className="absolute top-4 left-4 z-[1000] pointer-events-auto">
                            <button
                                onClick={() => setShowStats(!showStats)}
                                className={`p-2 rounded-full shadow-lg border transition-all ${showStats ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-100 hover:text-gray-900'}`}
                            >
                                <Gauge size={16} />
                            </button>
                        </div>

                        {showStats && <StatsDisplay recording={{ locations }} currentLocation={currentLocation} isLive={true} />}

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

            {/* Annotation Modal */}
            {isAnnotationModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-4 flex flex-col gap-4 animate-slide-up">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-lg">Add Note</h3>
                            <button onClick={() => setIsAnnotationModalOpen(false)} className="p-1 text-gray-400">
                                <X size={24} />
                            </button>
                        </div>

                        <textarea
                            className="w-full h-24 p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-brand-red resize-none text-base"
                            placeholder="What's happening here?"
                            value={annotationText}
                            onChange={(e) => setAnnotationText(e.target.value)}
                            autoFocus
                        />

                        {/* Image Upload */}
                        <div>
                            {annotationImage ? (
                                <div className="relative">
                                    <img src={annotationImage} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                                    <button
                                        onClick={() => setAnnotationImage(null)}
                                        className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                                    <div className="p-2 bg-gray-200 rounded-lg text-gray-500">
                                        <Plus size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-600">Add Photo</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            )}
                        </div>

                        <div className="flex justify-between gap-2 overflow-x-auto pb-2">
                            {[
                                { id: 'comment', icon: MessageSquare, label: 'Note' },
                                { id: 'map-pin', icon: MapPin, label: 'Pin' },
                                { id: 'star', icon: Star, label: 'Star', color: 'text-yellow-500' },
                                { id: 'flag', icon: Flag, label: 'Flag', color: 'text-orange-500' },
                                { id: 'alert', icon: AlertTriangle, label: 'Alert', color: 'text-red-500' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedIcon(item.id)}
                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl min-w-[70px] transition-all ${selectedIcon === item.id
                                        ? 'bg-gray-900 text-white shadow-lg'
                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                        }`}
                                >
                                    <item.icon size={24} className={selectedIcon === item.id ? 'text-white' : item.color || ''} />
                                    <span className="text-xs font-medium">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleSaveAnnotation}
                            className="w-full py-3 bg-brand-red text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
                        >
                            Save Note
                        </button>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="p-6 bg-white border-t safe-area-bottom">
                {!audioBlob ? (
                    <div className="flex flex-col gap-4">
                        {isRecording && (
                            <div className="flex justify-between items-center gap-4 mb-2">
                                <button
                                    onClick={handleStartAnnotation}
                                    className="px-6 py-3 bg-white border border-gray-200 shadow-sm rounded-full flex items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all text-gray-700 font-medium"
                                >
                                    <Plus className="w-5 h-5 text-brand-red" />
                                    Add Note
                                </button>

                                <button
                                    onClick={isPaused ? resumeRecording : pauseRecording}
                                    className={`px-6 py-3 border shadow-sm rounded-full flex items-center gap-2 active:scale-95 transition-all font-medium ${isPaused
                                            ? 'bg-brand-red text-white border-brand-red'
                                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {isPaused ? (
                                        <>Resume</>
                                    ) : (
                                        <>Pause</>
                                    )}
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

            {/* Publish Modal */}
            {showPublishModal && savedRecording && (
                <PublishModal
                    recording={savedRecording}
                    onClose={handlePublishComplete}
                />
            )}
        </div>
    );
};
