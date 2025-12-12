import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecording } from '../utils/storage';
import { MapDisplay } from '../components/MapDisplay';
import { Play, Pause, SkipBack, SkipForward, X, Share2, Info } from 'lucide-react';
import { APP_VERSION } from '../utils/version';

export const PlayerView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [recording, setRecording] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [playbackRate, setPlaybackRate] = useState(1);

    const audioRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            console.log("Loading recording:", id);
            try {
                const rec = await getRecording(id);
                if (rec) {
                    console.log("Recording loaded:", rec);
                    setRecording(rec);
                    // Create object URL for audio
                    if (audioRef.current) {
                        const url = URL.createObjectURL(rec.audioBlob);
                        console.log("Audio URL created:", url);
                        audioRef.current.src = url;
                    }
                } else {
                    console.error("Recording not found for id:", id);
                }
            } catch (err) {
                console.error("Error loading recording:", err);
            }
        };
        load();
    }, [id]);

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
        console.log("Toggle play clicked. Audio ref:", audio);
        if (!audio) return;

        if (isPlaying) {
            console.log("Pausing audio...");
            audio.pause();
            setIsPlaying(false);
        } else {
            console.log("Attempting to play audio...");
            try {
                await audio.play();
                console.log("Audio playing successfully");
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

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!recording) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="flex flex-col h-[100dvh] bg-white overflow-hidden">
            <audio
                key={recording.id}
                ref={audioRef}
                onEnded={() => {
                    console.log("Audio ended");
                    setIsPlaying(false);
                }}
                onPlay={() => console.log("Audio event: play")}
                onPause={() => console.log("Audio event: pause")}
                onError={(e) => console.error("Audio event: error", e)}
                onLoadedMetadata={() => console.log("Audio event: loadedmetadata")}
                playbackRate={playbackRate}
                playsInline
            />

            {/* Map Area */}
            <div className="flex-1 relative w-full h-full min-h-0">
                <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
                    <div className="bg-white/80 backdrop-blur p-1 px-2 rounded text-[10px] text-gray-500 font-mono">
                        {APP_VERSION}
                    </div>
                </div>

                <div className="absolute inset-0">
                    <MapDisplay
                        locations={recording.locations}
                        currentLocation={currentLocation}
                        annotations={recording.annotations}
                        onMapClick={handleMapClick}
                    />
                </div>
            </div>

            {/* Player Controls */}
            <div className="bg-white border-t p-4 safe-area-bottom shadow-xl z-20">
                {/* Progress Bar */}
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-mono text-gray-500 w-10">{formatTime(currentTime)}</span>
                    <input
                        type="range"
                        min="0"
                        max={recording.duration}
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-red"
                    />
                    <span className="text-xs font-mono text-gray-500 w-10">{formatTime(recording.duration)}</span>
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
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                            <Share2 className="w-5 h-5" />
                        </button>
                        <select
                            className="bg-gray-100 rounded px-2 py-1 text-xs font-medium"
                            value={playbackRate}
                            onChange={(e) => {
                                const rate = parseFloat(e.target.value);
                                setPlaybackRate(rate);
                                if (audioRef.current) audioRef.current.playbackRate = rate;
                            }}
                        >
                            <option value="1">1x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2">2x</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};
