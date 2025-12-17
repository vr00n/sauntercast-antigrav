import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecording, saveRecording } from '../utils/storage';
import { MapDisplay } from '../components/MapDisplay';
import { Play, Pause, SkipBack, SkipForward, X, Share2, Info, FileText, Loader2, Gauge, Plus, MessageSquare, MapPin, Star, Flag, AlertTriangle } from 'lucide-react';
import { APP_VERSION } from '../utils/version';
import { exportRecording } from '../utils/exportImport';
import { useTranscriber } from '../hooks/useTranscriber';
import { StatsDisplay } from '../components/StatsDisplay';

export const PlayerView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [recording, setRecording] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0); // Source of truth for duration
    const [currentLocation, setCurrentLocation] = useState(null);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showTranscript, setShowTranscript] = useState(false);
    const [showStats, setShowStats] = useState(false);

    // Annotation State
    const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false);
    const [annotationText, setAnnotationText] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('comment');
    const [playbackPausedTime, setPlaybackPausedTime] = useState(null);

    const audioRef = useRef(null);
    const animationRef = useRef(null);

    // Transcription Hook
    const { transcribe, status: transcriberStatus, progress: transcriberProgress, result: transcriptionResult } = useTranscriber();

    useEffect(() => {
        const load = async () => {
            console.log("Loading recording:", id);
            try {
                const rec = await getRecording(id);
                if (rec) {
                    console.log("Recording loaded:", rec);
                    setRecording(rec);
                    // Initial fallback duration from recording data, but Audio element will override
                    setDuration(rec.duration || 0);
                } else {
                    console.error("Recording not found for id:", id);
                }
            } catch (err) {
                console.error("Error loading recording:", err);
            }
        };
        load();
    }, [id]);

    // Handle saving transcript when completed
    useEffect(() => {
        if (transcriberStatus === 'complete' && transcriptionResult && recording) {
            const saveTranscript = async () => {
                const updatedRecording = {
                    ...recording,
                    transcription: transcriptionResult
                };
                await saveRecording(updatedRecording);
                setRecording(updatedRecording);
            };
            saveTranscript();
        }
    }, [transcriberStatus, transcriptionResult]);

    // Set audio source when recording is loaded and ref is available
    useEffect(() => {
        if (recording && audioRef.current) {
            const url = URL.createObjectURL(recording.audioBlob);
            console.log("Setting audio src:", url);
            audioRef.current.src = url;

            // Cleanup
            return () => {
                URL.revokeObjectURL(url);
            };
        }
    }, [recording]);

    // Sync loop
    useEffect(() => {
        const sync = () => {
            if (audioRef.current && recording) {
                const time = audioRef.current.currentTime * 1000; // ms
                setCurrentTime(audioRef.current.currentTime);

                // Find location at this time
                const loc = recording.locations.find(l => l.timestamp >= time);
                if (loc) {
                    setCurrentLocation(loc);
                }

                if (!audioRef.current.paused) {
                    animationRef.current = requestAnimationFrame(sync);
                }
            }
        };

        if (isPlaying) {
            animationRef.current = requestAnimationFrame(sync);
        } else {
            cancelAnimationFrame(animationRef.current);
        }

        return () => cancelAnimationFrame(animationRef.current);
    }, [isPlaying, recording]);

    const togglePlay = async () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            try {
                await audio.play();
                setIsPlaying(true);
            } catch (err) {
                console.error("Playback failed:", err);
                setIsPlaying(false);
            }
        }
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleMapClick = (latlng) => {
        if (!recording) return;

        // Find closest point
        let minDist = Infinity;
        let closestPoint = null;

        recording.locations.forEach(loc => {
            const d = Math.sqrt(Math.pow(loc.lat - latlng.lat, 2) + Math.pow(loc.lng - latlng.lng, 2));
            if (d < minDist) {
                minDist = d;
                closestPoint = loc;
            }
        });

        if (closestPoint && audioRef.current) {
            const newTime = closestPoint.timestamp / 1000;
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
            setCurrentLocation(closestPoint);
        }
    };

    const handleTranscribe = () => {
        if (recording && recording.audioBlob) {
            setShowTranscript(true);
            transcribe(recording.audioBlob);
        }
    };

    const jumpToTime = (timestamp) => {
        const time = timestamp;
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleAddAnnotation = () => {
        // Pause playback
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
        setPlaybackPausedTime(currentTime * 1000); // ms
        setAnnotationText('');
        setSelectedIcon('comment');
        setIsAnnotationModalOpen(true);
    };

    const handleSaveAnnotation = async () => {
        if (!recording) return;

        const newAnnotation = {
            id: crypto.randomUUID(),
            timestamp: playbackPausedTime,
            type: selectedIcon,
            text: annotationText,
            location: currentLocation
        };

        const updatedRecording = {
            ...recording,
            annotations: [...(recording.annotations || []), newAnnotation]
        };

        setRecording(updatedRecording);
        await saveRecording(updatedRecording);
        setIsAnnotationModalOpen(false);
    };

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!recording) return <div className="p-8 text-center">Loading...</div>;

    // Has transcription?
    const hasTranscript = recording.transcription && recording.transcription.text;
    const isTranscribing = ['downloading', 'loading', 'processing', 'starting'].includes(transcriberStatus);

    return (
        <div className="flex flex-col h-[100dvh] bg-white overflow-hidden">
            <audio
                key={recording.id}
                ref={audioRef}
                onEnded={() => {
                    setIsPlaying(false);
                }}
                onLoadedMetadata={(e) => {
                    if (e.target.duration && e.target.duration !== Infinity) {
                        setDuration(e.target.duration);
                        console.log("Corrected duration from metadata:", e.target.duration);
                    }
                }}
                playbackRate={playbackRate}
                playsInline
            />

            {/* Map Area */}
            <div className={`relative w-full transition-all duration-300 ${showTranscript ? 'h-1/2' : 'flex-1 h-full'} min-h-0`}>
                <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
                    <div className="bg-white/80 backdrop-blur p-1 px-2 rounded text-[10px] text-gray-500 font-mono">
                        {APP_VERSION}
                    </div>
                </div>

                {/* Stats Toggle Button */}
                <div className="absolute top-4 left-4 z-[1000] pointer-events-auto">
                    <button
                        onClick={() => setShowStats(!showStats)}
                        className={`p-2 rounded-full shadow-lg border transition-all ${showStats ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-100 hover:text-gray-900'}`}
                    >
                        <Gauge size={16} />
                    </button>
                </div>

                {showStats && <StatsDisplay recording={recording} currentLocation={currentLocation} currentTime={currentTime} isLive={false} />}

                <div className="absolute inset-0">
                    <MapDisplay
                        locations={recording.locations}
                        currentLocation={currentLocation}
                        annotations={recording.annotations}
                        onMapClick={handleMapClick}
                    />
                </div>

                {/* Annotation Modal */}
                {isAnnotationModalOpen && (
                    <div className="absolute inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in pointer-events-auto">
                        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-4 flex flex-col gap-4 animate-slide-up">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-lg">Add Note at {formatTime(playbackPausedTime / 1000)}</h3>
                                <button onClick={() => setIsAnnotationModalOpen(false)} className="p-1 text-gray-400">
                                    <X size={24} />
                                </button>
                            </div>

                            <textarea
                                className="w-full h-24 p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-brand-red resize-none text-base"
                                placeholder="What's notable about this moment?"
                                value={annotationText}
                                onChange={(e) => setAnnotationText(e.target.value)}
                                autoFocus
                            />

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
            </div>

            {/* Transcript Area */}
            {showTranscript && (
                <div className="flex-1 bg-white border-t overflow-y-auto p-4 animate-slide-up">
                    <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 border-b">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <FileText size={18} />
                            Transcript
                        </h3>
                        <button onClick={() => setShowTranscript(false)} className="text-gray-400">
                            <X size={18} />
                        </button>
                    </div>

                    {isTranscribing && (
                        <div className="flex flex-col items-center justify-center h-40 gap-4 text-gray-500">
                            <Loader2 className="animate-spin w-8 h-8 text-brand-red" />
                            <div className="text-center text-sm">
                                {transcriberStatus === 'downloading' && `Downloading AI Model (${Math.round(transcriberProgress)}%)...`}
                                {transcriberStatus === 'loading' && 'Initializing AI...'}
                                {transcriberStatus === 'processing' && 'Transcribing audio...'}
                                {transcriberStatus === 'starting' && 'Preparing audio...'}
                            </div>
                            {transcriberStatus === 'downloading' && (
                                <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-red transition-all" style={{ width: `${transcriberProgress}%` }} />
                                </div>
                            )}
                        </div>
                    )}

                    {recording.transcription && recording.transcription.chunks && (
                        <div className="space-y-4">
                            {recording.transcription.chunks.map((chunk, i) => {
                                // Highlight current chunk
                                const isActive = currentTime >= chunk.timestamp[0] && currentTime <= chunk.timestamp[1];
                                return (
                                    <div
                                        key={i}
                                        onClick={() => jumpToTime(chunk.timestamp[0])}
                                        className={`p-2 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-red-50 border-l-2 border-brand-red' : 'hover:bg-gray-50'}`}
                                    >
                                        <span className="text-xs font-mono text-gray-400 block mb-1">
                                            {formatTime(chunk.timestamp[0])}
                                        </span>
                                        <p className={`text-sm ${isActive ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                            {chunk.text}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Fallback if chunks are missing but text exists */}
                    {recording.transcription && !recording.transcription.chunks && recording.transcription.text && (
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                            {recording.transcription.text}
                        </p>
                    )}
                </div>
            )}

            {/* Player Controls */}
            <div className="bg-white border-t p-4 safe-area-bottom shadow-xl z-20">
                {/* Progress Bar */}
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-mono text-gray-500 w-10">{formatTime(currentTime)}</span>
                    <input
                        type="range"
                        min="0"
                        max={duration}
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-red"
                    />
                    <span className="text-xs font-mono text-gray-500 w-10">{formatTime(duration)}</span>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate('/')} className="p-2 text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-6">
                        <button onClick={() => {
                            if (audioRef.current) audioRef.current.currentTime -= 15;
                        }} className="text-gray-400 hover:text-gray-600">
                            <SkipBack className="w-6 h-6" />
                        </button>

                        <button
                            onClick={togglePlay}
                            className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg"
                        >
                            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                        </button>

                        <button onClick={() => {
                            if (audioRef.current) audioRef.current.currentTime += 15;
                        }} className="text-gray-400 hover:text-gray-600">
                            <SkipForward className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* New Add Annotation Button */}
                        <button
                            onClick={handleAddAnnotation}
                            className="p-2 text-gray-400 hover:text-gray-600 active:text-brand-red active:scale-95 transition-all"
                            title="Add Note"
                        >
                            <Plus className="w-5 h-5" />
                        </button>

                        {/* Transcribe Button */}
                        <button
                            onClick={() => {
                                if (hasTranscript) {
                                    setShowTranscript(!showTranscript);
                                } else {
                                    handleTranscribe();
                                }
                            }}
                            className={`p-2 transition-all ${(showTranscript || hasTranscript) ? 'text-brand-red' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            title={hasTranscript ? "View Transcript" : "Transcribe"}
                        >
                            <FileText className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => exportRecording(recording)}
                            className="p-2 text-gray-400 hover:text-gray-600 active:text-brand-red active:scale-95 transition-all"
                            title="Export Recording"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
