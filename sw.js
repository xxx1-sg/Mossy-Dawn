// 晓山青 Service Worker - 高级 PWA 离线支持
const CACHE_VERSION = 'v2';
const CACHE_NAME = `xiaoshanqing-${CACHE_VERSION}`;
const OFFLINE_CACHE = 'offline-v1';

// 资源分类缓存策略
const STATIC_ASSETS = [
    './',
    './app.html',
    './manifest.json'
];

// 外部 API 缓存配置
const API_CACHE_CONFIG = {
    timeout: 5000,
    maxAge: 3600000 // 1 小时
};

// 预缓存资源
const PRECACHE_RESOURCES = [
    './',
    './app.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// ==================== 安装阶段 ====================
self.addEventListener('install', (event) => {
    console.log('[SW] Service Worker 安装中...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] 预缓存资源');
                return cache.addAll(PRECACHE_RESOURCES.map(url => ({
                    url,
                    options: {
                        ignoreSearch: true,
                        ignoreVary: true,
                        ignoreMethod: false
                    }
                })));
            })
            .then(() => self.skipWaiting())
            .then(() => {
                console.log('[SW] Service Worker 安装完成');
            })
            .catch((error) => {
                console.error('[SW] 安装失败:', error);
            })
    );
});

// ==================== 激活阶段 ====================
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker 激活中...');
    event.waitUntil(
        Promise.all([
            // 清理旧缓存
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
                            console.log('[SW] 删除旧缓存:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // 获取客户端控制权
            self.clients.claim()
        ]).then(() => {
            console.log('[SW] Service Worker 激活完成');
            // 通知所有页面有新版本
            return self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'SW_UPDATED',
                        cacheName: CACHE_NAME
                    });
                });
            });
        })
    );
});

// ==================== 请求拦截 - 多种缓存策略 ====================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 跳过跨域请求（除非是 API）
    if (url.origin !== location.origin && !isAPIRequest(url)) {
        return;
    }

    // 根据请求类型选择策略
    if (isStaticAsset(request)) {
        event.respondWith(cacheFirst(request));
    } else if (isAPIRequest(url)) {
        event.respondWith(networkFirstWithTimeout(request));
    } else if (isNavigationRequest(request)) {
        event.respondWith(staleWhileRevalidate(request));
    } else {
        event.respondWith(networkFirst(request));
    }
});

// ==================== 缓存策略实现 ====================

// 1. Cache First - 静态资源
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] 静态资源缓存未命中，网络失败:', request.url);
        return createFallbackResponse(request);
    }
}

// 2. Network First - API 请求（带超时）
async function networkFirstWithTimeout(request) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CACHE_CONFIG.timeout);
    
    try {
        const networkResponse = await fetch(request, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        clearTimeout(timeoutId);
        console.log('[SW] API 请求超时或失败，使用缓存:', request.url);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 返回离线数据提示
        return new Response(JSON.stringify({ 
            error: true, 
            message: '离线模式',
            timestamp: Date.now()
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 3. Network First - 通用网络优先
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return createFallbackResponse(request);
    }
}

// 4. Stale While Revalidate - 导航请求
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => {
            // 网络失败返回缓存
            return cachedResponse || caches.match('./app.html');
        });
    
    return cachedResponse || fetchPromise;
}

// ==================== 辅助函数 ====================

function isStaticAsset(request) {
    const url = new URL(request.url);
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
    return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

function isAPIRequest(url) {
    return url.pathname.startsWith('/api/') || 
           url.hostname === 'restapi.amap.com' ||
           url.hostname === 'api.openweathermap.org';
}

function isNavigationRequest(request) {
    return request.mode === 'navigate';
}

function createFallbackResponse(request) {
    const url = new URL(request.url);
    
    if (request.headers.get('accept').includes('text/html')) {
        return caches.match('./app.html');
    }
    
    if (request.headers.get('accept').includes('text/css')) {
        return new Response('', {
            headers: { 'Content-Type': 'text/css' }
        });
    }
    
    return new Response('Offline', { status: 503 });
}

// ==================== 后台同步 ====================
self.addEventListener('sync', (event) => {
    console.log('[SW] 后台同步任务:', event.tag);
    
    if (event.tag === 'sync-location') {
        event.waitUntil(syncLocationData());
    } else if (event.tag === 'sync-trail') {
        event.waitUntil(syncTrailData());
    }
});

async function syncLocationData() {
    try {
        const pendingData = await getPendingData('location');
        if (!pendingData || pendingData.length === 0) return;
        
        // 这里实现位置数据同步逻辑
        console.log('[SW] 同步位置数据:', pendingData.length, '条');
        await clearPendingData('location');
    } catch (error) {
        console.error('[SW] 同步位置数据失败:', error);
    }
}

async function syncTrailData() {
    try {
        const pendingData = await getPendingData('trail');
        if (!pendingData || pendingData.length === 0) return;
        
        console.log('[SW] 同步轨迹数据:', pendingData.length, '条');
        await clearPendingData('trail');
    } catch (error) {
        console.error('[SW] 同步轨迹数据失败:', error);
    }
}

async function getPendingData(type) {
    // 从 IndexedDB 获取待同步数据
    return new Promise((resolve) => {
        const request = indexedDB.open('xiaoshanqing-db', 1);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['pending-sync'], 'readonly');
            const store = transaction.objectStore('pending-sync');
            const getData = store.get(type);
            getData.onsuccess = () => resolve(getData.result);
        };
        request.onerror = () => resolve(null);
    });
}

async function clearPendingData(type) {
    const db = await indexedDB.open('xiaoshanqing-db', 1);
    const transaction = db.transaction(['pending-sync'], 'readwrite');
    const store = transaction.objectStore('pending-sync');
    store.delete(type);
}

// ==================== 推送通知 ====================
self.addEventListener('push', (event) => {
    console.log('[SW] 收到推送消息');
    
    let data = { title: '晓山青', body: '有新的消息' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        vibrate: [100, 50, 100],
        data: data,
        actions: [
            { action: 'view', title: '查看' },
            { action: 'close', title: '关闭' }
        ],
        tag: data.tag || 'default',
        renotify: true
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ==================== 通知点击处理 ====================
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] 通知被点击');
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('./app.html')
        );
    }
});

// ==================== 消息处理 ====================
self.addEventListener('message', (event) => {
    console.log('[SW] 收到消息:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then((cache) => cache.addAll(event.data.urls))
        );
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.delete(CACHE_NAME)
                .then(() => console.log('[SW] 缓存已清除'))
        );
    }
});

// ==================== 周期同步 (Chrome 62+) ====================
self.addEventListener('periodicsync', (event) => {
    console.log('[SW] 周期同步任务:', event.tag);
    
    if (event.tag === 'update-weather') {
        event.waitUntil(updateWeatherCache());
    }
});

async function updateWeatherCache() {
    try {
        // 预缓存天气数据
        console.log('[SW] 更新天气缓存');
    } catch (error) {
        console.error('[SW] 更新天气缓存失败:', error);
    }
}