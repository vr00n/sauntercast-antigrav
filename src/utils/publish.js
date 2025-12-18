// Publishing utilities using localStorage for sharing
// Since we can't safely use GitHub tokens in client-side code,
// we'll use a simpler approach: generate shareable data URLs

export const publishSaunter = async (saunterData, options = {}) => {
    const { isPublic = true, password = null } = options;

    // Validate duration (max 30 minutes)
    const durationMinutes = saunterData.duration / 60;
    if (durationMinutes > 30) {
        throw new Error('Only saunters up to 30 minutes can be published online.');
    }

    // Prepare metadata
    const metadata = {
        id: saunterData.id,
        createdAt: saunterData.createdAt,
        duration: saunterData.duration,
        isPublic,
        hasPassword: !!password,
        locationCount: saunterData.locations?.length || 0,
        annotationCount: saunterData.annotations?.length || 0
    };

    // Prepare the data to publish (exclude audio blob - too large for URL)
    let publishData = {
        id: saunterData.id,
        startTime: saunterData.startTime,
        duration: saunterData.duration,
        locations: saunterData.locations,
        annotations: saunterData.annotations,
        createdAt: saunterData.createdAt,
        metadata
    };

    // Encrypt if password protected
    if (password) {
        const { encryptData } = await import('./encryption.js');
        const encryptedData = await encryptData(publishData, password);
        publishData = {
            encrypted: true,
            data: encryptedData,
            metadata
        };
    }

    // Convert to base64 for URL sharing
    const jsonString = JSON.stringify(publishData);
    const base64Data = btoa(encodeURIComponent(jsonString));

    // Store in a gist or use URL parameters
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}#/view?data=${base64Data}`;

    return {
        url: shareUrl,
        id: saunterData.id,
        isPublic,
        hasPassword: !!password,
        note: 'Share this URL to let others view your saunter (without audio)'
    };
};

export const fetchPublishedSaunter = async (dataParam, password = null) => {
    try {
        // Decode from URL parameter
        const jsonString = decodeURIComponent(atob(dataParam));
        const data = JSON.parse(jsonString);

        // If encrypted, decrypt
        if (data.encrypted) {
            if (!password) {
                throw new Error('PASSWORD_REQUIRED');
            }
            const { decryptData } = await import('./encryption.js');
            return await decryptData(data.data, password);
        }

        return data;
    } catch (err) {
        throw new Error('Invalid or corrupted share link');
    }
};

export const fetchPublicSaunters = async () => {
    // For URL-based sharing, we can't have a central index
    // Return empty array for now
    return [];
};
