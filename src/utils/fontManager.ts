
const DB_NAME = 'TopoFontDB';
const STORE_NAME = 'fonts';
const DB_VERSION = 1;

export interface CustomFont {
  name: string;
  buffer: ArrayBuffer;
  type: string; // e.g. 'font/ttf'
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveFont = async (font: CustomFont): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(font);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getFont = async (name: string): Promise<CustomFont | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(name);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllFonts = async (): Promise<CustomFont[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteFont = async (name: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(name);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const loadFontToDocument = async (font: CustomFont) => {
    try {
        const fontFace = new FontFace(font.name, font.buffer);
        await fontFace.load();
        document.fonts.add(fontFace);
        console.log(`Font ${font.name} loaded successfully`);
    } catch (e) {
        console.error(`Failed to load font ${font.name}`, e);
        throw e;
    }
}
