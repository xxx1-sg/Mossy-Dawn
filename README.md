# 晓山青 Viridiore

> 户外智能出行伴侣

一款面向户外爱好者的渐进式 Web 应用（PWA），集天气预测、追光预测、轨迹记录、紧急救援、路书分享、AI 助手、气压监测、气象预警等功能于一体。纯原生 JavaScript + CSS 实现，无框架依赖，支持离线使用、深色模式，并针对移动端进行了全面优化。

---

## 核心特性

- **PWA 支持** — 可安装到桌面/主屏幕，离线可用，后台推送通知
- **响应式设计** — 移动端优先，支持手势操作和深色模式
- **离线优先** — Service Worker 多级缓存策略，网络不佳时仍可使用
- **后台计算** — Web Worker 处理 GPS 轨迹分析，不阻塞 UI
- **本地持久化** — IndexedDB + localStorage，轨迹、设置不丢数据
- **无框架依赖** — 轻量快速，单个 HTML 文件承载全部应用

---

## 主要功能

### 天气
和风天气 API 驱动，提供实时天气、逐小时预报、7 日天气预报，含穿衣指数、户外建议、AQI 空气质量等贴心提示。支持城市切换和自动刷新。

### 追光
智能推荐最佳日出观赏日和云海观赏日。基于云量、风力、降水量、空气质量四维综合评分，自动计算最优日期，支持演示数据和真实 API 数据切换。

### 轨迹
GPS 实时记录徒步、骑行等户外轨迹。内置 Web Worker 后台计算总距离、累计爬升/下降、海拔范围、轨迹难度（1-5 星），支持离线缓存和 GPX 导出。

### SOS 紧急求救
一键触发紧急求救，倒计时 5 秒确认，防止误触。可预设紧急联系人，求救时自动附上实时 GPS 坐标（需配置后端服务，当前为演示模式）。

### 路书
户外路线记录与分享平台。记录路线起终点、难度等级、适宜季节等信息，支持导出和分享。

### AI 助手
内置 AI 问答助手，可查询深圳山峰信息（梧桐山、七娘山、马峦山等）、获取日出/云海建议、推荐新手路线、提供户外安全注意事项。内置快捷问题卡片。

### 气压监测
实时气压数据监测，可预判天气变化趋势，帮助出行决策。

### 气象预警
接入和风天气预警接口，及时推送气象灾害预警信息。

### 装备清单
户外装备分类管理，支持拖拽排序，自定义装备名称和数量，适合出行前检查装备。

### 队友位置
队友实时位置共享（需配置后端服务），适合团队出行时互相查看位置。

---

## 技术架构

### 技术选型

| 类别 | 技术 |
|------|------|
| UI 层 | 原生 HTML + CSS（含 CSS 变量系统） |
| 业务层 | 原生 JavaScript（ES6+，约 1200+ 函数） |
| 地图服务 | 高德地图 Web API v2.0 |
| 天气服务 | 和风天气 API |
| 本地存储 | IndexedDB（db.js）+ localStorage（Storage 工具） |
| 后台计算 | Web Worker（worker.js） |
| 离线支持 | Service Worker（sw.js）+ 多级缓存策略 |
| 图标 | Lucide Icons CDN + 内联 SVG |
| 应用外壳 | PWA Manifest（内联 data URI） |

### 缓存策略

Service Worker 实现三种缓存策略，覆盖不同请求类型：

| 请求类型 | 策略 | 说明 |
|----------|------|------|
| 静态资源（CSS/JS/图片等） | **Cache First** | 优先读缓存，缓存未命中再请求网络 |
| API 请求 | **Network First with Timeout** | 优先请求网络，5 秒超时后降级读缓存 |
| 导航请求 | **Stale While Revalidate** | 先返回缓存，同时后台更新缓存 |

### Web Worker 计算任务

| 任务 | 说明 |
|------|------|
| 轨迹距离计算 | Haversine 公式计算总距离和分段距离 |
| 海拔分析 | 累计爬升/下降、最大/最小海拔 |
| 轨迹分析 | 完整统计（距离、海拔、速度、难度、边界框） |
| 难度评估 | 基于距离、爬升、轨迹点数综合评分（1-5 星） |
| 最佳日期推荐 | 追光场景下的多日天气综合评分 |
| 热力图生成 | 20×20 网格密度计算 |
| 天气数据处理 | 格式化、推荐生成 |

### 数据存储

IndexedDB 数据库 `xiaoshanqing-db`，包含以下存储：

| 存储名称 | 用途 |
|----------|------|
| `locations` | 用户位置历史记录 |
| `trails` | 轨迹数据（包含点序列） |
| `weather-cache` | 天气数据缓存（含 TTL） |
| `roadbooks` | 路书数据 |
| `teammates` | 队友位置数据 |
| `pending-sync` | 待同步数据队列 |
| `settings` | 用户设置键值对 |
| `favorites` | 收藏山峰数据 |

