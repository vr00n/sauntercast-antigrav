// Encryption utilities for password-protected saunters
export const encryptData = async (data, password) => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    
    // Derive key from password
    const passwordBuffer = encoder.encode(password);
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
    
    // Generate salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Derive encryption key
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );
    
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataBuffer
    );
    
    // Combine salt + iv + encrypted data
    const result = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);
    
    // Convert to base64
    return btoa(String.fromCharCode(...result));
};

export const decryptData = async (encryptedBase64, password) => {
    try {
        // Decode base64
        const encryptedArray = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
        
        // Extract salt, iv, and encrypted data
        const salt = encryptedArray.slice(0, 16);
        const iv = encryptedArray.slice(16, 28);
        const encryptedData = encryptedArray.slice(28);
        
        // Derive key from password
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        const passwordKey = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );
        
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            passwordKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        
        // Decrypt
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encryptedData
        );
        
        // Convert to string and parse JSON
        const decoder = new TextDecoder();
        const decryptedString = decoder.decode(decryptedBuffer);
        return JSON.parse(decryptedString);
    } catch (err) {
        throw new Error('Decryption failed. Incorrect password or corrupted data.');
    }
};
