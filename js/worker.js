/**
 * 晓山青 Viridiore - Web Worker 与 Service Worker 管理模块
 */

import { CONFIG } from './core.js';

// ==================== Service Worker 注册 ====================
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            if (window.DEBUG_MODE) console.log('Service Worker 注册成功:', reg.scope);

            // 检查更新
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // 有新版本可用
                            window.showToast && window.showToast('发现新版本，点击刷新', 'success');
                        }
                    });
                }
            });
        }).catch(err => {
            if (window.DEBUG_MODE) console.log('Service Worker 注册失败:', err);
        });
    }
}

// ==================== Web Worker 集成 ====================
const WorkerManager = {
    worker: null,
    callbacks: {},
    messageId: 0,

    init() {
        if ('Worker' in window) {
            try {
                this.worker = new Worker('./worker.js');
                this.worker.onmessage = this.handleMessage.bind(this);
                this.worker.onerror = this.handleError.bind(this);
                if (window.DEBUG_MODE) console.log('Web Worker 初始化成功');
            } catch (e) {
                console.error('Web Worker 初始化失败:', e);
            }
        }
    },

    handleMessage(e) {
        const { type, payload } = e.data;
        if (window.DEBUG_MODE) console.log('Worker 消息:', type, payload);

        switch (type) {
            case 'READY':
                if (window.DEBUG_MODE) console.log('Worker 已就绪');
                break;
            case 'DISTANCE_CALCULATED':
                this.emit('distanceCalculated', payload);
                break;
            case 'ELEVATION_CALCULATED':
                this.emit('elevationCalculated', payload);
                break;
            case 'TRAIL_ANALYZED':
                this.emit('trailAnalyzed', payload);
                break;
            case 'BEST_DAY_CALCULATED':
                this.emit('bestDayCalculated', payload);
                break;
            case 'HEATMAP_GENERATED':
                this.emit('heatmapGenerated', payload);
                break;
            case 'WEATHER_PROCESSED':
                this.emit('weatherProcessed', payload);
                break;
            case 'POINT_ADDED':
                this.emit('pointAdded', payload);
                break;
            case 'STATUS_UPDATE':
                this.emit('statusUpdate', payload);
                break;
            case 'ERROR':
                this.emit('error', payload);
                break;
        }
    },

    handleError(err) {
        console.error('Worker 错误:', err);
        this.emit('error', { message: err.message });
    },

    send(type, payload) {
        if (this.worker) {
            this.worker.postMessage({ type, payload });
        }
    },

    // 事件监听
    on(event, callback) {
        this.callbacks[event] = this.callbacks[event] || [];
        this.callbacks[event].push(callback);
    },

    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(cb => cb(data));
        }
    },

    calculateDistance(points) {
        this.send('CALCULATE_DISTANCE', { points });
    },

    calculateElevation(points) {
        this.send('CALCULATE_ELEVATION', { points });
    },

    analyzeTrail(points) {
        this.send('ANALYZE_TRAIL', { points });
    },

    calculateBestDay(weatherData, mode = 'sunrise') {
        this.send('CALCULATE_BEST_DAY', { weatherData, mode });
    },

    generateHeatmap(points, bounds) {
        this.send('GENERATE_HEATMAP', { points, bounds });
    },

    processWeatherData(data) {
        this.send('PROCESS_WEATHER_DATA', { data });
    },

    startTracking() {
        this.send('START_TRACKING');
    },

    stopTracking() {
        this.send('STOP_TRACKING');
    },

    addTrailPoint(point) {
        this.send('ADD_POINT', point);
    },

    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
};

export { registerServiceWorker, WorkerManager };
