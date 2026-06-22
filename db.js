/**
 * 晓山青 Viridiore IndexedDB 数据管理库
 * 提供离线数据持久化存储功能
 */

const DB_NAME = 'xiaoshanqing-db';
const DB_VERSION = 1;

// 数据表配置
const STORES = {
    // 用户位置历史
    'locations': { keyPath: 'id', autoIncrement: true },
    // 轨迹数据
    'trails': { keyPath: 'id', autoIncrement: true },
    // 天气缓存
    'weather-cache': { keyPath: 'location' },
    // 路书数据
    'roadbooks': { keyPath: 'id', autoIncrement: true },
    // 队友位置
    'teammates': { keyPath: 'id' },
    // 待同步数据
    'pending-sync': { keyPath: 'type' },
    // 用户设置
    'settings': { keyPath: 'key' },
    // 收藏山峰
    'favorites': { keyPath: 'id' }
};

class Database {
    constructor() {
        this.db = null;
        this.onUpgradeNeeded = null;
    }

    /**
     * 初始化数据库
     */
    async init() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('[DB] 数据库升级中...');

                // 创建对象存储
                for (const [storeName, config] of Object.entries(STORES)) {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, config);
                        console.log(`[DB] 创建存储：${storeName}`);
                    }
                }

                if (this.onUpgradeNeeded) {
                    this.onUpgradeNeeded(db);
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('[DB] 数据库初始化成功');
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('[DB] 数据库初始化失败:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * 通用 CRUD 操作
     */
    async add(storeName, data) {
        const db = await this.init();
        return this._transaction(storeName, 'readwrite', (store) => {
            return store.add(data);
        });
    }

    async put(storeName, data) {
        const db = await this.init();
        return this._transaction(storeName, 'readwrite', (store) => {
            return store.put(data);
        });
    }

    async get(storeName, key) {
        const db = await this.init();
        return this._transaction(storeName, 'readonly', (store) => {
            return store.get(key);
        });
    }

    async getAll(storeName) {
        const db = await this.init();
        return this._transaction(storeName, 'readonly', (store) => {
            return store.getAll();
        });
    }

    async delete(storeName, key) {
        const db = await this.init();
        return this._transaction(storeName, 'readwrite', (store) => {
            return store.delete(key);
        });
    }

    async clear(storeName) {
        const db = await this.init();
        return this._transaction(storeName, 'readwrite', (store) => {
            return store.clear();
        });
    }

    /**
     * 查询操作
     */
    async query(storeName, queryFn) {
        const db = await this.init();
        return this._transaction(storeName, 'readonly', (store) => {
            return queryFn(store);
        });
    }

    /**
     * 批量操作
     */
    async batchAdd(storeName, dataList) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const results = [];
            let completed = 0;

            dataList.forEach((data, index) => {
                const request = store.add(data);
                request.onsuccess = () => {
                    results[index] = request.result;
                    completed++;
                    if (completed === dataList.length) {
                        resolve(results);
                    }
                };
                request.onerror = (e) => reject(e.target.error);
            });
        });
    }

    /**
     * 事务包装
     */
    _transaction(storeName, mode, operation) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            
            transaction.oncomplete = () => resolve(result);
            transaction.onerror = (e) => reject(e.target.error);
            transaction.onabort = (e) => reject(e.target.error);

            const result = operation(store);
        });
    }

    /**
     * 关闭数据库
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('[DB] 数据库已关闭');
        }
    }

    /**
     * 删除整个数据库
     */
    static deleteDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(DB_NAME);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }
}

// ==================== 具体数据操作类 ====================

/**
 * 位置历史记录
 */
class LocationStore {
    constructor(db) {
        this.db = db;
        this.storeName = 'locations';
    }

    async record(location) {
        const data = {
            ...location,
            timestamp: Date.now(),
            id: undefined
        };
        return this.db.add(this.storeName, data);
    }

