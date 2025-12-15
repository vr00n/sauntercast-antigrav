import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { saveRecording } from './storage';

export const exportRecording = async (recording) => {
    try {
        const zip = new JSZip();

        // 1. Separate metadata from blob
        const { audioBlob, ...metadata } = recording;

        // 2. Add metadata
        zip.file("metadata.json", JSON.stringify(metadata, null, 2));

        // 3. Add audio file
        // Determine extension based on type, default to webm
        let ext = 'webm';
        if (audioBlob.type.includes('mp4')) ext = 'mp4';
        if (audioBlob.type.includes('aac')) ext = 'aac';
        if (audioBlob.type.includes('ogg')) ext = 'ogg';

        // We store the specific mime type in metadata to ensure correct reconstruction
        metadata.mimeType = audioBlob.type;
        zip.file(`audio.${ext}`, audioBlob);

        // 4. Generate and save
        const content = await zip.generateAsync({ type: "blob" });
        const dateStr = new Date(recording.createdAt).toISOString().split('T')[0];
        const fileName = `saunter-${dateStr}-${recording.id.slice(0, 8)}.saunter`;

        saveAs(content, fileName);
        return true;
    } catch (err) {
        console.error("Export failed:", err);
        return false;
    }
};

export const importRecording = async (file) => {
    try {
        const zip = await JSZip.loadAsync(file);

        // 1. Get Metadata
        const metadataStr = await zip.file("metadata.json").async("string");
        const metadata = JSON.parse(metadataStr);

        // 2. Get Audio
        // Search for the audio file (audio.webm, audio.mp4, etc)
        const audioFileName = Object.keys(zip.files).find(name => name.startsWith('audio.'));
        if (!audioFileName) throw new Error("No audio file found in archive");

        const audioBlob = await zip.file(audioFileName).async("blob");

        // Restore the original mime type if we saved it, otherwise assume from extension
        const finalBlob = new Blob([audioBlob], {
            type: metadata.mimeType || 'audio/webm'
        });

        // 3. Reconstruct Recording
        const recording = {
            ...metadata,
            audioBlob: finalBlob,
            // Ensure dates are parsed back to Date objects if they became strings
            createdAt: new Date(metadata.createdAt),
            // We might want to generate a NEW ID to avoid collisions if importing local file copies?
            // For now, let's keep original ID to allow "restore" functionality, 
            // but in a real app duplicate IDs might be an issue.
            // Let's generate a NEW ID for safety on import.
            id: crypto.randomUUID(),
            originalId: metadata.id // Keep ref just in case
        };

        // 4. Save to DB
        await saveRecording(recording);
        return recording;

    } catch (err) {
        console.error("Import failed:", err);
        throw err;
    }
};
