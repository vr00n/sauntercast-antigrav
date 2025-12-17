import { useState, useRef, useEffect } from 'react';

export const useRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [locations, setLocations] = useState([]);
    const [annotations, setAnnotations] = useState([]);
    const [audioBlob, setAudioBlob] = useState(null);
    const [startTime, setStartTime] = useState(null);

    const mediaRecorderRef = useRef(null);
    const watchIdRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

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

            // Start location tracking
            if ('geolocation' in navigator) {
                // Keep track of the last saved position to reduce duplicates/jitter
                let lastSavedPosition = null;

                watchIdRef.current = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude, speed, altitude, accuracy, altitudeAccuracy, heading } = position.coords;
                        const timestamp = Date.now() - start;

                        // Filter out points that are too close to the last one (e.g., < 2 meters) to save memory/rendering
                        // Simple Euclidean approximation is fine for this check
                        if (lastSavedPosition) {
                            const dLat = latitude - lastSavedPosition.lat;
                            const dLng = longitude - lastSavedPosition.lng;
                            // roughly meters conversion
                            const dist = Math.sqrt(dLat * dLat + dLng * dLng) * 111000;
                            if (dist < 2) return;
                        }

                        const newLoc = {
                            lat: latitude,
                            lng: longitude,
                            timestamp,
                            speed,
                            altitude,
                            accuracy,
                            altitudeAccuracy,
                            heading
                        };

                        lastSavedPosition = newLoc;
                        setLocations((prev) => [...prev, newLoc]);
                    },
                    (error) => console.error('Geolocation error:', error),
                    { enableHighAccuracy: true, maximumAge: 0 }
                );
            }

            // Start timer
            // Use Date.now() diff to prevent drift/throttling issues in background
            timerRef.current = setInterval(() => {
                setDuration(Math.floor((Date.now() - start) / 1000));
            }, 1000);

        } catch (err) {
            console.error('Error starting recording:', err);
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

        // Final duration update to ensure accuracy even if interval was engaged
        if (startTime) {
            setDuration(Math.floor((Date.now() - startTime) / 1000));
        }

        setIsRecording(false);
    };

    const addAnnotation = (type, text = '', customTimestamp = null) => {
        if (!isRecording || !startTime) return;
        const timestamp = customTimestamp !== null ? customTimestamp : (Date.now() - startTime);
        // Get the last known location
        const lastLoc = locations[locations.length - 1];
        setAnnotations(prev => [...prev, {
            id: crypto.randomUUID(),
            timestamp,
            type,
            text,
            location: lastLoc
        }]);
    };

    const reset = () => {
        setDuration(0);
        setLocations([]);
        setAnnotations([]);
        setAudioBlob(null);
        setStartTime(null);
        chunksRef.current = [];
    };

    return {
        isRecording,
        duration,
        locations,
        annotations,
        audioBlob,
        startRecording,
        stopRecording,
        addAnnotation,
        reset,
        startTime
    };
};
