import { openDB } from 'idb';

const DB_NAME = 'sauntercast-db';
const STORE_NAME = 'recordings';

export const initDB = async () => {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        },
    });
};

export const saveRecording = async (recording) => {
    const db = await initDB();
    return db.put(STORE_NAME, recording);
};

export const getRecordings = async () => {
    const db = await initDB();
    return db.getAll(STORE_NAME);
};

export const getRecording = async (id) => {
    const db = await initDB();
    return db.get(STORE_NAME, id);
};

export const deleteRecording = async (id) => {
    const db = await initDB();
    return db.delete(STORE_NAME, id);
};
