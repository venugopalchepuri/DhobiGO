import {
  AppSettings,
  ClothingCategory,
  IDProofCredential,
  LaundryItem,
  LaundryRecord,
  UserProfile,
  UserSession,
} from '../types';

const DB_NAME = 'dhobi_tracker_db';
const DB_VERSION = 3;

export const DEFAULT_CATEGORIES: string[] = [
  'Kurta',
  'Pajama',
  'Shirt',
  'T-Shirt',
  'Pant',
  'Lower',
  'Shorts',
  'Bedsheet',
  'Pillow Cover',
  'Towel',
  'Duppata',
  'Under Garments',
  'Socks',
  'Hankey',
];

export const DEFAULT_SETTINGS: AppSettings = {
  defaultDhobiName: '',
  currencySymbol: '₹',
  autoOcrEnabled: true,
  themeMode: 'light',
};

class LocalDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = (event.target as IDBOpenDBRequest).transaction!;

        // 1. Laundry records table
        let recordsStore: IDBObjectStore;
        if (!db.objectStoreNames.contains('records')) {
          recordsStore = db.createObjectStore('records', { keyPath: 'id' });
          recordsStore.createIndex('userId', 'userId', { unique: false });
          recordsStore.createIndex('dateGiven', 'dateGiven', { unique: false });
          recordsStore.createIndex('status', 'status', { unique: false });
          recordsStore.createIndex('createdAt', 'createdAt', { unique: false });
        } else {
          recordsStore = tx.objectStore('records');
          if (!recordsStore.indexNames.contains('userId')) {
            recordsStore.createIndex('userId', 'userId', { unique: false });
          }
        }

        // 2. Laundry items table (linked to records)
        if (!db.objectStoreNames.contains('items')) {
          const itemsStore = db.createObjectStore('items', { keyPath: 'id' });
          itemsStore.createIndex('recordId', 'recordId', { unique: false });
        }

        // 3. Categories table
        if (!db.objectStoreNames.contains('categories')) {
          const categoriesStore = db.createObjectStore('categories', { keyPath: 'id' });
          categoriesStore.createIndex('displayOrder', 'displayOrder', { unique: false });
        }

        // 4. Settings table
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // 5. Users table
        let usersStore: IDBObjectStore;
        if (!db.objectStoreNames.contains('users')) {
          usersStore = db.createObjectStore('users', { keyPath: 'userId' });
          usersStore.createIndex('email', 'email', { unique: true });
        } else {
          usersStore = tx.objectStore('users');
          if (!usersStore.indexNames.contains('email')) {
            usersStore.createIndex('email', 'email', { unique: false });
          }
        }

        // 6. Sessions table
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  public async init(): Promise<void> {
    const db = await this.getDB();

    // Check categories and settings
    const tx = db.transaction(['categories', 'settings', 'records'], 'readwrite');
    const categoriesStore = tx.objectStore('categories');
    const countRequest = categoriesStore.count();

    countRequest.onsuccess = () => {
      if (countRequest.result === 0) {
        DEFAULT_CATEGORIES.forEach((catName, index) => {
          const cat: ClothingCategory = {
            id: `cat_${index + 1}_${catName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            name: catName,
            isDefault: true,
            displayOrder: index + 1,
            isActive: true,
          };
          categoriesStore.add(cat);
        });
      }
    };

    const settingsStore = tx.objectStore('settings');
    const settingsRequest = settingsStore.get('general');
    settingsRequest.onsuccess = () => {
      if (!settingsRequest.result) {
        settingsStore.add({ key: 'general', ...DEFAULT_SETTINGS });
      }
    };

    // Safe migration: quarantine any unowned records without a userId so they never leak
    const recordsStore = tx.objectStore('records');
    const cursorReq = recordsStore.openCursor();
    cursorReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
      if (cursor) {
        const rec = cursor.value;
        if (!rec.userId || typeof rec.userId !== 'string') {
          rec.userId = 'quarantined_legacy_unassigned';
          cursor.update(rec);
        }
        cursor.continue();
      }
    };

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Generate next unique record ID scoped per user or globally formatted
  public async getNextRecordId(userId: string): Promise<string> {
    if (!userId) return 'DT-0001';
    const userRecords = await this.getAllRecords(userId);
    if (userRecords.length === 0) {
      return 'DT-0001';
    }
    const numbers = userRecords
      .map((r) => {
        const match = r.id.match(/^DT-(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));

    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNum = max + 1;
    return `DT-${nextNum.toString().padStart(4, '0')}`;
  }

  // Get records scoped strictly to the authenticated userId
  public async getAllRecords(userId: string): Promise<LaundryRecord[]> {
    if (!userId) {
      return [];
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readonly');
      const store = tx.objectStore('records');

      let request: IDBRequest;
      if (store.indexNames.contains('userId')) {
        const index = store.index('userId');
        request = index.getAll(IDBKeyRange.only(userId));
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let records = (request.result as LaundryRecord[]) || [];
        // Strict runtime filtering safety check
        records = records.filter((r) => r.userId === userId);
        // Sort by dateGiven desc, then createdAt desc
        records.sort((a, b) => {
          if (b.dateGiven !== a.dateGiven) {
            return b.dateGiven.localeCompare(a.dateGiven);
          }
          return b.createdAt - a.createdAt;
        });
        resolve(records);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Get record by ID enforcing strict ownership check
  public async getRecordById(id: string, userId: string): Promise<LaundryRecord | null> {
    if (!id || !userId) return null;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readonly');
      const store = tx.objectStore('records');
      const request = store.get(id);

      request.onsuccess = () => {
        const record = request.result as LaundryRecord | undefined;
        // Strictly prevent cross-account access
        if (!record || record.userId !== userId) {
          resolve(null);
        } else {
          resolve(record);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get items for a record with optional ownership verification
  public async getItemsForRecord(recordId: string, userId?: string): Promise<LaundryItem[]> {
    if (!recordId) return [];

    if (userId) {
      const record = await this.getRecordById(recordId, userId);
      if (!record) {
        // Record does not belong to this user
        return [];
      }
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('items', 'readonly');
      const store = tx.objectStore('items');
      const index = store.index('recordId');
      const request = index.getAll(recordId);

      request.onsuccess = () => {
        const items = (request.result as LaundryItem[]) || [];
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Save record + items atomically with strict userId enforcement
  public async saveRecordWithItems(
    record: LaundryRecord,
    items: LaundryItem[],
    userId: string
  ): Promise<void> {
    if (!userId) {
      throw new Error('Unauthorized: cannot save laundry record without valid userId ownership.');
    }

    const db = await this.getDB();

    // If updating an existing record, verify existing record ownership first
    const existing = await this.getRecordById(record.id, userId);
    if (!existing) {
      // Check if this ID already exists under another user to avoid ID collision attacks
      const anyRecordReq = await new Promise<LaundryRecord | null>((res) => {
        const tx = db.transaction('records', 'readonly');
        const st = tx.objectStore('records').get(record.id);
        st.onsuccess = () => res(st.result || null);
        st.onerror = () => res(null);
      });

      if (anyRecordReq && anyRecordReq.userId !== userId) {
        throw new Error("Unauthorized: cannot overwrite another user's laundry record.");
      }
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['records', 'items'], 'readwrite');
      const recordsStore = tx.objectStore('records');
      const itemsStore = tx.objectStore('items');

      // Calculate total items
      const totalItems = items.reduce((sum, item) => sum + item.quantityGiven, 0);

      // Determine status from items returned
      const totalReturned = items.reduce((sum, item) => sum + item.quantityReturned, 0);
      let status: LaundryRecord['status'] = record.status;
      if (totalReturned === 0) {
        status = 'pending';
      } else if (totalReturned >= totalItems && totalItems > 0) {
        status = 'collected';
      } else {
        status = 'partially_returned';
      }

      const updatedRecord: LaundryRecord = {
        ...record,
        userId, // Strictly enforce owner
        totalItems,
        status,
        hasChitImage: !!record.chitImageData,
        updatedAt: Date.now(),
      };

      recordsStore.put(updatedRecord);

      // Remove existing items for this record
      const itemsIndex = itemsStore.index('recordId');
      const existingItemsReq = itemsIndex.getAllKeys(record.id);

      existingItemsReq.onsuccess = () => {
        const keys = existingItemsReq.result;
        keys.forEach((key) => itemsStore.delete(key));

        // Add new items
        items.forEach((item) => {
          itemsStore.put({
            ...item,
            recordId: record.id,
          });
        });
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Update item-level returned quantities with ownership check
  public async updateItemReturn(
    recordId: string,
    itemId: string,
    newQuantityReturned: number,
    userId: string
  ): Promise<{ updatedRecord: LaundryRecord; updatedItems: LaundryItem[] }> {
    const record = await this.getRecordById(recordId, userId);
    if (!record) throw new Error('Unauthorized or record not found');

    const items = await this.getItemsForRecord(recordId, userId);
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) throw new Error('Item not found');

    const validQty = Math.max(0, Math.min(newQuantityReturned, targetItem.quantityGiven));
    targetItem.quantityReturned = validQty;

    const totalItems = items.reduce((sum, i) => sum + i.quantityGiven, 0);
    const totalReturned = items.reduce((sum, i) => sum + i.quantityReturned, 0);
    let status: LaundryRecord['status'] = 'pending';
    if (totalReturned === 0) {
      status = 'pending';
    } else if (totalReturned >= totalItems && totalItems > 0) {
      status = 'collected';
    } else {
      status = 'partially_returned';
    }

    const updatedRecord: LaundryRecord = {
      ...record,
      totalItems,
      status,
      updatedAt: Date.now(),
    };

    await this.saveRecordWithItems(updatedRecord, items, userId);
    return { updatedRecord, updatedItems: items };
  }

  // Mark all items returned with ownership check
  public async markAllReturned(
    recordId: string,
    userId: string
  ): Promise<{ updatedRecord: LaundryRecord; updatedItems: LaundryItem[] }> {
    const record = await this.getRecordById(recordId, userId);
    if (!record) throw new Error('Unauthorized or record not found');

    const items = await this.getItemsForRecord(recordId, userId);
    const updatedItems = items.map((i) => ({
      ...i,
      quantityReturned: i.quantityGiven,
    }));

    const updatedRecord: LaundryRecord = {
      ...record,
      status: 'collected',
      updatedAt: Date.now(),
    };

    await this.saveRecordWithItems(updatedRecord, updatedItems, userId);
    return { updatedRecord, updatedItems };
  }

  // Force set record status with ownership check
  public async setRecordStatus(
    recordId: string,
    status: LaundryRecord['status'],
    userId: string
  ): Promise<LaundryRecord> {
    const record = await this.getRecordById(recordId, userId);
    if (!record) throw new Error('Unauthorized or record not found');

    const items = await this.getItemsForRecord(recordId, userId);
    const updatedRecord: LaundryRecord = {
      ...record,
      status,
      updatedAt: Date.now(),
    };

    await this.saveRecordWithItems(updatedRecord, items, userId);
    return updatedRecord;
  }

  // Delete record and its items with strict ownership check
  public async deleteRecord(recordId: string, userId: string): Promise<void> {
    const record = await this.getRecordById(recordId, userId);
    if (!record) {
      throw new Error("Unauthorized: cannot delete record that does not belong to you.");
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['records', 'items'], 'readwrite');
      const recordsStore = tx.objectStore('records');
      const itemsStore = tx.objectStore('items');

      recordsStore.delete(recordId);

      const itemsIndex = itemsStore.index('recordId');
      const itemsReq = itemsIndex.getAllKeys(recordId);
      itemsReq.onsuccess = () => {
        itemsReq.result.forEach((key) => itemsStore.delete(key));
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Clothing Categories
  public async getAllCategories(): Promise<ClothingCategory[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readonly');
      const store = tx.objectStore('categories');
      const index = store.index('displayOrder');
      const request = index.getAll();

      request.onsuccess = () => {
        const cats = (request.result as ClothingCategory[]) || [];
        resolve(cats);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async addCategory(name: string): Promise<ClothingCategory> {
    const db = await this.getDB();
    const categories = await this.getAllCategories();
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Category name cannot be empty');

    const exists = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      if (!exists.isActive) {
        await this.toggleCategoryActive(exists.id, true);
        return { ...exists, isActive: true };
      }
      return exists;
    }

    const maxOrder = categories.reduce((max, c) => Math.max(max, c.displayOrder), 0);
    const newCat: ClothingCategory = {
      id: `cat_custom_${Date.now()}_${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: trimmed,
      isDefault: false,
      displayOrder: maxOrder + 1,
      isActive: true,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readwrite');
      const store = tx.objectStore('categories');
      const req = store.add(newCat);
      req.onsuccess = () => resolve(newCat);
      req.onerror = () => reject(req.error);
    });
  }

  public async toggleCategoryActive(id: string, isActive: boolean): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readwrite');
      const store = tx.objectStore('categories');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const cat = getReq.result as ClothingCategory;
        if (cat) {
          cat.isActive = isActive;
          store.put(cat);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async deleteCategory(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readwrite');
      const store = tx.objectStore('categories');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // App Settings
  public async getSettings(): Promise<AppSettings> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get('general');

      req.onsuccess = () => {
        if (req.result) {
          const { key, ...rest } = req.result;
          resolve(rest as AppSettings);
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const db = await this.getDB();
    const current = await this.getSettings();
    const merged = { ...current, ...settings };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key: 'general', ...merged });
      req.onsuccess = () => resolve(merged);
      req.onerror = () => reject(req.error);
    });
  }

  // Account-Scoped ID Proof Credential Operations
  public async getIDProof(userId: string): Promise<IDProofCredential | null> {
    if (!userId) return null;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(`id_proof_${userId}`);

      req.onsuccess = () => {
        if (req.result) {
          const { key, ...proof } = req.result;
          resolve(proof as IDProofCredential);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async saveIDProof(proof: IDProofCredential, userId: string): Promise<IDProofCredential> {
    if (!userId) throw new Error('Cannot save ID proof without userId');
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key: `id_proof_${userId}`, ...proof, updatedAt: Date.now() });
      req.onsuccess = () => resolve(proof);
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteIDProof(userId: string): Promise<void> {
    if (!userId) return;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.delete(`id_proof_${userId}`);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Users CRUD
  public async getNextUserId(): Promise<string> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const keys = (req.result as string[]) || [];
        const count = keys.length + 1;
        resolve(`USR-${count.toString().padStart(4, '0')}`);
      };
      req.onerror = () => resolve(`USR-${Date.now().toString().slice(-4)}`);
    });
  }

  public async getUserByEmail(email: string): Promise<UserProfile | null> {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readonly');
      const store = tx.objectStore('users');

      // Use index if present or fallback to full scan
      if (store.indexNames.contains('email')) {
        const index = store.index('email');
        const req = index.get(normalized);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      } else {
        const req = store.getAll();
        req.onsuccess = () => {
          const users = (req.result as UserProfile[]) || [];
          const found = users.find((u) => u.email.toLowerCase() === normalized);
          resolve(found || null);
        };
        req.onerror = () => reject(req.error);
      }
    });
  }

  public async getUserById(userId: string): Promise<UserProfile | null> {
    if (!userId) return null;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const req = store.get(userId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  public async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      const req = store.put({
        ...profile,
        email: profile.email.toLowerCase(),
        updatedAt: Date.now(),
      });
      req.onsuccess = () => resolve(profile);
      req.onerror = () => reject(req.error);
    });
  }

  public async getAllUsers(): Promise<UserProfile[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // Password Reset Token Management
  public async createPasswordResetToken(
    email: string
  ): Promise<{ token: string; expiresAt: number } | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const token = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => (b % 10).toString())
      .join(''); // 4 or 6-digit security reset code e.g. "8294" or "481029"
    const fullToken = `${token}${Math.floor(10 + Math.random() * 90)}`; // 6-digit code
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    const updatedUser: UserProfile = {
      ...user,
      resetToken: fullToken,
      resetExpiresAt: expiresAt,
      updatedAt: Date.now(),
    };

    await this.saveUserProfile(updatedUser);
    return { token: fullToken, expiresAt };
  }

  public async resetPasswordWithToken(
    email: string,
    token: string,
    newHash: string,
    newSalt: string
  ): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.resetToken || !user.resetExpiresAt) return false;

    if (Date.now() > user.resetExpiresAt) {
      return false; // Expired
    }

    if (user.resetToken !== token.trim()) {
      return false; // Invalid token
    }

    const updatedUser: UserProfile = {
      ...user,
      passwordHash: newHash,
      passwordSalt: newSalt,
      resetToken: undefined,
      resetExpiresAt: undefined,
      updatedAt: Date.now(),
    };

    await this.saveUserProfile(updatedUser);
    return true;
  }

  // Session management
  public async getActiveSession(): Promise<UserSession | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const req = store.get('current_session');
      req.onsuccess = () => {
        const res = req.result;
        if (!res) {
          resolve(null);
        } else {
          const { key, ...session } = res;
          if (session.expiresAt && Date.now() > session.expiresAt) {
            resolve(null);
          } else {
            resolve(session as UserSession);
          }
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async saveActiveSession(session: UserSession): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      const req = store.put({ key: 'current_session', ...session });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async clearActiveSession(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      const req = store.delete('current_session');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Delete all records and data for a specific user (for test cleanups or data isolation tests)
  public async clearAllUserData(userId: string): Promise<void> {
    if (!userId) return;
    const records = await this.getAllRecords(userId);
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['records', 'items', 'users', 'settings'], 'readwrite');
      const recStore = tx.objectStore('records');
      const itemStore = tx.objectStore('items');
      const userStore = tx.objectStore('users');
      const settStore = tx.objectStore('settings');

      records.forEach((r) => {
        recStore.delete(r.id);
        const itemIdx = itemStore.index('recordId');
        const itemKeys = itemIdx.getAllKeys(r.id);
        itemKeys.onsuccess = () => {
          itemKeys.result.forEach((k) => itemStore.delete(k));
        };
      });

      userStore.delete(userId);
      settStore.delete(`id_proof_${userId}`);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // User-scoped backup export
  public async exportFullBackup(userId: string): Promise<{
    version: number;
    exportDate: string;
    userId: string;
    records: LaundryRecord[];
    items: LaundryItem[];
    categories: ClothingCategory[];
    settings: AppSettings;
    idProof?: IDProofCredential | null;
  }> {
    const records = await this.getAllRecords(userId);
    const itemsMap: LaundryItem[] = [];
    for (const r of records) {
      const itms = await this.getItemsForRecord(r.id, userId);
      itemsMap.push(...itms);
    }

    const categories = await this.getAllCategories();
    const settings = await this.getSettings();
    const idProof = await this.getIDProof(userId);

    return {
      version: 2,
      exportDate: new Date().toISOString(),
      userId,
      records,
      items: itemsMap,
      categories,
      settings,
      idProof,
    };
  }

  // Restore database from backup payload scoped to target userId
  public async restoreFullBackup(
    backupData: {
      records: LaundryRecord[];
      items: LaundryItem[];
      categories?: ClothingCategory[];
      settings?: AppSettings;
      idProof?: IDProofCredential | null;
    },
    targetUserId: string = 'guest'
  ): Promise<{ restoredRecordsCount: number; restoredItemsCount: number }> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['records', 'items', 'categories', 'settings'], 'readwrite');
      const recordsStore = tx.objectStore('records');
      const itemsStore = tx.objectStore('items');
      const categoriesStore = tx.objectStore('categories');
      const settingsStore = tx.objectStore('settings');

      if (backupData.records) {
        backupData.records.forEach((rec) => {
          recordsStore.put({ ...rec, userId: targetUserId });
        });
      }
      if (backupData.items) {
        backupData.items.forEach((item) => itemsStore.put(item));
      }
      if (backupData.categories) {
        backupData.categories.forEach((cat) => categoriesStore.put(cat));
      }
      if (backupData.settings) {
        settingsStore.put({ key: 'general', ...backupData.settings });
      }
      if (backupData.idProof) {
        settingsStore.put({ key: `id_proof_${targetUserId}`, ...backupData.idProof });
      }

      tx.oncomplete = () => {
        resolve({
          restoredRecordsCount: backupData.records?.length || 0,
          restoredItemsCount: backupData.items?.length || 0,
        });
      };
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const localDB = new LocalDatabase();
