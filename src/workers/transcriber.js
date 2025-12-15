import { pipeline, env } from '@xenova/transformers';

// Skip local model checks
env.allowLocalModels = false;

// Singleton to prevent re-loading
class AutomaticSpeechRecognitionPipeline {
    static task = 'automatic-speech-recognition';
    static model = 'Xenova/whisper-tiny.en';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const { type, audio } = event.data;

    if (type === 'TRANSCRIBE') {
        try {
            // Send loading status
            self.postMessage({ status: 'loading', message: 'Loading AI model...' });

            const transcriber = await AutomaticSpeechRecognitionPipeline.getInstance((data) => {
                // Progress callback for model download
                if (data.status === 'progress') {
                    self.postMessage({
                        status: 'downloading',
                        progress: data.progress,
                        file: data.file
                    });
                }
            });

            self.postMessage({ status: 'processing', message: 'Transcribing audio...' });

            // Run transcription
            // The pipeline expects float32 array or url. 
            // We'll receive a Blob or Float32Array. 
            // If it's a blob, we need to convert it to audio buffer, but we can't fully decode audio easily in worker without Web Audio API (main thread only usually).
            // Actually transformers.js handles URL objects or standard arrays.

            // NOTE: Ideally we pass the AudioBuffer from the main thread to save work here, 
            // but let's try passing the blob provided URL since transformers.js can fetch/decode often.

            const output = await transcriber(audio, {
                // Greedy
                top_k: 0,
                // Time stamps allow us to sync with player
                return_timestamps: true,
                chunk_length_s: 30,
                stride_length_s: 5
            });

            self.postMessage({
                status: 'complete',
                result: output
            });

        } catch (err) {
            self.postMessage({ status: 'error', error: err.message });
        }
    }
});
