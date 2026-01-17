import { useState, useRef, useEffect } from 'react';

export const useRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [locations, setLocations] = useState([]);
    const [annotations, setAnnotations] = useState([]);
    const [audioBlob, setAudioBlob] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [pauseTime, setPauseTime] = useState(null);
    const [totalPausedDuration, setTotalPausedDuration] = useState(0);

    const mediaRecorderRef = useRef(null);
    const watchIdRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const lastLocationRef = useRef(null); // Ref for immediate access in callbacks
    const wakeLockRef = useRef(null); // Wake Lock to prevent screen sleep
    const startTimeRef = useRef(null);
    const totalPausedDurationRef = useRef(0);
    const lastLocationAtRef = useRef(0);
    const geoFallbackTimerRef = useRef(null);
    const isRecordingRef = useRef(false);
    const isPausedRef = useRef(false);

    const handleGeoPosition = (position) => {
        if (!startTimeRef.current) return;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') return;

        const { latitude, longitude, speed, altitude, accuracy, altitudeAccuracy, heading } = position.coords;
        const effectiveTimestamp = Date.now() - startTimeRef.current - totalPausedDurationRef.current;

        if (lastLocationRef.current) {
            const dLat = latitude - lastLocationRef.current.lat;
            const dLng = longitude - lastLocationRef.current.lng;
            const dist = Math.sqrt(dLat * dLat + dLng * dLng) * 111000;

            if (accuracy > 20 && dist < 10) return;
            if (dist < 4) return;
        }

        const newLoc = {
            lat: latitude,
            lng: longitude,
            timestamp: effectiveTimestamp,
            speed,
            altitude,
            accuracy,
            altitudeAccuracy,
            heading
        };

        lastLocationRef.current = newLoc;
        lastLocationAtRef.current = Date.now();
        setLocations((prev) => [...prev, newLoc]);
    };

    const handleGeoError = (error) => {
        console.error('Geolocation error:', error);
    };

    const startGeoWatch = () => {
        if (!('geolocation' in navigator)) return;
        if (watchIdRef.current) return;
        watchIdRef.current = navigator.geolocation.watchPosition(
            handleGeoPosition,
            handleGeoError,
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
    };

    const stopGeoWatch = () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    };

    const startGeoFallback = () => {
        if (!('geolocation' in navigator)) return;
        if (geoFallbackTimerRef.current) return;
        geoFallbackTimerRef.current = setInterval(() => {
            if (!isRecordingRef.current || isPausedRef.current) return;
            const lastAt = lastLocationAtRef.current || 0;
            if (Date.now() - lastAt < 15000) return;
            navigator.geolocation.getCurrentPosition(
                handleGeoPosition,
                handleGeoError,
                { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
            );
        }, 10000);
    };

    const stopGeoFallback = () => {
        if (geoFallbackTimerRef.current) {
            clearInterval(geoFallbackTimerRef.current);
            geoFallbackTimerRef.current = null;
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Detect supported mime type
            const mimeType = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/ogg;codecs=opus',
                'audio/aac'
            ].find(type => MediaRecorder.isTypeSupported(type)) || '';

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
                setAudioBlob(blob);
            };

            mediaRecorderRef.current.start();

            const start = Date.now();
            setStartTime(start);
            setIsRecording(true);
            setIsPaused(false);
            setTotalPausedDuration(0);
            startTimeRef.current = start;
            totalPausedDurationRef.current = 0;
            lastLocationAtRef.current = 0;
            isRecordingRef.current = true;
            isPausedRef.current = false;

            // Request Wake Lock to keep screen on during recording
            if ('wakeLock' in navigator) {
                try {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                    console.log('Wake Lock acquired - screen will stay on during recording');

                    wakeLockRef.current.addEventListener('release', () => {
                        console.log('Wake Lock released');
                    });
                } catch (err) {
                    console.warn('Wake Lock request failed:', err);
                }
            }

            // Start location tracking
            lastLocationRef.current = null;
            startGeoWatch();
            startGeoFallback();

            // Start timer
            // Use Date.now() diff to prevent drift, minus totalPausedTime
            timerRef.current = setInterval(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    setDuration(d => d + 1);
                }
            }, 1000);

        } catch (err) {
            console.error('Error starting recording:', err);
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && isRecording && !isPaused) {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            setPauseTime(Date.now());
            isPausedRef.current = true;
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && isRecording && isPaused) {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            const pausedDuration = Date.now() - pauseTime;
            setTotalPausedDuration(prev => prev + pausedDuration);
            totalPausedDurationRef.current += pausedDuration;
            setPauseTime(null);
            isPausedRef.current = false;
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setIsPaused(false);
            isRecordingRef.current = false;
            isPausedRef.current = false;

            stopGeoWatch();
            stopGeoFallback();

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            // Release Wake Lock when recording stops
            if (wakeLockRef.current) {
                wakeLockRef.current.release().then(() => {
                    wakeLockRef.current = null;
                    console.log('Wake Lock released on stop');
                }).catch(err => console.warn('Wake Lock release failed:', err));
            }
        }
    };

    const addAnnotation = (type, text = '', customTimestamp = null, image = null) => {
        if (!isRecording || !startTime) return;
        // If custom timestamp is provided (e.g. from UI capture), use it.
        // Otherwise calculate current effective time.
        // Note: totalPausedDuration state is stale in closure? 
        // No, verify if addAnnotation closes over outdated state.
        // It might. Use functional update or ref for totalPausedDuration if precise.
        // But for buttons, component re-renders on state change, so closure is usually fresh.

        let timestamp = customTimestamp;
        if (timestamp === null) {
            timestamp = Date.now() - startTimeRef.current - totalPausedDurationRef.current;
        }

        // Get the last known location or current if available
        const lastLoc = locations.length > 0 ? locations[locations.length - 1] : null;

        setAnnotations(prev => [...prev, {
            id: crypto.randomUUID(),
            timestamp,
            type,
            text,
            image, // Support for image
            location: lastLoc
        }]);
    };

    const reset = () => {
        setDuration(0);
        setLocations([]);
        setAnnotations([]);
        setAudioBlob(null);
        setStartTime(null);
        setPauseTime(null);
        setTotalPausedDuration(0);
        chunksRef.current = [];
        startTimeRef.current = null;
        totalPausedDurationRef.current = 0;
        lastLocationAtRef.current = 0;
    };

    // Handle visibility change to re-acquire wake lock
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && isRecording && !wakeLockRef.current) {
                if ('wakeLock' in navigator) {
                    try {
                        wakeLockRef.current = await navigator.wakeLock.request('screen');
                        console.log('Wake Lock re-acquired after visibility change');
                    } catch (err) {
                        console.warn('Failed to re-acquire Wake Lock:', err);
                    }
                }
            }

            if (document.visibilityState === 'visible' && isRecordingRef.current) {
                startGeoWatch();
                startGeoFallback();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isRecording]);

    return {
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
        reset,
        startTime
    };
};
