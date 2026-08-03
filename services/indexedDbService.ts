import { AppConfig, ConversationMessage, SavedIcon, AppAsset, TabType, GeneratedCode } from '../types';

export interface CachedProjectState {
  config: AppConfig;
  logs: Array<{ msg: string; type: string }>;
  conversationHistory: ConversationMessage[];
  iconGallery: SavedIcon[];
  attachments: AppAsset[];
  activeTab?: TabType;
  generated?: GeneratedCode | null;
  lastSavedAt: number;
}

const DB_NAME = 'HeavyStudio_OfflineCache_DB';
const DB_VERSION = 1;
const STORE_NAME = 'project_state_store';
const KEY_NAME = 'current_project_state';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB não é suportado neste navegador.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error || new Error('Erro ao abrir o banco de dados IndexedDB.'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Salva o estado completo do projeto e logs no IndexedDB para persistência offline
 */
export async function saveProjectToIndexedDB(data: Omit<CachedProjectState, 'lastSavedAt'>): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const payload: CachedProjectState = {
        ...data,
        lastSavedAt: Date.now()
      };

      const request = store.put(payload, KEY_NAME);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        console.error('Erro ao salvar estado no IndexedDB:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Falha na transação IndexedDB:', error);
    return false;
  }
}

/**
 * Carrega o estado completo do projeto e logs salvo previamente no IndexedDB
 */
export async function loadProjectFromIndexedDB(): Promise<CachedProjectState | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(KEY_NAME);

      request.onsuccess = () => {
        const result = request.result as CachedProjectState | undefined;
        resolve(result || null);
      };

      request.onerror = () => {
        console.error('Erro ao ler estado do IndexedDB:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Falha ao recuperar do IndexedDB:', error);
    return null;
  }
}

/**
 * Limpa o cache persistente do IndexedDB (ex: ao reiniciar um projeto do zero)
 */
export async function clearProjectIndexedDBCache(): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(KEY_NAME);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Falha ao limpar IndexedDB:', error);
    return false;
  }
}