    async getHistory(limit = 100) {
        const all = await this.db.getAll(this.storeName);
        return all
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    async getRecent(hours = 24) {
        const cutoff = Date.now() - hours * 60 * 60 * 1000;
        const all = await this.db.getAll(this.storeName);
        return all.filter(l => l.timestamp >= cutoff);
    }

    async clear() {
        return this.db.clear(this.storeName);
    }
}

/**
 * 轨迹数据
 */
class TrailStore {
    constructor(db) {
        this.db = db;
        this.storeName = 'trails';
    }

    async save(trail) {
        const data = {
            ...trail,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        return this.db.put(this.storeName, data);
    }

    async getTrail(id) {
        return this.db.get(this.storeName, id);
    }

    async getAllTrails() {
        const all = await this.db.getAll(this.storeName);
        return all.sort((a, b) => b.createdAt - a.createdAt);
    }

    async deleteTrail(id) {
        return this.db.delete(this.storeName, id);
    }

    async updatePoints(id, points) {
        const trail = await this.getTrail(id);
        if (trail) {
            trail.points = points;
            trail.updatedAt = Date.now();
            return this.save(trail);
        }
    }
}

/**
 * 天气缓存
 */
class WeatherCacheStore {
    constructor(db) {
        this.db = db;
        this.storeName = 'weather-cache';
    }

    async set(location, data, ttl = 3600000) {
        const entry = {
            location,
            data,
            timestamp: Date.now(),
            expires: Date.now() + ttl
        };
        return this.db.put(this.storeName, entry);
    }

    async get(location) {
        const entry = await this.db.get(this.storeName, location);
        if (entry && entry.expires > Date.now()) {
            return entry.data;
        }
        return null;
    }

    async isExpired(location) {
        const entry = await this.db.get(this.storeName, location);
        return !entry || entry.expires <= Date.now();
    }

    async clearExpired() {
        const all = await this.db.getAll(this.storeName);
        const now = Date.now();
        for (const entry of all) {
            if (entry.expires <= now) {
                await this.db.delete(this.storeName, entry.location);
            }
        }
    }
}

/**
 * 用户设置
 */
class SettingsStore {
    constructor(db) {
        this.db = db;
        this.storeName = 'settings';
    }

    async set(key, value) {
        return this.db.put(this.storeName, { key, value });
    }

    async get(key, defaultValue = null) {
        const entry = await this.db.get(this.storeName, key);
        return entry ? entry.value : defaultValue;
    }

    async getAll() {
        const all = await this.db.getAll(this.storeName);
        const settings = {};
        all.forEach(s => {
            settings[s.key] = s.value;
        });
        return settings;
    }

    async remove(key) {
        return this.db.delete(this.storeName, key);
    }
}

/**
 * 收藏管理
 */
class FavoritesStore {
    constructor(db) {
        this.db = db;
        this.storeName = 'favorites';
    }

    async add(id, item) {
        return this.db.put(this.storeName, { id, ...item, addedAt: Date.now() });
    }

    async remove(id) {
        return this.db.delete(this.storeName, id);
    }

    async getAll() {
        const all = await this.db.getAll(this.storeName);
        return all.sort((a, b) => b.addedAt - a.addedAt);
    }

    async isFavorite(id) {
        const item = await this.db.get(this.storeName, id);
        return !!item;
    }
}

// ==================== 导出 ====================
const db = new Database();

// 便捷访问器
const locationStore = new LocationStore(db);
const trailStore = new TrailStore(db);
const weatherCacheStore = new WeatherCacheStore(db);
const settingsStore = new SettingsStore(db);
const favoritesStore = new FavoritesStore(db);

// 初始化数据库
db.init().catch(console.error);

// 导出
export {
    db,
    LocationStore,
    TrailStore,
    WeatherCacheStore,
    SettingsStore,
    FavoritesStore,
    locationStore,
    trailStore,
    weatherCacheStore,
    settingsStore,
    favoritesStore
};