// GitHub API utilities for publishing saunters
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO;
const GITHUB_BRANCH = import.meta.env.VITE_GITHUB_BRANCH || 'gh-pages';

export const publishSaunter = async (saunterData, options = {}) => {
    const { isPublic = true, password = null } = options;

    // Validate duration (max 30 minutes)
    const durationMinutes = saunterData.duration / 60;
    if (durationMinutes > 30) {
        throw new Error('Only saunters up to 30 minutes can be published online.');
    }

    // Generate unique ID for the saunter
    const saunterId = saunterData.id;
    const fileName = `saunters/${saunterId}.json`;

    // Prepare metadata
    const metadata = {
        id: saunterId,
        createdAt: saunterData.createdAt,
        duration: saunterData.duration,
        isPublic,
        hasPassword: !!password,
        locationCount: saunterData.locations?.length || 0,
        annotationCount: saunterData.annotations?.length || 0
    };

    // Prepare the data to publish (exclude audio blob for now, just metadata and path)
    let publishData = {
        ...saunterData,
        audioBlob: null, // We'll handle audio separately if needed
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

    // Get current file SHA if it exists (for updates)
    let sha = null;
    try {
        const getResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${fileName}?ref=${GITHUB_BRANCH}`,
            {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        if (getResponse.ok) {
            const data = await getResponse.json();
            sha = data.sha;
        }
    } catch (err) {
        // File doesn't exist yet, that's fine
    }

    // Create or update file
    const content = btoa(JSON.stringify(publishData, null, 2));
    const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${fileName}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Publish saunter ${saunterId}`,
                content: content,
                branch: GITHUB_BRANCH,
                ...(sha && { sha })
            })
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to publish: ${error.message}`);
    }

    // Update index
    await updateSaunterIndex(metadata);

    // Return the public URL
    const baseUrl = `https://${GITHUB_REPO.split('/')[0]}.github.io/${GITHUB_REPO.split('/')[1]}`;
    return {
        url: `${baseUrl}/#/view/${saunterId}`,
        id: saunterId,
        isPublic,
        hasPassword: !!password
    };
};

export const updateSaunterIndex = async (metadata) => {
    const indexFile = 'saunters/index.json';

    // Get current index
    let index = [];
    let sha = null;

    try {
        const getResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${indexFile}?ref=${GITHUB_BRANCH}`,
            {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (getResponse.ok) {
            const data = await getResponse.json();
            sha = data.sha;
            const content = atob(data.content);
            index = JSON.parse(content);
        }
    } catch (err) {
        // Index doesn't exist yet
    }

    // Update or add metadata
    const existingIndex = index.findIndex(item => item.id === metadata.id);
    if (existingIndex >= 0) {
        index[existingIndex] = metadata;
    } else {
        index.unshift(metadata); // Add to beginning
    }

    // Keep only last 100 saunters in index
    index = index.slice(0, 100);

    // Update index file
    const content = btoa(JSON.stringify(index, null, 2));
    await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${indexFile}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Update saunter index',
                content: content,
                branch: GITHUB_BRANCH,
                ...(sha && { sha })
            })
        }
    );
};

export const fetchPublishedSaunter = async (saunterId, password = null) => {
    const fileName = `saunters/${saunterId}.json`;
    const baseUrl = `https://${GITHUB_REPO.split('/')[0]}.github.io/${GITHUB_REPO.split('/')[1]}`;

    const response = await fetch(`${baseUrl}/${fileName}`);

    if (!response.ok) {
        throw new Error('Saunter not found');
    }

    const data = await response.json();

    // If encrypted, decrypt
    if (data.encrypted) {
        if (!password) {
            throw new Error('PASSWORD_REQUIRED');
        }
        const { decryptData } = await import('./encryption.js');
        return await decryptData(data.data, password);
    }

    return data;
};

export const fetchPublicSaunters = async () => {
    const baseUrl = `https://${GITHUB_REPO.split('/')[0]}.github.io/${GITHUB_REPO.split('/')[1]}`;

    try {
        const response = await fetch(`${baseUrl}/saunters/index.json`);
        if (!response.ok) return [];

        const index = await response.json();
        // Filter to only public saunters
        return index.filter(item => item.isPublic);
    } catch (err) {
        console.error('Failed to fetch public saunters:', err);
        return [];
    }
};

export const deleteSaunter = async (saunterId) => {
    const fileName = `saunters/${saunterId}.json`;

    // Get file SHA
    const getResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${fileName}?ref=${GITHUB_BRANCH}`,
        {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        }
    );

    if (!getResponse.ok) {
        throw new Error('Saunter not found');
    }

    const data = await getResponse.json();

    // Delete file
    const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${fileName}`,
        {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Delete saunter ${saunterId}`,
                sha: data.sha,
                branch: GITHUB_BRANCH
            })
        }
    );

    if (!response.ok) {
        throw new Error('Failed to delete saunter');
    }

    // Remove from index
    await removeFromIndex(saunterId);
};

const removeFromIndex = async (saunterId) => {
    const indexFile = 'saunters/index.json';

    const getResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${indexFile}?ref=${GITHUB_BRANCH}`,
        {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        }
    );

    if (!getResponse.ok) return;

    const data = await getResponse.json();
    const content = atob(data.content);
    let index = JSON.parse(content);

    // Remove the saunter
    index = index.filter(item => item.id !== saunterId);

    // Update index
    const newContent = btoa(JSON.stringify(index, null, 2));
    await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${indexFile}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Remove saunter from index',
                content: newContent,
                sha: data.sha,
                branch: GITHUB_BRANCH
            })
        }
    );
};
