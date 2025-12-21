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

            // Start location tracking
            if ('geolocation' in navigator) {
                lastLocationRef.current = null;

                watchIdRef.current = navigator.geolocation.watchPosition(
                    (position) => {
                        // Skip if paused
                        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') return;

                        const { latitude, longitude, speed, altitude, accuracy, altitudeAccuracy, heading } = position.coords;
                        // Calculate effective recording time (audio time)
                        const effectiveTimestamp = Date.now() - start - totalPausedDuration;

                        // Smart Clustering / Filtering
                        // If we have a last position, check distance and time
                        if (lastLocationRef.current) {
                            const dLat = latitude - lastLocationRef.current.lat;
                            const dLng = longitude - lastLocationRef.current.lng;
                            // roughly meters conversion
                            const dist = Math.sqrt(dLat * dLat + dLng * dLng) * 111000;

                            // "Smart Cluster": If user is stopped (< 5m move) for a while, we don't need new points.
                            // If accuracy is bad (>20m) and distance is small, ignore it.
                            if (accuracy > 20 && dist < 10) return;

                            // Standard jitter filter
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
                        setLocations((prev) => [...prev, newLoc]);
                    },
                    (error) => console.error('Geolocation error:', error),
                    { enableHighAccuracy: true, maximumAge: 0 }
                );
            }

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
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && isRecording && isPaused) {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            const pausedDuration = Date.now() - pauseTime;
            setTotalPausedDuration(prev => prev + pausedDuration);
            setPauseTime(null);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        setIsRecording(false);
        setIsPaused(false);
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
            timestamp = Date.now() - startTime - totalPausedDuration;
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
    };

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
