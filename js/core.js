/**
 * 晓山青 Viridiore - 核心工具模块
 * 包含全局配置、数据持久化、深色模式、语音播报、分享、GPX 等基础功能
 */

// ==================== 全局配置常量 ====================
// 设置为 false 可禁用所有调试日志（不影响错误和警告）
window.DEBUG_MODE = true;

// 应用级魔法数字统一管理，避免散落在代码各处
const CONFIG = Object.freeze({
    // SOS 紧急求救
    SOS: {
        COUNTDOWN_SECONDS: 5,          // 倒计时秒数
        WARNING_DURATION: 4200,         // Toast 提示时长 ms
    },
    // 品牌介绍动画时序
    ANIMATION: {
        BRAND_INTRO_SUBTITLE_DELAY: 800,  // 副标题开始打字延迟 ms
        BRAND_INTRO_UI_DELAY: 1500,      // UI 浮现延迟 ms
        BRAND_INTRO_FINAL_DELAY: 2500,    // 收尾动画延迟 ms
        BRAND_INTRO_HIDE_DELAY: 3000,    // 完全隐藏延迟 ms
        SOS_PULSE_DURATION: 2000,        // SOS 按钮脉动周期 ms
    },
    // 交互阈值
    THRESHOLD: {
        PULL_TO_REFRESH: 100,          // 下拉刷新阈值 px
        PRESS_LONG_MS: 500,            // 长按触发 SOS 的毫秒数
    },
    // 地图
    MAP: {
        DEFAULT_ZOOM: 12,              // 默认缩放级别
        CLUSTER_RADIUS: 60,            // 聚类半径 px
    },
    // 队友地图深圳区域边界
    MAP_BOUNDS: {
        LAT_MIN: 22.42,
        LAT_MAX: 22.72,
        LNG_MIN: 113.82,
        LNG_MAX: 114.42,
    },
    // Toast 通知
    TOAST: {
        DEFAULT_DURATION: 3000,        // 默认显示时长 ms
    }
});

// ==================== 数据持久化 ====================
const Storage = {
    // 保存数据
    set(key, value) {
        try {
            localStorage.setItem('xiaoshanqing_' + key, JSON.stringify(value));
        } catch (e) {
            console.warn('Storage set error:', e);
        }
    },
    // 获取数据
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem('xiaoshanqing_' + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn('Storage get error:', e);
            return defaultValue;
        }
    },
    // 删除数据
    remove(key) {
        try {
            localStorage.removeItem('xiaoshanqing_' + key);
        } catch (e) {
            console.warn('Storage remove error:', e);
        }
    },
    // 清空所有数据
    clear() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('xiaoshanqing_')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) {
            console.warn('Storage clear error:', e);
        }
    }
};

// ==================== 深色模式 ====================
const ThemeManager = {
    isDark: false,

    init() {
        this.isDark = Storage.get('darkMode', false);
        if (this.isDark) {
            this.enable();
        }
        this.renderToggle();
    },

    toggle() {
        this.isDark = !this.isDark;
        Storage.set('darkMode', this.isDark);
        if (this.isDark) {
            this.enable();
        } else {
            this.disable();
        }
        this.renderToggle();
    },

    enable() {
        document.body.classList.add('dark-mode');
        this.updateCSSVariables(true);
    },

    disable() {
        document.body.classList.remove('dark-mode');
        this.updateCSSVariables(false);
    },

    updateCSSVariables(isDark) {
        const root = document.documentElement;
        if (isDark) {
            root.style.setProperty('--light-bg', '#1a1a1a');
            root.style.setProperty('--text-color', '#e0e0e0');
            root.style.setProperty('--text-light', '#a0a0a0');
        } else {
            root.style.setProperty('--light-bg', '#f5f5f0');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--text-light', '#666');
        }
    },

    renderToggle() {
        let toggle = document.getElementById('themeToggle');
        if (!toggle) {
            const nav = document.querySelector('.nav');
            if (!nav) return;
            toggle = document.createElement('button');
            toggle.id = 'themeToggle';
            toggle.className = 'theme-toggle-btn';
            toggle.innerHTML = '🌙';
            toggle.onclick = () => this.toggle();
            const menu = nav.querySelector('.nav-menu');
            if (menu) nav.insertBefore(toggle, menu);
        } else {
            toggle.onclick = () => this.toggle();
        }
        toggle.innerHTML = this.isDark ? '☀️' : '🌙';
        toggle.setAttribute('aria-label', this.isDark ? '切换到浅色模式' : '切换到深色模式');
    }
};

// ==================== 语音播报 ====================
const VoiceManager = {
    enabled: true,
    synth: window.speechSynthesis,
    voice: null,

    init() {
        this.enabled = Storage.get('voiceEnabled', true);
        if ('speechSynthesis' in window) {
            this.loadVoices();
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = () => this.loadVoices();
            }
        }
        this.renderToggle();
    },

    loadVoices() {
        const voices = this.synth.getVoices();
        this.voice = voices.find(v => v.lang.includes('zh')) || voices[0];
    },

    speak(text) {
        if (!this.enabled || !text) return;
        this.synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.voice;
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        this.synth.speak(utterance);
    },

    toggle() {
        this.enabled = !this.enabled;
        Storage.set('voiceEnabled', this.enabled);
        this.renderToggle();
        return this.enabled;
    },

    renderToggle() {
        const toggle = document.getElementById('soundToggle');
        if (!toggle) return;
        toggle.classList.toggle('muted', !this.enabled);
        toggle.setAttribute('aria-label', this.enabled ? '关闭声音' : '开启声音');
        toggle.setAttribute('title', this.enabled ? '关闭声音' : '开启声音');
        const icon = toggle.querySelector('svg');
        if (icon) {
            if (this.enabled) {
                icon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>';
            } else {
                icon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
            }
        }
    }
};

