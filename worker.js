/**
 * 晓山青 Web Worker
 * 处理耗时计算任务，避免阻塞主线程
 */

// 魔法数字统一配置
const CONFIG = Object.freeze({
    GPS: {
        MAX_TIME_DIFF: 60,     // 两点间最大时间差（秒），超过视为异常
        MAX_SPEED: 20,          // 最大合理移动速度（km/h），超过视为 GPS 漂移
    },
    DIFFICULTY: {
        DISTANCE_THRESHOLDS: [5, 10, 20],    // 距离难度阈值（km）
        ELEVATION_THRESHOLDS: [200, 500, 1000],  // 爬升难度阈值（m）
        POINT_COUNT_THRESHOLDS: [500, 1000], // 轨迹点数阈值
    },
    ANIMATION: {
        STATUS_INTERVAL: 5000,  // 状态更新心跳间隔（ms）
        POINT_SYNC_INTERVAL: 10, // 每多少个点发送一次更新
    },
    WEATHER: {
        DEFAULT_SCORE: 100,     // 天气评分初始值
    }
});

// Worker 状态
let state = {
    isTracking: false,
    trailPoints: [],
    locationHistory: [],
    weatherCache: {}
};

// ==================== 消息处理 ====================
self.onmessage = function(e) {
    const { type, payload } = e.data;
    
    switch (type) {
        case 'START_TRACKING':
            startTracking();
            break;
            
        case 'STOP_TRACKING':
            stopTracking();
            break;
            
        case 'ADD_POINT':
            addTrailPoint(payload);
            break;
            
        case 'CALCULATE_DISTANCE':
            const result = calculateDistance(payload.points);
            self.postMessage({ type: 'DISTANCE_CALCULATED', payload: result });
            break;
            
        case 'CALCULATE_ELEVATION':
            const elevation = calculateElevationGain(payload.points);
            self.postMessage({ type: 'ELEVATION_CALCULATED', payload: elevation });
            break;
            
        case 'ANALYZE_TRAIL':
            const analysis = analyzeTrail(payload.points);
            self.postMessage({ type: 'TRAIL_ANALYZED', payload: analysis });
            break;
            
        case 'CALCULATE_BEST_DAY':
            const bestDay = calculateBestHikingDay(payload.weatherData, payload.mode);
            self.postMessage({ type: 'BEST_DAY_CALCULATED', payload: bestDay });
            break;
            
        case 'GENERATE_HEATMAP':
            const heatmap = generateHeatmap(payload.points, payload.bounds);
            self.postMessage({ type: 'HEATMAP_GENERATED', payload: heatmap });
            break;
            
        case 'PROCESS_WEATHER_DATA':
            const processed = processWeatherData(payload.data);
            self.postMessage({ type: 'WEATHER_PROCESSED', payload: processed });
            break;
            
        case 'GET_STATE':
            self.postMessage({ type: 'STATE', payload: state });
            break;
            
        case 'CLEAR_STATE':
            clearState();
            self.postMessage({ type: 'STATE_CLEARED' });
            break;
            
        case 'HEARTBEAT':
            self.postMessage({ type: 'HEARTBEAT_ACK' });
            break;
            
        default:
            self.postMessage({ type: 'ERROR', payload: { message: `未知消息类型：${type}` } });
    }
};

// ==================== 轨迹追踪 ====================

function startTracking() {
    state.isTracking = true;
    state.trailPoints = [];
    self.postMessage({ type: 'TRACKING_STARTED' });
}

function stopTracking() {
    state.isTracking = false;
    self.postMessage({ 
        type: 'TRACKING_STOPPED', 
        payload: { 
            pointCount: state.trailPoints.length,
            trail: [...state.trailPoints]
        } 
    });
}

function addTrailPoint(point) {
    const pointWithTime = {
        ...point,
        timestamp: Date.now()
    };
    state.trailPoints.push(pointWithTime);
    
    // 定期发送更新
    if (state.trailPoints.length % CONFIG.ANIMATION.POINT_SYNC_INTERVAL === 0) {
        self.postMessage({
            type: 'POINT_ADDED',
            payload: {
                point: pointWithTime,
                totalPoints: state.trailPoints.length
            }
        });
    }
}

// ==================== 距离计算 ====================

/**
 * 计算两点之间的 Haversine 距离
 */
function haversineDistance(coord1, coord2) {
    const R = 6371e3; // 地球半径（米）
    const lat1 = coord1.lat * Math.PI / 180;
    const lat2 = coord2.lat * Math.PI / 180;
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
}

