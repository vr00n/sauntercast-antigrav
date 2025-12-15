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
                watchIdRef.current = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        const timestamp = Date.now() - start; // Relative time
                        setLocations((prev) => [...prev, { lat: latitude, lng: longitude, timestamp }]);
                    },
                    (error) => console.error('Geolocation error:', error),
                    { enableHighAccuracy: true }
                );
            }

            // Start timer
            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
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
