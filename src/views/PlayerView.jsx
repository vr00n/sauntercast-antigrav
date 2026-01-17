import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecording, saveRecording } from '../utils/storage';
import { MapDisplay } from '../components/MapDisplay';
import { Play, Pause, SkipBack, SkipForward, X, Share2, Info, FileText, Loader2, Gauge, Plus, MessageSquare, MapPin, Star, Flag, AlertTriangle, Camera, Map as MapIcon, List } from 'lucide-react';
import { APP_VERSION } from '../utils/version';
import { exportRecording } from '../utils/exportImport';
import { useTranscriber } from '../hooks/useTranscriber';
import { StatsDisplay } from '../components/StatsDisplay';

export const PlayerView = ({ initialRecording = null }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [recording, setRecording] = useState(initialRecording);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showTranscript, setShowTranscript] = useState(false);
    const [showStats, setShowStats] = useState(false);

    // Sidebar & Responsive State
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showFeed, setShowFeed] = useState(window.innerWidth >= 768);
    const [sidebarWidth, setSidebarWidth] = useState(400);
    const sidebarRef = useRef(null);
    const isResizingRef = useRef(false);

    // Annotation State
    const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false);
    const [annotationText, setAnnotationText] = useState('');
    const [annotationImage, setAnnotationImage] = useState(null);
    const [selectedIcon, setSelectedIcon] = useState('comment');
    const [playbackPausedTime, setPlaybackPausedTime] = useState(null);

    // Refs
    const audioRef = useRef(null);
    const animationRef = useRef(null);
    const feedItemRefs = useRef({});

    // Transcription Hook
    const { transcribe, status: transcriberStatus, progress: transcriberProgress, result: transcriptionResult } = useTranscriber();

    // Resize Listener
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // If window grows to desktop, show feed if it was hidden
            if (!mobile && window.innerWidth >= 768) {
                setShowFeed(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load Recording
    useEffect(() => {
        if (initialRecording) {
            setRecording(initialRecording);
            setDuration(initialRecording.duration || 0);
            return;
        }

        const load = async () => {
            try {
                const rec = await getRecording(id);
                if (rec) {
                    setRecording(rec);
                    setDuration(rec.duration || 0);
                } else {
                    console.error("Recording not found");
                }
            } catch (err) {
                console.error("Error loading recording:", err);
            }
        };
        load();
    }, [id, initialRecording]);

    // Transcription Saving
    useEffect(() => {
        if (transcriberStatus === 'complete' && transcriptionResult && recording) {
            const saveTranscript = async () => {
                const updated = { ...recording, transcription: transcriptionResult };
                await saveRecording(updated);
                setRecording(updated);
            };
            saveTranscript();
        }
    }, [transcriberStatus, transcriptionResult]);

    // Audio Src Setup
    useEffect(() => {
        if (recording && recording.audioBlob && audioRef.current) {
            const url = URL.createObjectURL(recording.audioBlob);
            audioRef.current.src = url;
            return () => URL.revokeObjectURL(url);
        }
    }, [recording]);

    // Sync Loop
    useEffect(() => {
        let lastTime = Date.now();
        const sync = () => {
            if (recording) {
                if (audioRef.current && recording.audioBlob) {
                    const time = audioRef.current.currentTime;
                    setCurrentTime(time);
                    const loc = recording.locations.find(l => l.timestamp >= time * 1000);
                    if (loc) setCurrentLocation(loc);
                    if (!audioRef.current.paused) animationRef.current = requestAnimationFrame(sync);
                } else {
                    // Manual playback
                    const now = Date.now();
                    const delta = (now - lastTime) / 1000;
                    lastTime = now;
                    setCurrentTime(prev => {
                        const next = prev + delta;
                        if (next >= duration) {
                            setIsPlaying(false);
                            return duration;
                        }
                        const loc = recording.locations.find(l => l.timestamp >= next * 1000);
                        if (loc) setCurrentLocation(loc);
                        return next;
                    });
                    if (isPlaying) animationRef.current = requestAnimationFrame(sync);
                }
            }
        };

        if (isPlaying) {
            lastTime = Date.now();
            animationRef.current = requestAnimationFrame(sync);
        } else {
            cancelAnimationFrame(animationRef.current);
        }
        return () => cancelAnimationFrame(animationRef.current);
    }, [isPlaying, recording, duration]);

    // Handlers
    const togglePlay = async () => {
        if (!recording) return;
        if (recording.audioBlob && audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                try {
                    await audioRef.current.play();
                    setIsPlaying(true);
                } catch (err) { setIsPlaying(false); }
            }
        } else {
            setIsPlaying(!isPlaying);
        }
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (audioRef.current && recording.audioBlob) audioRef.current.currentTime = time;
    };

    const jumpToTime = (timestampMr) => {
        const timeSec = timestampMr / 1000;
        if (audioRef.current) {
            audioRef.current.currentTime = timeSec;
            setCurrentTime(timeSec);
        }
        // If mobile, close feed when clicking/jumping?
        // User didn't ask but "Map View" is default.
        // Let's keep it open so they see context, but provide easy close.
    };

    const handleMapClick = (latlng) => {
        if (!recording) return;
        let minDist = Infinity;
        let closest = null;
        recording.locations.forEach(loc => {
            const d = Math.sqrt(Math.pow(loc.lat - latlng.lat, 2) + Math.pow(loc.lng - latlng.lng, 2));
            if (d < minDist) {
                minDist = d;
                closest = loc;
            }
        });
        if (closest) jumpToTime(closest.timestamp);
    };

    const handleAnnotationClick = (ann) => {
        jumpToTime(ann.timestamp);
        // If mobile, keep feed closed but jump map.
        // If they click on map icon, they probably want to see the map.
        // But if they want to see the text, they'll open the feed.
        // Actually, if they are already in the feed, we scroll to it.
        if (showFeed && feedItemRefs.current[ann.id]) {
            feedItemRefs.current[ann.id].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const handleAddAnnotation = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
        setPlaybackPausedTime(currentTime * 1000);
        setAnnotationText('');
        setAnnotationImage(null);
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
            image: annotationImage,
            location: currentLocation
        };
        const updated = { ...recording, annotations: [...(recording.annotations || []), newAnnotation] };
        setRecording(updated);
        await saveRecording(updated);
        setIsAnnotationModalOpen(false);
        setAnnotationImage(null);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setAnnotationImage(reader.result);
            reader.readAsDataURL(file);
        }
    };

    // Sidebar Resizing
    const startResizing = (e) => {
        isResizingRef.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', endResizing);
        document.body.style.cursor = 'col-resize';
    };

    const handleMouseMove = (e) => {
        if (!isResizingRef.current) return;
        const newWidth = document.body.clientWidth - e.clientX;
        if (newWidth > 250 && newWidth < 800) setSidebarWidth(newWidth);
    };

    const endResizing = () => {
        isResizingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', endResizing);
        document.body.style.cursor = 'default';
    };

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!recording) return <div className="p-8 text-center">Loading...</div>;

    const sortedAnnotations = [...(recording.annotations || [])].sort((a, b) => a.timestamp - b.timestamp);

    return (
        <div className="flex flex-col h-[100dvh] bg-white overflow-hidden relative">
            <audio
                ref={audioRef}
                onEnded={() => setIsPlaying(false)}
                onLoadedMetadata={(e) => {
                    if (e.target.duration && e.target.duration !== Infinity) setDuration(e.target.duration);
                }}
                playbackRate={playbackRate}
                playsInline
            />

            {/* Top Header */}
            <div className="h-14 border-b bg-white flex items-center justify-between px-4 z-20 shrink-0">
                <button onClick={() => navigate('/')} className="text-gray-500 hover:text-black font-medium text-sm flex items-center gap-1">
                    <X size={18} /> Close
                </button>
                <div className="font-semibold text-gray-800 truncate max-w-[200px]">{recording.title || 'Saunter Recording'}</div>
                <div className="text-xs text-gray-400 font-mono">{APP_VERSION}</div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 min-h-0 relative">
                {/* Map Pane - Flex 1 */}
                <div className="flex-1 relative min-w-0 bg-gray-100">
                    <div className="absolute inset-0">
                        <MapDisplay
                            locations={recording.locations}
                            currentLocation={currentLocation}
                            annotations={recording.annotations}
                            onMapClick={handleMapClick}
                            onAnnotationClick={handleAnnotationClick}
                        />
                    </div>

                    {/* Mobile Feed Toggle (Floating on Map) */}
                    {isMobile && !showFeed && (
                        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3">
                            <button
                                onClick={() => setShowFeed(true)}
                                className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-100 text-brand-red flex items-center justify-center active:scale-95 transition-all"
                                title="Show Feed"
                            >
                                <MessageSquare size={20} />
                            </button>
                        </div>
                    )}

                    {/* Stats Toggle Button (Left) */}
                    <div className="absolute top-4 left-4 z-[1000]">
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className={`p-2 rounded-full shadow-lg border transition-all ${showStats ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-100 hover:text-gray-900'}`}
                        >
                            <Gauge size={16} />
                        </button>
                    </div>

                    {showStats && currentLocation && (
                        <div className="absolute top-16 left-4 z-[1000] max-w-[calc(100%-2rem)]">
                            <StatsDisplay recording={recording} currentLocation={currentLocation} isLive={false} />
                        </div>
                    )}
                </div>

                {/* Drag Handle (Desktop Only) */}
                {!isMobile && (
                    <div
                        className="w-[2px] hover:w-1 bg-gray-200 hover:bg-brand-red cursor-col-resize z-30 transition-all"
                        onMouseDown={startResizing}
                    />
                )}

                {/* Feed Pane */}
                {showFeed && (
                    <div
                        style={!isMobile ? { width: sidebarWidth } : {}}
                        className={`
                            flex flex-col bg-white z-[2000] relative
                            ${isMobile ? 'absolute inset-0 w-full h-full' : 'border-l min-w-[250px] max-w-[90vw]'}
                        `}
                    >
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                            <h2 className="font-bold text-gray-700 flex items-center gap-2">
                                <MessageSquare size={18} />
                                Feed ({recording.annotations?.length || 0})
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleAddAnnotation}
                                    className="bg-white border px-3 py-1.5 rounded-full text-brand-red font-bold shadow-sm hover:shadow active:scale-95 transition-all text-xs flex items-center gap-1"
                                >
                                    <Plus size={14} /> Add Note
                                </button>
                                {isMobile && (
                                    <button
                                        onClick={() => setShowFeed(false)}
                                        className="p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
                                        title="Back to Map"
                                    >
                                        <MapIcon size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                            {sortedAnnotations.length === 0 && (
                                <div className="text-center text-gray-400 py-20 text-sm">
                                    No annotations yet.<br />Add a note or photo to remember this moment.
                                </div>
                            )}
                            {sortedAnnotations.map(ann => {
                                const isNear = Math.abs(currentTime - (ann.timestamp / 1000)) < 2;
                                return (
                                    <div
                                        key={ann.id}
                                        ref={el => feedItemRefs.current[ann.id] = el}
                                        onClick={() => {
                                            jumpToTime(ann.timestamp);
                                            if (isMobile) setShowFeed(false); // Close on selection for mobile? Maybe better UX.
                                        }}
                                        className={`bg-white p-4 rounded-2xl border shadow-sm cursor-pointer transition-all hover:shadow-md ${isNear ? 'ring-2 ring-brand-red border-transparent scale-[1.02]' : 'border-gray-100'}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-full ${isNear ? 'bg-brand-red text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                    {ann.type === 'comment' && <MessageSquare size={14} />}
                                                    {ann.type === 'star' && <Star size={14} />}
                                                    {ann.type === 'flag' && <Flag size={14} />}
                                                    {ann.image && <Camera size={14} />}
                                                    {!['comment', 'star', 'flag'].includes(ann.type) && !ann.image && <MapPin size={14} />}
                                                </div>
                                                <div className="text-xs font-mono text-gray-400 font-bold">
                                                    {formatTime(ann.timestamp / 1000)}
                                                </div>
                                            </div>
                                        </div>

                                        {ann.text && <p className="text-sm text-gray-800 leading-relaxed font-medium">{ann.text}</p>}

                                        {ann.image && (
                                            <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                                                <img src={ann.image} alt="Annotation" className="w-full h-auto max-h-[400px] object-contain bg-gray-50" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Player Controls */}
            <div className={`bg-white border-t p-4 safe-area-bottom shadow-[0_-10px_30px_rgba(0,0,0,0.08)] z-50 ${isMobile && showFeed ? 'hidden' : ''}`}>
                {/* Progress Bar */}
                <div className="flex items-center gap-3 mb-4 max-w-2xl mx-auto">
                    <span className="text-[10px] font-mono font-bold text-gray-400 w-10">{formatTime(currentTime)}</span>
                    <input
                        type="range"
                        min="0"
                        max={duration}
                        step="0.1"
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-1 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-brand-red"
                    />
                    <span className="text-[10px] font-mono font-bold text-gray-400 w-10">{formatTime(duration)}</span>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-center gap-6 sm:gap-10 max-w-2xl mx-auto relative">
                    <button onClick={() => {
                        const newTime = Math.max(0, currentTime - 15);
                        setCurrentTime(newTime);
                        if (audioRef.current) audioRef.current.currentTime = newTime;
                    }} className="text-gray-400 hover:text-black active:scale-90 transition-all p-2">
                        <SkipBack className="w-6 h-6" />
                    </button>

                    <button
                        onClick={togglePlay}
                        className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                        {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                    </button>

                    <button onClick={() => {
                        const newTime = Math.min(duration, currentTime + 15);
                        setCurrentTime(newTime);
                        if (audioRef.current) audioRef.current.currentTime = newTime;
                    }} className="text-gray-400 hover:text-black active:scale-90 transition-all p-2">
                        <SkipForward className="w-6 h-6" />
                    </button>

                    {/* Left/Right actions in Desktop, or Floating in Mobile */}
                    <div className="absolute right-0 flex gap-2">
                        <button
                            onClick={() => exportRecording(recording)}
                            className="p-3 bg-gray-50 text-gray-500 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                            title="Export .saunter"
                        >
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal for Adding Annotation */}
            {isAnnotationModalOpen && (
                <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-fade-in pointer-events-auto">
                    <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 flex flex-col gap-5 animate-slide-up">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-xl text-gray-900">Add Note at {formatTime(playbackPausedTime / 1000)}</h3>
                            <button onClick={() => setIsAnnotationModalOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <textarea
                            className="w-full h-32 p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-red resize-none text-lg font-medium placeholder:text-gray-300"
                            placeholder="What happened here?"
                            value={annotationText}
                            onChange={(e) => setAnnotationText(e.target.value)}
                            autoFocus
                        />

                        {/* Image Preview / Upload */}
                        <div>
                            {annotationImage ? (
                                <div className="relative group">
                                    <img src={annotationImage} alt="Preview" className="w-full h-48 object-cover rounded-2xl shadow-inner bg-gray-100" />
                                    <button
                                        onClick={() => setAnnotationImage(null)}
                                        className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all border border-dashed border-gray-200">
                                    <div className="p-3 bg-white rounded-xl text-brand-red shadow-sm">
                                        <Camera size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-700">Add Photo</div>
                                        <div className="text-xs text-gray-400">Captures this moment visually</div>
                                    </div>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            )}
                        </div>

                        <div className="flex justify-between gap-2 overflow-x-auto pb-2 scrollbar-hide">
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
                                    className={`flex flex-col items-center gap-1.5 p-3.5 rounded-2xl min-w-[76px] transition-all ${selectedIcon === item.id
                                        ? 'bg-black text-white shadow-xl scale-110'
                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                        }`}
                                >
                                    <item.icon size={22} className={selectedIcon === item.id ? 'text-white' : item.color || ''} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleSaveAnnotation}
                            className="w-full py-4 bg-brand-red text-white font-black text-lg rounded-2xl shadow-xl shadow-red-100 hover:brightness-110 active:scale-[0.98] transition-all"
                        >
                            Save Annotation
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