/**
 * 计算总距离
 */
function calculateDistance(points) {
    if (points.length < 2) {
        return { total: 0, segments: [] };
    }
    
    let total = 0;
    const segments = [];
    
    for (let i = 1; i < points.length; i++) {
        const segment = haversineDistance(points[i - 1], points[i]);
        segments.push(segment);
        total += segment;
    }
    
    return {
        total: total / 1000, // 转换为公里
        segments: segments.map(s => s / 1000),
        unit: 'km'
    };
}

// ==================== 海拔计算 ====================

/**
 * 计算海拔爬升
 */
function calculateElevationGain(points) {
    if (points.length < 2) {
        return { gain: 0, loss: 0, max: 0, min: 0 };
    }
    
    let gain = 0;
    let loss = 0;
    let max = points[0].elevation || 0;
    let min = points[0].elevation || 0;
    
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1].elevation || 0;
        const curr = points[i].elevation || 0;
        
        max = Math.max(max, curr);
        min = Math.min(min, curr);
        
        const diff = curr - prev;
        if (diff > 0) {
            gain += diff;
        } else {
            loss += Math.abs(diff);
        }
    }
    
    return {
        gain: Math.round(gain),
        loss: Math.round(loss),
        max: Math.round(max),
        min: Math.round(min),
        unit: 'm'
    };
}

// ==================== 轨迹分析 ====================

/**
 * 完整轨迹分析
 */
function analyzeTrail(points) {
    if (!points || points.length === 0) {
        return { error: '无轨迹数据' };
    }
    
    const distance = calculateDistance(points);
    const elevation = calculateElevationGain(points);
    
    // 计算速度
    const speeds = [];
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // 秒
        
        if (timeDiff > 0 && timeDiff < CONFIG.GPS.MAX_TIME_DIFF) { // 过滤异常值
            const dist = haversineDistance(prev, curr);
            const speed = (dist / 1000) / (timeDiff / 3600); // km/h
            if (speed < CONFIG.GPS.MAX_SPEED) { // 过滤异常速度
                speeds.push(speed);
            }
        }
    }
    
    const avgSpeed = speeds.length > 0 
        ? speeds.reduce((a, b) => a + b, 0) / speeds.length 
        : 0;
    
    // 计算移动时间
    const totalTime = points.length > 1 
        ? (points[points.length - 1].timestamp - points[0].timestamp) / 1000 
        : 0;
    
    // 难度评估
    const difficulty = calculateDifficulty(distance.total, elevation.gain, points.length);
    
    return {
        distance: distance,
        elevation: elevation,
        avgSpeed: Math.round(avgSpeed * 100) / 100,
        totalTime: formatDuration(totalTime),
        pointCount: points.length,
        difficulty,
        boundingBox: calculateBoundingBox(points)
    };
}

/**
 * 难度评估 (1-5 星)
 */
function calculateDifficulty(distance, elevationGain, pointCount) {
    let score = 0;

    // 距离因素
    if (distance > CONFIG.DIFFICULTY.DISTANCE_THRESHOLDS[2]) score += 3;
    else if (distance > CONFIG.DIFFICULTY.DISTANCE_THRESHOLDS[1]) score += 2;
    else if (distance > CONFIG.DIFFICULTY.DISTANCE_THRESHOLDS[0]) score += 1;

    // 爬升因素
    if (elevationGain > CONFIG.DIFFICULTY.ELEVATION_THRESHOLDS[2]) score += 3;
    else if (elevationGain > CONFIG.DIFFICULTY.ELEVATION_THRESHOLDS[1]) score += 2;
    else if (elevationGain > CONFIG.DIFFICULTY.ELEVATION_THRESHOLDS[0]) score += 1;

    // 点数因素（路线复杂度）
    if (pointCount > CONFIG.DIFFICULTY.POINT_COUNT_THRESHOLDS[1]) score += 2;
    else if (pointCount > CONFIG.DIFFICULTY.POINT_COUNT_THRESHOLDS[0]) score += 1;
    
    return {
        level: Math.min(5, Math.max(1, Math.ceil(score / 2))),
        score,
        description: getDifficultyDescription(score)
    };
}

function getDifficultyDescription(score) {
    if (score <= 2) return '新手友好';
    if (score <= 4) return '初级';
    if (score <= 6) return '中级';
    if (score <= 8) return '高级';
    return '专业级';
}