// ==================== 分享功能 ====================
const ShareManager = {
    async shareRoute(title, content, imageUrl = null) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: content,
                    url: window.location.href
                });
                return true;
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error('Share error:', e);
                }
            }
        }
        // 降级方案：复制到剪贴板
        const shareText = `${title}\n${content}\n${window.location.href}`;
        await navigator.clipboard.writeText(shareText);
        return false;
    },

    async shareImage(title, canvas) {
        if (!canvas || !canvas.toBlob) return;
        canvas.toBlob(async (blob) => {
            if (navigator.share && navigator.canShare) {
                const file = new File([blob], 'route.png', { type: 'image/png' });
                const data = { files: [file], title: title };
                if (navigator.canShare(data)) {
                    try {
                        await navigator.share(data);
                        return;
                    } catch (e) {
                        if (e.name !== 'AbortError') console.error(e);
                    }
                }
            }
            // 降级：下载图片
            const link = document.createElement('a');
            link.download = title + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }
};

// ==================== GPX 导入导出 ====================
const GPXManager = {
    // 导出轨迹为 GPX
    exportTrail(trailPoints, name = '我的轨迹') {
        const gpx = this.createGPX(trailPoints, name);
        const blob = new Blob([gpx], { type: 'application/gpx+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name + '.gpx';
        link.click();
        URL.revokeObjectURL(url);
    },

    createGPX(trailPoints, name) {
        let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
        gpx += '<gpx version="1.1" creator="晓山青 Viridiore">\n';
        gpx += '  <trk>\n';
        gpx += '    <name>' + this.escapeXml(name) + '</name>\n';
        gpx += '    <trkseg>\n';
        trailPoints.forEach(p => {
            gpx += '      <trkpt lat="' + p.lat + '" lon="' + p.lng + '">\n';
            gpx += '        <ele>' + (p.elevation || 0) + '</ele>\n';
            gpx += '        <time>' + (p.time || new Date().toISOString()) + '</time>\n';
            gpx += '      </trkpt>\n';
        });
        gpx += '    </trkseg>\n';
        gpx += '  </trk>\n';
        gpx += '</gpx>';
        return gpx;
    },

    escapeXml(str) {
        return str.replace(/[<>&'"]/g, c => ({
            '<': '&lt;', '>': '&gt;', '&': '&amp;',
            "'": '&apos;', '"': '&quot;'
        })[c]);
    },

    // 导入 GPX 文件
    async importGPX(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parser = new DOMParser();
                    const xml = parser.parseFromString(e.target.result, 'application/xml');
                    const points = [];
                    const trkpts = xml.querySelectorAll('trkpt');
                    trkpts.forEach(pt => {
                        points.push({
                            lat: parseFloat(pt.getAttribute('lat')),
                            lng: parseFloat(pt.getAttribute('lon')),
                            elevation: parseFloat(pt.querySelector('ele')?.textContent) || 0,
                            time: pt.querySelector('time')?.textContent || null
                        });
                    });
                    resolve(points);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
};

// ==================== IndexedDB 管理器 ====================
const DBManager = {
    dbName: 'XiaoShanQingDB',
    version: 1,
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onerror = () => { console.error('IndexedDB 打开失败:', request.error); reject(request.error); };
            request.onsuccess = () => { this.db = request.result; if (window.DEBUG_MODE) console.log('IndexedDB 打开成功'); resolve(this.db); };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('trails')) {
                    const ts = db.createObjectStore('trails', { keyPath: 'id' });
                    ts.createIndex('name', 'name', { unique: false });
                    ts.createIndex('date', 'date', { unique: false });
                }
                if (!db.objectStoreNames.contains('roadbooks')) {
                    const rs = db.createObjectStore('roadbooks', { keyPath: 'id' });
                    rs.createIndex('author', 'author', { unique: false });
                    rs.createIndex('date', 'date', { unique: false });
                }
                if (!db.objectStoreNames.contains('weatherCache')) {
                    const cs = db.createObjectStore('weatherCache', { keyPath: 'location' });
                    cs.createIndex('timestamp', 'timestamp', { unique: false });
                }
                if (!db.objectStoreNames.contains('gearLists')) db.createObjectStore('gearLists', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
                if (window.DEBUG_MODE) console.log('IndexedDB 表结构创建完成');
            };
        });
    },

    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).add(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).put(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    async query(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).index(indexName).getAll(value);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async saveTrail(trail) {
        trail.id = trail.id || 'trail_' + Date.now();
        trail.date = trail.date || new Date().toISOString();
        return this.add('trails', trail);
    },
    async getTrail(id) { return this.get('trails', id); },
    async getAllTrails() { return this.getAll('trails'); },
    async deleteTrail(id) { return this.delete('trails', id); },
    async saveRoadbook(roadbook) {
        roadbook.id = roadbook.id || 'roadbook_' + Date.now();
        roadbook.date = roadbook.date || new Date().toISOString();
        return this.add('roadbooks', roadbook);
    },
    async getRoadbook(id) { return this.get('roadbooks', id); },
    async getAllRoadbooks() { return this.getAll('roadbooks'); },
    async deleteRoadbook(id) { return this.delete('roadbooks', id); },
    async saveWeatherCache(location, data) {
        return this.add('weatherCache', { location, timestamp: Date.now(), data });
    },
    async getWeatherCache(location) {
        return this.query('weatherCache', 'location', location);
    }
};

// 导出（供其他模块使用）
export { CONFIG, Storage, ThemeManager, VoiceManager, ShareManager, GPXManager, DBManager };
