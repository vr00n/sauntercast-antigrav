import { useState, useEffect, useRef, useCallback } from 'react';

export const useTranscriber = () => {
    const [status, setStatus] = useState('idle'); // idle, downloading, processing, complete, error
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState(null);
    const worker = useRef(null);

    useEffect(() => {
        if (!worker.current) {
            worker.current = new Worker(new URL('../workers/transcriber.js', import.meta.url), {
                type: 'module'
            });
        }

        const onMessage = (event) => {
            const { status, progress, result, error } = event.data;

            switch (status) {
                case 'downloading':
                    setStatus('downloading');
                    setProgress(progress || 0); // Approximate progress of model download
                    break;
                case 'loading':
                case 'processing':
                    setStatus(status);
                    break;
                case 'complete':
                    setStatus('complete');
                    setResult(result);
                    break;
                case 'error':
                    setStatus('error');
                    console.error('Transcription error:', error);
                    break;
            }
        };

        worker.current.addEventListener('message', onMessage);

        return () => {
            worker.current.removeEventListener('message', onMessage);
            // We usually don't terminate to keep model warm, 
            // but if we navigated away we might want to.
            // For now, keep it alive.
        };
    }, []);

    const transcribe = useCallback(async (audioBlob) => {
        setStatus('starting');
        setResult(null);

        try {
            // Decode audio on main thread because Workers don't have AudioContext
            const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            let audio;
            if (audioBuffer.numberOfChannels === 2) {
                const channel0 = audioBuffer.getChannelData(0);
                const channel1 = audioBuffer.getChannelData(1);
                audio = new Float32Array(channel0.length);
                for (let i = 0; i < audio.length; i++) {
                    audio[i] = channel0[i] / 2 + channel1[i] / 2; // Merge channels
                }
            } else {
                audio = audioBuffer.getChannelData(0);
            }

            worker.current.postMessage({
                type: 'TRANSCRIBE',
                audio: audio
            });

        } catch (err) {
            console.error("Audio decoding failed:", err);
            setStatus('error');
        }
    }, []);

    return {
        transcribe,
        status,
        progress,
        result
    };
};
