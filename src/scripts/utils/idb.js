const DB_NAME = 'story-map-db';
const DB_VERSION = 1;

const STORES = {
  FAVORITES: 'favorites',
  PENDING_STORIES: 'pending-stories',
};

class IndexedDBManager {
  constructor() {
    this.db = null;
  }

  // Open database connection
  async openDatabase() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('IndexedDB upgrade needed, creating object stores...');

        // Create favorites store
        if (!db.objectStoreNames.contains(STORES.FAVORITES)) {
          const favoritesStore = db.createObjectStore(STORES.FAVORITES, { 
            keyPath: 'id' 
          });
          favoritesStore.createIndex('createdAt', 'createdAt', { unique: false });
          favoritesStore.createIndex('name', 'name', { unique: false });
          console.log('Created favorites object store');
        }

        // Create pending stories store (for background sync)
        if (!db.objectStoreNames.contains(STORES.PENDING_STORIES)) {
          const pendingStore = db.createObjectStore(STORES.PENDING_STORIES, { 
            keyPath: 'id',
            autoIncrement: true 
          });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('Created pending-stories object store');
        }
      };
    });
  }

  // Generic add/put operation
  async add(storeName, data) {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => {
        console.log(`Added to ${storeName}:`, data);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`Error adding to ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  // Generic put operation (update or insert)
  async put(storeName, data) {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => {
        console.log(`Put to ${storeName}:`, data);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`Error putting to ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  // Generic get operation
  async get(storeName, key) {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`Error getting from ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  // Generic getAll operation
  async getAll(storeName) {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`Error getting all from ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  // Generic delete operation
  async delete(storeName, key) {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        console.log(`Deleted from ${storeName}, key:`, key);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`Error deleting from ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  // Generic clear operation
  async clear(storeName) {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log(`Cleared ${storeName}`);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`Error clearing ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  // Count items in store
  async count(storeName) {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`Error counting ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  // Search using index
  async searchByIndex(storeName, indexName, value) {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`Error searching ${storeName} by ${indexName}:`, request.error);
        reject(request.error);
      };
    });
  }

  // ===== Favorites-specific methods =====

  async addFavorite(story) {
    const favorite = {
      ...story,
      savedAt: new Date().toISOString(),
    };
    return this.put(STORES.FAVORITES, favorite);
  }

  async removeFavorite(storyId) {
    return this.delete(STORES.FAVORITES, storyId);
  }

  async getFavorite(storyId) {
    return this.get(STORES.FAVORITES, storyId);
  }

  async getAllFavorites() {
    return this.getAll(STORES.FAVORITES);
  }

  async isFavorite(storyId) {
    const favorite = await this.getFavorite(storyId);
    return !!favorite;
  }

  async searchFavorites(query) {
    const favorites = await this.getAllFavorites();
    const lowerQuery = query.toLowerCase();
    
    return favorites.filter(story => 
      story.name.toLowerCase().includes(lowerQuery) ||
      story.description.toLowerCase().includes(lowerQuery)
    );
  }

  // ===== Pending stories methods (for background sync) =====

  async addPendingStory(storyData) {
    const pending = {
      ...storyData,
      timestamp: new Date().toISOString(),
    };
    return this.add(STORES.PENDING_STORIES, pending);
  }

  async getAllPendingStories() {
    return this.getAll(STORES.PENDING_STORIES);
  }

  async removePendingStory(id) {
    return this.delete(STORES.PENDING_STORIES, id);
  }

  async clearPendingStories() {
    return this.clear(STORES.PENDING_STORIES);
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('IndexedDB connection closed');
    }
  }
}

// Export singleton instance
export default new IndexedDBManager();
export { STORES };
