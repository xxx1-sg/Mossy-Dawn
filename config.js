/**
 * 晓山青 Viridiore - 配置文件
 *
 * 使用说明：
 * 1. 将下方 YOUR_AMAP_KEY 和 YOUR_SECURITY_CODE 替换为你申请的高德地图密钥
 * 2. 推荐通过环境变量注入，例如：const AMAP_KEY = process.env.AMAP_KEY || 'YOUR_AMAP_KEY';
 * 3. config.js 不应提交到公开的代码仓库中
 */
const APP_CONFIG = {
    // 高德地图配置
    // 请前往 https://console.amap.com/dev/key/app 申请 Web 端密钥
    AMAP: {
        key: 'YOUR_AMAP_KEY',
        securityCode: 'YOUR_SECURITY_CODE',
        version: '2.0'
    },

    // 和风天气 API 配置
    // 请前往 https://dev.qweather.com 申请免费 API Key
    // 免费版每日 1000 次调用额度，支持：实时天气、逐小时预报、气象预警等
    // 预警数据接口: /v7/warning/now
    HEWEATHER: {
        key: 'YOUR_HEWEATHER_KEY'  // 替换为你的和风天气 Key
    },

    // 天气 API 配置（推荐，WeatherAPI.com，数据与中国气象标准一致）
    // 请前往 https://www.weatherapi.com/signup.aspx 申请免费 API Key
    // 免费套餐：每月 100,000 次调用，支持浏览器直连 CORS，无需后端代理
    WEATHER_API_KEY: '4d70b96758e04f6b8ec63347260106',

    // SOS 紧急求救配置
    // TODO: 接入真实的紧急求救后端服务
    SOS: {
        // 以下为演示模式的 API 地址，实际使用时替换为真实接口
        apiEndpoint: null,  // 例如: 'https://your-sos-api.com/send'
        enabled: false     // 设为 true 并配置 apiEndpoint 后启用真实发送
    },

    // 应用元数据
    APP: {
        name: '晓山青 Viridiore',
        version: '1.0.0',
        description: '户外智能出行伴侣'
    },

    // ==================== 页面路由配置 ====================
    // 路由模式：'spa'（单页应用，在当前页面内切换 div）
    //          'mpa'（多页应用，跳转到独立 HTML 文件）
    ROUTING: {
        mode: 'spa',   // 当前为 SPA 模式，功能入口全部在同一页面内通过 div 切换
        // 以下为 MPA 模式的目标路径（切换 ROUTING.mode = 'mpa' 时启用）
        // 每个功能对应一个独立的 HTML 页面文件
        PAGE_ROUTES: {
            'home':      null,                           // 首页无需跳转
            'weather':   'pages/weather.html',
            'chase':     'pages/light-plan.html',
            'trail':     'pages/trail-offline.html',
            'sos':       'pages/sos.html',
            'roadbook':  'pages/trail-share.html',
            'ai':        'pages/ai-assistant.html',
            'pressure':  'pages/pressure.html',
            'alert':     'pages/weather-alert.html',
            'gear':      'pages/gear-list.html',
            'teammate':  'pages/team-share.html',
            'about':     'about.html'
        },
        // 页面不存在时的提示文本
        PAGE_NOT_FOUND_MSG: '页面开发中，敬请期待',
        // 页面加载超时时间（毫秒）
        LOAD_TIMEOUT: 8000
    }
};
