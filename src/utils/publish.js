// GitHub publishing utilities with full audio support
const GITHUB_REPO = 'vr00n/sauntercast-antigrav';
const GITHUB_BRANCH = 'gh-pages';

// Helper to convert Blob to Base64 for GitHub API
const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const getStoredToken = () => localStorage.getItem('sauntercast_github_token');
export const setStoredToken = (token) => localStorage.setItem('sauntercast_github_token', token);

export const publishSaunter = async (saunterData, options = {}) => {
    const { isPublic = true, password = null } = options;
    const token = getStoredToken();

    if (!token) {
        throw new Error('GITHUB_TOKEN_MISSING');
    }

    // Validate duration (max 30 minutes)
    const durationMinutes = saunterData.duration / 60;
    if (durationMinutes > 30) {
        throw new Error('Only saunters up to 30 minutes can be published online.');
    }

    const saunterId = saunterData.id;
    const fileName = `saunters/${saunterId}.json`;

    // Prepare metadata
    const metadata = {
        id: saunterId,
        createdAt: saunterData.createdAt,
        duration: saunterData.duration,
        isPublic,
        hasPassword: !!password,
        hasAudio: !!saunterData.audioBlob,
        locationCount: saunterData.locations?.length || 0,
        annotationCount: saunterData.annotations?.length || 0
    };

    // Convert audio to base64 if it exists
    let audioBase64 = null;
    if (saunterData.audioBlob) {
        audioBase64 = await blobToBase64(saunterData.audioBlob);
    }

    // Prepare the data to publish
    let publishData = {
        ...saunterData,
        audioBase64, // The full audio!
        audioBlob: null, // Remove the blob object
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

    // Create/Update file on GitHub
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(publishData))));

    const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${fileName}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Publish saunter ${saunterId} ${isPublic ? '(public)' : '(private)'}`,
                content: content,
                branch: GITHUB_BRANCH
            })
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`GitHub Upload Failed: ${error.message}`);
    }

    // Update the index file so others can find it (if public)
    await updateSaunterIndex(metadata, token);

    const baseUrl = `https://${GITHUB_REPO.split('/')[0]}.github.io/${GITHUB_REPO.split('/')[1]}`;
    return {
        url: `${baseUrl}/#/view/${saunterId}`,
        id: saunterId,
        isPublic,
        hasPassword: !!password
    };
};

const updateSaunterIndex = async (metadata, token) => {
    const indexFile = 'saunters/index.json';
    let index = [];
    let sha = null;

    try {
        const getResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${indexFile}?ref=${GITHUB_BRANCH}`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (getResponse.ok) {
            const data = await getResponse.json();
            sha = data.sha;
            index = JSON.parse(decodeURIComponent(escape(atob(data.content))));
        }
    } catch (err) { }

    // Add/Update
    const existingIndex = index.findIndex(item => item.id === metadata.id);
    if (existingIndex >= 0) index[existingIndex] = metadata;
    else index.unshift(metadata);

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(index.slice(0, 100), null, 2))));

    await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${indexFile}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            message: 'Update saunter index',
            content,
            branch: GITHUB_BRANCH,
            ...(sha && { sha })
        })
    });
};

export const fetchPublishedSaunter = async (saunterId, password = null) => {
    // If we have data in URL (legacy/fallback), use it
    if (saunterId.length > 100) {
        // Logic for old URL-based links if needed
    }

    const baseUrl = `https://${GITHUB_REPO.split('/')[0]}.github.io/${GITHUB_REPO.split('/')[1]}`;
    const response = await fetch(`${baseUrl}/saunters/${saunterId}.json?t=${Date.now()}`);

    if (!response.ok) throw new Error('Saunter not found');

    let data = await response.json();

    if (data.encrypted) {
        if (!password) throw new Error('PASSWORD_REQUIRED');
        const { decryptData } = await import('./encryption.js');
        data = await decryptData(data.data, password);
    }

    // Convert audioBase64 back to Blob
    if (data.audioBase64) {
        const byteCharacters = atob(data.audioBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        data.audioBlob = new Blob([byteArray], { type: 'audio/webm' }); // Fallback type
    }

    return data;
};