---

## 项目结构

```
xiaoshanqing/
├── app.html           # 主应用（SPA），约 17000 行，包含全部 UI、样式和逻辑
├── config.js          # 全局配置（API 密钥、路由模式、页面路由表）
├── db.js              # IndexedDB 封装与数据访问类
├── worker.js          # Web Worker（后台计算逻辑）
├── sw.js              # Service Worker（PWA 缓存、后台同步、推送通知）
├── .gitignore         # Git 忽略配置
└── docs/
    └── GIT-AI-DEVELOPMENT-GUIDE.md   # AI 驱动开发的 Git 版本控制指南
```

---

## 快速开始

### 1. 配置 API 密钥

编辑 `config.js`，填入高德地图和和风天气的密钥：

```javascript
const APP_CONFIG = {
    AMAP: {
        key: '你的高德地图 Web 端 Key',
        securityCode: '你的高德安全密钥',
        version: '2.0'
    },
    HEWEATHER: {
        key: '你的和风天气 Key'
    },
    SOS: {
        apiEndpoint: null,  // 设为 'https://your-api.com/sos' 启用真实求救
        enabled: false      // 设为 true 启用
    }
};
```

> **API 密钥申请（均为免费版）：**
> - 高德地图：[https://console.amap.com/dev/key/app](https://console.amap.com/dev/key/app)
> - 和风天气：[https://dev.qweather.com](https://dev.qweather.com)（免费版每日 1000 次调用额度）

### 2. 本地运行

> 部分功能（定位、地图、Service Worker）需要通过 HTTP(S) 访问才能正常工作，不建议直接双击 `app.html` 打开。

**方式一：VS Code（推荐）**

安装 [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) 插件，右键 `app.html` → "Open with Live Server"。

**方式二：Python 简易服务器**

```bash
cd xiaoshanqing
python -m http.server 8000
# 访问 http://localhost:8000/app.html
```

**方式三：Node.js**

```bash
cd xiaoshanqing
npx http-server -p 8000
# 访问 http://localhost:8000/app.html
```

**方式四：直接部署**

上传到任意静态托管服务（GitHub Pages、Vercel、Netlify 等）即可。

### 3. 安装为 PWA

1. 在浏览器中打开应用
2. Chrome/Edge：地址栏右侧会出现安装图标；或从右上角菜单中选择"安装晓山青"
3. Safari（iOS）：点击分享按钮 → "添加到主屏幕"
4. 安装后即可从桌面/主屏幕独立启动

---

## 主题定制

应用支持三种主题模式：
- **浅色模式**（默认）
- **深色模式**（手动切换）
- **跟随系统**（自动跟随操作系统设置）

修改主题色只需在 `app.html` 的 `:root` 中调整 CSS 变量：

```css
:root {
    /* 主色调 - 深森林绿系 */
    --primary-color: #1a3a28;
    --primary-light: #2d5a42;
    --primary-dark: #0f2418;

    /* 强调色 - 琥珀金 */
    --accent-color: #E6A254;
    --accent-hover: #d49245;

    /* 背景色 */
    --bg-color: #f5f3ee;
    --card-bg: #ffffff;

    /* 文字色 */
    --text-primary: #1a3a28;
    --text-secondary: #5a6b5c;
}
```

---

## 开发指南

### 代码结构

`app.html` 按功能分为以下区域：

| 行数区间 | 内容 |
|----------|------|
| 1 - 500 | HTML 头部（Meta、PWA Manifest、内联 SVG 图标） |
| 69 - 5500 | CSS 样式（全局变量、组件样式、页面主题） |
| 5500 - 9000 | HTML 正文（导航、功能卡片、品牌介绍） |
| 9000 - 11000 | HTML 页面内容（各功能页面） |
| 11000 - 16939 | JavaScript 业务逻辑（函数定义、初始化、事件绑定） |

### 核心模块

```javascript
// 全局配置
CONFIG          // 应用常量和阈值配置（冻结对象）
APP_CONFIG      // 用户可配置的 API 密钥和功能开关（来自 config.js）

// 数据层
Storage         // localStorage 工具（set/get/remove/clear）
db              // IndexedDB 数据库实例
locationStore   // 位置历史存取
trailStore      // 轨迹存取
weatherCacheStore // 天气缓存存取
settingsStore   // 用户设置存取
favoritesStore  // 收藏存取

// 业务层
ThemeManager    // 深色模式切换管理
navigateTo()    // 页面导航
showPage()      // 页面显示与过渡动画
showToast()     // Toast 通知提示
initApp()       // 应用主初始化

// 功能页初始化
initWeatherPageV3()  // 天气页面
initChasePageV3()    // 追光页面
initTrailCanvas()    // 轨迹页面
```

### Web Worker 通信

主线程与 Worker 通过以下消息类型通信：

```javascript
// 主线程 → Worker
worker.postMessage({ type: 'CALCULATE_DISTANCE', payload: { points } });
worker.postMessage({ type: 'CALCULATE_ELEVATION', payload: { points } });
worker.postMessage({ type: 'ANALYZE_TRAIL', payload: { points } });
worker.postMessage({ type: 'CALCULATE_BEST_DAY', payload: { weatherData, mode } });
worker.postMessage({ type: 'GENERATE_HEATMAP', payload: { points, bounds } });
worker.postMessage({ type: 'START_TRACKING' });
worker.postMessage({ type: 'STOP_TRACKING' });

// Worker → 主线程
{ type: 'DISTANCE_CALCULATED', payload: { total, segments, unit } }
{ type: 'ELEVATION_CALCULATED', payload: { gain, loss, max, min, unit } }
{ type: 'TRAIL_ANALYZED', payload: { distance, elevation, avgSpeed, totalTime, difficulty, ... } }
{ type: 'BEST_DAY_CALCULATED', payload: { bestDay, recommendations, allDays } }
{ type: 'HEATMAP_GENERATED', payload: { grid, gridSize, maxIntensity, bounds } }
{ type: 'TRACKING_STOPPED', payload: { pointCount, trail } }
{ type: 'STATUS_UPDATE', payload: { isTracking, pointCount } }
{ type: 'HEARTBEAT_ACK' }
```

### 调试技巧

| 需求 | 方法 |
|------|------|
| 查看控制台日志 | 浏览器 DevTools（F12）→ Console |
| 查看/修改 IndexedDB 数据 | DevTools → Application → IndexedDB → xiaoshanqing-db |
| 查看/修改 localStorage | DevTools → Application → Local Storage |
| 管理 Service Worker | DevTools → Application → Service Workers |
| 查看网络请求 | DevTools → Network（过滤 API 请求） |
| 模拟定位 | DevTools → Sensors → Location（可设置经纬度） |
| 模拟网络状况 | DevTools → Network → Throttling |
| 清除全部数据 | 设置页面 → 清理数据 |

---

## 功能页面路由

`config.js` 中定义了 SPA 和 MPA 两种路由模式，默认为 SPA。当前支持以下页面：

| 页面 ID | SPA 入口 | MPA 路径（需创建） |
|---------|----------|-------------------|
| home | 首页 | - |
| weather | 天气 | `pages/weather.html` |
| chase | 追光 | `pages/light-plan.html` |
| trail | 轨迹 | `pages/trail-offline.html` |
| sos | SOS | `pages/sos.html` |
| roadbook | 路书 | `pages/trail-share.html` |
| ai | AI 助手 | `pages/ai-assistant.html` |
| pressure | 气压 | `pages/pressure.html` |
| alert | 预警 | `pages/weather-alert.html` |
| gear | 装备 | `pages/gear-list.html` |
| teammate | 队友 | `pages/team-share.html` |

> 注意：MPA 模式下需创建对应的 HTML 文件。当前 MVP 阶段全部功能集中在 `app.html` 中以 SPA 模式运行。

---

## 注意事项

| 项目 | 说明 |
|------|------|
| **密钥安全** | 请勿将含真实密钥的 `config.js` 提交到公开仓库。建议通过环境变量注入或创建 `config.example.js` 模板。 |
| **定位权限** | 轨迹记录和 SOS 求救需要浏览器定位权限，首次使用时浏览器会弹出授权提示。 |
| **SOS 演示模式** | 当前求救功能为 UI 演示。启用真实求救需在 `config.js` 中设置 `SOS.apiEndpoint` 和 `SOS.enabled: true`，并接入真实后端服务。 |
| **队友功能** | 位置共享需要独立后端服务（WebSocket 或轮询 API），当前仅实现了前端展示层。 |
| **HTTPS 要求** | 生产环境部署时必须使用 HTTPS，浏览器定位 API 和 Service Worker 在非安全环境下受限。 |
| **iOS PWA** | iOS Safari 对 PWA 支持有限，部分功能（如推送通知）可能不可用。 |

---

## Roadmap

- [ ] MPA 多页面重构，拆分各功能为独立 HTML
- [ ] 接入真实 SOS 求救后端服务
- [ ] 队友位置实时共享（WebSocket）
- [ ] 轨迹 GPX 文件导入
- [ ] 路线收藏与社区分享
- [ ] 更多山峰数据接入
- [ ] Apple Watch / Android Wear 配套应用
- [ ] 离线地图瓦片下载（高德/MapBox）

---

## License

MIT