function calculateBoundingBox(points) {
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    points.forEach(p => {
        minLat = Math.min(minLat, p.lat);
        maxLat = Math.max(maxLat, p.lat);
        minLng = Math.min(minLng, p.lng);
        maxLng = Math.max(maxLng, p.lng);
    });
    
    return { minLat, maxLat, minLng, maxLng };
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}小时${m}分钟`;
}

// ==================== 最佳日期计算 ====================

/**
 * 计算最佳徒步日期
 */
function calculateBestHikingDay(weatherData, mode = 'sunrise') {
    if (!weatherData || weatherData.length === 0) {
        return { error: '无天气数据' };
    }
    
    const scores = weatherData.map(day => {
        let score = 100;
        
        // 云量评分（越低越好）
        score -= day.cloud * 0.5;
        
        // 风力评分（适中最好）
        if (day.wind > 6) score -= (day.wind - 6) * 5;
        else if (day.wind < 2) score -= (2 - day.wind) * 2;
        
        // 降水概率评分
        score -= day.rain * 0.8;
        
        // 空气质量评分
        if (day.air < 50) score -= (50 - day.air) * 0.3;
        
        // 根据模式调整
        if (mode === 'sunrise') {
            // 日出模式：偏好低云量
            score -= day.cloud * 0.3;
        } else if (mode === 'cloudsea') {
            // 云海模式：需要适中云量和湿度
            if (day.cloud > 30 && day.cloud < 70) score += 10;
        }
        
        return {
            ...day,
            calculatedScore: Math.max(0, Math.min(100, Math.round(score)))
        };
    });
    
    // 排序找出最佳日期
    const sorted = [...scores].sort((a, b) => b.calculatedScore - a.calculatedScore);
    
    return {
        bestDay: sorted[0],
        recommendations: sorted.slice(0, 3),
        allDays: scores
    };
}

// ==================== 热力图生成 ====================

/**
 * 生成轨迹热力图数据
 */
function generateHeatmap(points, bounds) {
    if (!points || points.length === 0) {
        return { grid: [], maxIntensity: 0 };
    }
    
    const gridSize = 20; // 网格大小
    const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
    
    // 计算网格密度
    points.forEach(p => {
        const x = Math.floor(((p.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * gridSize);
        const y = Math.floor(((p.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * gridSize);
        
        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            grid[y][x]++;
        }
    });
    
    // 找到最大强度
    let maxIntensity = 0;
    grid.forEach(row => {
        row.forEach(val => {
            maxIntensity = Math.max(maxIntensity, val);
        });
    });
    
    return {
        grid,
        gridSize,
        maxIntensity,
        bounds
    };
}

// ==================== 天气数据处理 ====================

/**
 * 处理天气数据
 */
function processWeatherData(data) {
    if (!data) return null;
    
    return {
        current: {
            temp: data.temp,
            condition: data.weather,
            humidity: data.humidity,
            wind: data.wind,
            aqi: data.aqi,
            uv: data.uv
        },
        hourly: data.hourly || [],
        daily: data.daily || [],
        alerts: data.alerts || [],
        recommendations: generateRecommendations(data)
    };
}

/**
 * 生成户外建议
 */
function generateRecommendations(weather) {
    const recommendations = [];
    
    // 温度建议
    if (weather.temp < 10) {
        recommendations.push('天气较冷，建议穿着保暖衣物');
    } else if (weather.temp > 28) {
        recommendations.push('天气炎热，注意防晒和补水');
    }
    
    // 风力建议
    if (weather.wind && weather.wind.includes('级')) {
        const windLevel = parseInt(weather.wind);
        if (windLevel > 5) {
            recommendations.push('风力较大，注意安全');
        }
    }
    
    // 紫外线建议
    if (weather.uv === '强') {
        recommendations.push('紫外线强，请做好防晒措施');
    }
    
    // 空气质量建议
    if (weather.aqi && weather.aqi > 100) {
        recommendations.push('空气质量一般，敏感人群注意防护');
    }
    
    return recommendations;
}

// ==================== 工具函数 ====================

function clearState() {
    state = {
        isTracking: false,
        trailPoints: [],
        locationHistory: [],
        weatherCache: {}
    };
}

// 定期发送心跳
setInterval(() => {
    if (state.isTracking) {
        self.postMessage({
            type: 'STATUS_UPDATE',
            payload: {
                isTracking: true,
                pointCount: state.trailPoints.length
            }
        });
    }
}, CONFIG.ANIMATION.STATUS_INTERVAL);

// Worker 初始化
self.postMessage({ type: 'READY' });