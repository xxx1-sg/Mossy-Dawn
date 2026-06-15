/**
 * 晓山青 Viridiore - 主入口脚本
 * 导入所有模块并暴露到 window，供 HTML 内联脚本使用
 */

// 基础核心模块
import { CONFIG, Storage, ThemeManager, VoiceManager, ShareManager, GPXManager, DBManager } from './core.js';

// Worker 与 SW 模块
import { registerServiceWorker, WorkerManager } from './worker.js';

// 首页与 UI 模块
import {
    HomePageManager, LoadingManager, ToastManager,
    OnlineOfflineManager, PullToRefresh, SwipeManager, HapticManager,
    formatHeroSyncLabel, prefersReducedMotion,
    initV3UI, initHeroParticles, initScrollAnimations,
    syncNavIndicatorV3, getWeatherSvg
} from './home.js';

// 紧急联系人模块（会自动挂载函数到 window）
import './contacts.js';

// 暴露到 window（供 HTML onclick 等内联调用）
window.CONFIG = CONFIG;
window.Storage = Storage;
window.ThemeManager = ThemeManager;
window.VoiceManager = VoiceManager;
window.ShareManager = ShareManager;
window.GPXManager = GPXManager;
window.registerServiceWorker = registerServiceWorker;
window.WorkerManager = WorkerManager;
window.HomePageManager = HomePageManager;
window.LoadingManager = LoadingManager;
window.ToastManager = ToastManager;
window.OnlineOfflineManager = OnlineOfflineManager;
window.PullToRefresh = PullToRefresh;
window.SwipeManager = SwipeManager;
window.HapticManager = HapticManager;
window.formatHeroSyncLabel = formatHeroSyncLabel;
window.prefersReducedMotion = prefersReducedMotion;
window.initV3UI = initV3UI;
window.initHeroParticles = initHeroParticles;
window.initScrollAnimations = initScrollAnimations;
window.syncNavIndicatorV3 = syncNavIndicatorV3;
window.getWeatherSvg = getWeatherSvg;
window.DBManager = DBManager;

// ============================================================
// 以下函数是从 app.html 中迁移出来的初始化代码
// ============================================================

// 防重复初始化标志
let appInitialized = false;

function initHeroQuickActions() {
    document.querySelectorAll('.hero-quick-action[data-target-page]').forEach(button => {
        if (button.dataset.bound === 'true') return;
        button.dataset.bound = 'true';
        button.addEventListener('click', () => showPage(button.dataset.targetPage));
    });
}

function updateHeroDashboard(snapshot = {}) {
    const heroWeatherSummary = document.getElementById('heroWeatherSummary');
    const heroOpsSummary = document.getElementById('heroOpsSummary');
    const heroContactSummary = document.getElementById('heroContactSummary');
    const heroModeBadge = document.getElementById('heroModeBadge');
    const heroSyncBadge = document.getElementById('heroSyncBadge');
    if (!heroWeatherSummary || !heroOpsSummary || !heroContactSummary || !heroModeBadge || !heroSyncBadge) return;

    if (snapshot.syncNow) {
        window.heroLastSyncAt = Date.now();
        Storage.set('heroLastSyncAt', window.heroLastSyncAt);
    }

    const tempText = snapshot.temp == null
        ? document.getElementById('currentTemp')?.textContent?.trim() || '24°'
        : (typeof snapshot.temp === 'string' ? snapshot.temp : `${Math.round(Number(snapshot.temp))}°`);
    const weatherText = snapshot.weather || document.getElementById('weatherDesc')?.textContent?.trim() || '晴';
    const isOnline = navigator.onLine;
    const syncLabel = snapshot.syncLabel || formatHeroSyncLabel();
    const opsSummary = `${isOnline ? '在线模式' : '离线模式'} · ${syncLabel}`;

    heroWeatherSummary.textContent = `${tempText} · ${weatherText}`;
    heroOpsSummary.textContent = opsSummary;
    heroContactSummary.textContent = `${emergencyContacts.length} 位紧急联系人`;
    heroModeBadge.textContent = isOnline ? '在线模式' : '离线模式';
    heroSyncBadge.textContent = syncLabel;
}

function initApp() {
    if (appInitialized) return;
    appInitialized = true;

    initEmergencyContactsDisplay();
    initNavigationBindings();
    renderEcList();
    ThemeManager.init();
    VoiceManager.init();
    OnlineOfflineManager.init();
    SwipeManager.init();
    initWeatherPageV3();
    initChasePageV3();
    setupNavIndicator();
    setupScrollLighting();
    setupHeroParallax();
    initFeatureCardInteractions();
    initHeroQuickActions();
    HomePageManager.init();
    initTeammateMap();
    updateTeammateCommandPanel();
    initV3UI();
    AlertPageManager.init();

    restoreLastVisitedPage();
    updateHeroDashboard({ syncNow: true });

    DBManager.init().then(() => {
        console.log('应用初始化完成');
    }).catch(err => {
        console.error('应用初始化失败:', err);
    });
}

window.initHeroQuickActions = initHeroQuickActions;
window.updateHeroDashboard = updateHeroDashboard;
window.initApp = initApp;

// ============================================================
// 模块加载完成后，在 DOMContentLoaded 时触发 initApp
// ============================================================
document.addEventListener('DOMContentLoaded', initApp);

console.log('[晓山青] JS 模块加载完成，initApp 已注册');
