/**
 * 晓山青 Viridiore - 首页与通用 UI 初始化模块
 */

import { Storage } from './core.js';

// heroLastSyncAt 初始化（首次访问视为刚刚同步）
window.heroLastSyncAt = (() => {
    const stored = Storage.get('heroLastSyncAt', null);
    const dayMs = 24 * 60 * 60 * 1000;
    if (stored && (Date.now() - stored) < dayMs) return stored;
    return Date.now();
})();

// ==================== 全局状态 ====================
let initialLoadFinished = false;
let brandIntroTimers = [];
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

function prefersReducedMotion() {
    return reducedMotionQuery.matches;
}

function clearBrandIntroTimers() {
    brandIntroTimers.forEach(timer => clearTimeout(timer));
    brandIntroTimers = [];
}

function formatHeroSyncLabel(timestamp) {
    const ts = timestamp || window.heroLastSyncAt;
    const diffMs = Date.now() - ts;
    if (diffMs <= 0) return '刚刚同步';
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 60) return `${diffMinutes} 分钟前同步`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} 小时前同步`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} 天前同步`;
    return '久未同步';
}

// ==================== 首页 V2 管理器 ====================
const HomePageManager = {
    init() {
        this.bindFeatureCardClicks();
        this.bindInfoCardClicks();
        this.bindQuickActionClicks();
        this.updateInfoCards();
        this.updateSyncStatus();
        this.startSyncPolling();
    },

    bindFeatureCardClicks() {
        document.querySelectorAll('#home .feature-card[data-target-page]').forEach(card => {
            if (card.dataset.bound) return;
            card.dataset.bound = 'true';
            card.addEventListener('click', () => {
                const page = card.dataset.targetPage;
                if (page && window.showPage) window.showPage(page);
            });
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const page = card.dataset.targetPage;
                    if (page && window.showPage) window.showPage(page);
                }
            });
        });
    },

    bindInfoCardClicks() {
        document.querySelectorAll('#home .info-card[data-target-page]').forEach(card => {
            if (card.dataset.bound) return;
            card.dataset.bound = 'true';
            card.addEventListener('click', () => {
                const page = card.dataset.targetPage;
                if (page && window.showPage) window.showPage(page);
            });
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const page = card.dataset.targetPage;
                    if (page && window.showPage) window.showPage(page);
                }
            });
        });
    },

    bindQuickActionClicks() {
        document.querySelectorAll('#home .quick-action-btn-v2[data-target-page]').forEach(btn => {
            if (btn.dataset.bound) return;
            btn.dataset.bound = 'true';
            btn.addEventListener('click', () => {
                const page = btn.dataset.targetPage;
                if (page && window.showPage) window.showPage(page);
            });
        });
    },

    updateInfoCards() {
        const syncCard = document.getElementById('infoCardSync');
        if (syncCard) syncCard.textContent = navigator.onLine ? '在线模式' : '离线缓存';
        const syncCardV3 = document.getElementById('infoCardSyncV3');
        if (syncCardV3) syncCardV3.textContent = navigator.onLine ? '在线模式' : '离线缓存';
        const sosCard = document.getElementById('infoCardSos');
        if (sosCard && window.emergencyContacts) sosCard.textContent = `${window.emergencyContacts.length} 位紧急联系人`;
        const sosCardV3 = document.getElementById('infoCardSosV3');
        if (sosCardV3 && window.emergencyContacts) sosCardV3.textContent = `${window.emergencyContacts.length} 位紧急联系人`;

        const tempEl = document.getElementById('heroTempV2');
        const descEl = document.getElementById('heroWeatherDescV2');
        const iconEl = document.getElementById('heroWeatherIconV2');
        if (tempEl && descEl) {
            const temp = document.getElementById('currentTemp')?.textContent?.trim();
            const desc = document.getElementById('weatherDesc')?.textContent?.trim();
            if (temp) tempEl.textContent = temp;
            if (desc) {
                descEl.textContent = desc;
                if (iconEl) iconEl.textContent = this.getWeatherIcon(desc);
            }
        }
    },

    getWeatherIcon(desc) {
        if (!desc) return '☀️';
        const d = desc.toLowerCase();
        if (d.includes('晴')) return '☀️';
        if (d.includes('多云')) return '⛅';
        if (d.includes('阴')) return '☁️';
        if (d.includes('雨')) return '🌧️';
        if (d.includes('雪')) return '❄️';
        if (d.includes('雷')) return '⛈️';
        if (d.includes('雾')) return '🌫️';
        if (d.includes('风')) return '💨';
        return '🌤️';
    },

    updateSyncStatus() {
        const modeBadge = document.getElementById('heroModeBadgeV2');
        const modeDot = document.getElementById('heroModeDotV2');
        const modeText = document.getElementById('heroModeTextV2');
        const syncBadge = document.getElementById('heroSyncBadgeV2');
        const isOnline = navigator.onLine;

        if (modeBadge) {
            if (isOnline) {
                modeBadge.className = 'hero-badge-v2 online';
                if (modeDot) modeDot.textContent = '●';
                if (modeText) modeText.textContent = '在线';
            } else {
                modeBadge.className = 'hero-badge-v2 offline';
                if (modeDot) modeDot.textContent = '●';
                if (modeText) modeText.textContent = '离线';
            }
        }
        if (syncBadge) syncBadge.textContent = isOnline ? `↻ ${formatHeroSyncLabel()}` : '📴 离线缓存';

        const modeBadgeV3 = document.getElementById('heroModeBadgeV3');
        const modeDotV3 = document.getElementById('heroModeDotV3');
        const modeTextV3 = document.getElementById('heroModeTextV3');
        const syncBadgeV3 = document.getElementById('heroSyncBadgeV3');
        if (modeBadgeV3) {
            if (isOnline) {
                modeBadgeV3.className = 'hero-v3-badge hero-v3-badge--online';
                if (modeDotV3) modeDotV3.style.background = '#4ade80';
                if (modeTextV3) modeTextV3.textContent = '在线';
            } else {
                modeBadgeV3.className = 'hero-v3-badge hero-v3-badge--offline';
                if (modeDotV3) modeDotV3.style.background = '#fde68a';
                if (modeTextV3) modeTextV3.textContent = '离线';
            }
        }
        if (syncBadgeV3) {
            syncBadgeV3.innerHTML = isOnline
                ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg> ${formatHeroSyncLabel()}`
                : '📴 离线缓存';
        }

        this.updateInfoCards();
    },

    startSyncPolling() {
        setInterval(() => {
            this.updateSyncStatus();
            this.updateInfoCards();
            this.updateV3Weather();
        }, 30000);
    },

    updateV3Weather() {
        const tempEl = document.getElementById('heroTempV3');
        const descEl = document.getElementById('heroWeatherDescV3');
        const iconEl = document.getElementById('heroWeatherIconV3');
        if (tempEl && descEl) {
            const temp = document.getElementById('currentTemp')?.textContent?.trim();
            const desc = document.getElementById('weatherDesc')?.textContent?.trim();
            if (temp) tempEl.textContent = temp;
            if (desc) {
                descEl.textContent = desc;
                if (iconEl) iconEl.innerHTML = this.getWeatherSvgForV3(desc);
            }
        }
    },

    getWeatherSvgForV3(desc) {
        if (!desc) return '<svg viewBox="0 0 24 24" fill="none" stroke="#ffd93d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
        const d = desc.toLowerCase();
        if (d.includes('晴')) return '<svg viewBox="0 0 24 24" fill="none" stroke="#ffd93d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
        if (d.includes('多云')) return '<svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>';
        if (d.includes('阴')) return '<svg viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/></svg>';
        if (d.includes('雨')) return '<svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6M8 14v6M12 16v6"/></svg>';
        return '<svg viewBox="0 0 24 24" fill="none" stroke="#ffd93d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    }
};

// ==================== Loading 遮罩 ====================
const LoadingManager = {
    show(text = '加载中...') {
        let overlay = document.querySelector('.loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `<div class="loading-spinner-large"></div><div class="loading-text">${text}</div>`;
            document.body.appendChild(overlay);
        } else {
            overlay.querySelector('.loading-text').textContent = text;
            overlay.classList.remove('hidden');
        }
    },

    hide() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            setTimeout(() => overlay.remove(), 500);
        }
    }
};

// ==================== Toast 通知 ====================
const ToastManager = {
    activeToast: null,

    show(message, type = 'info', duration = 3000) {
        if (this.activeToast) {
            this.activeToast.classList.remove('show');
            setTimeout(() => {
                this.activeToast?.remove();
                this.activeToast = null;
            }, 200);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        this.activeToast = toast;
        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
                if (this.activeToast === toast) this.activeToast = null;
            }, 300);
        }, duration);
    }
};

// 全局函数兼容
window.showToast = (message, type = 'info', duration = 3000) => ToastManager.show(message, type, duration);

// ==================== 离线检测 ====================
const OnlineOfflineManager = {
    init() {
        this.updateStatus();
        window.addEventListener('online', () => this.updateStatus());
        window.addEventListener('offline', () => this.updateStatus());
    },

    updateStatus() {
        const isOnline = navigator.onLine;
        let indicator = document.querySelector('.offline-indicator');

        if (!isOnline) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'offline-indicator';
                indicator.innerHTML = '📴 离线模式 - 部分功能可能不可用';
                document.body.appendChild(indicator);
            }
            indicator.classList.add('show');
        } else if (indicator) {
            indicator.classList.remove('show');
            setTimeout(() => indicator.remove(), 3000);
        }

        document.querySelectorAll('.online-only').forEach(el => {
            el.style.display = isOnline ? '' : 'none';
        });
        document.querySelectorAll('.offline-only').forEach(el => {
            el.style.display = isOnline ? 'none' : '';
        });

        if (window.updateHeroDashboard) window.updateHeroDashboard();
        if (window.HomePageManager && window.HomePageManager.updateSyncStatus) {
            window.HomePageManager.updateSyncStatus();
        }
    }
};

// ==================== 下拉刷新 ====================
const PullToRefresh = {
    startY: 0,
    currentY: 0,
    threshold: 100,

    init() {
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                this.startY = e.touches[0].clientY;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (window.scrollY !== 0) return;
            this.currentY = e.touches[0].clientY;
            const distance = this.currentY - this.startY;
            if (distance > 0 && distance < 200) {
                e.preventDefault();
                this.showPullIndicator(distance);
            }
        }, { passive: false });

        document.addEventListener('touchend', () => {
            const distance = this.currentY - this.startY;
            if (distance > this.threshold) {
                this.refresh();
            } else {
                this.hidePullIndicator();
            }
        });
    },

    showPullIndicator(distance) {
        let indicator = document.querySelector('.pull-to-refresh');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'pull-to-refresh';
            indicator.innerHTML = '<div class="spinner"><div class="loading-spinner"></div></div>';
            document.body.insertBefore(indicator, document.body.firstChild);
        }
        const height = Math.min(distance, 100);
        indicator.style.height = height + 'px';
        indicator.classList.add('active');
        if (indicator.querySelector('.spinner')) {
            indicator.querySelector('.spinner').innerHTML = distance > this.threshold ? '松开刷新' : '<div class="loading-spinner"></div>';
        }
    },

    hidePullIndicator() {
        const indicator = document.querySelector('.pull-to-refresh');
        if (indicator) {
            indicator.classList.remove('active');
            indicator.style.height = '0';
            setTimeout(() => indicator.remove(), 300);
        }
    },

    refresh() {
        this.hidePullIndicator();
        LoadingManager.show('刷新中...');
        setTimeout(() => {
            if (document.getElementById('weather') && window.refreshWeather) window.refreshWeather();
            if (document.getElementById('pressure') && window.refreshPressure) window.refreshPressure();
            LoadingManager.hide();
            ToastManager.show('刷新成功', 'success');
        }, 1000);
    }
};

// ==================== 触摸滑动 ====================
const SwipeManager = {
    startX: 0,
    startY: 0,

    init() {
        document.addEventListener('touchstart', (e) => {
            this.startX = e.touches[0].clientX;
            this.startY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const diffX = endX - this.startX;
            if (Math.abs(diffX) > 50) {
                const pages = ['home', 'weather', 'chase', 'trail', 'sos', 'roadbook', 'ai', 'pressure', 'alert', 'gear', 'teammate'];
                const currentPage = pages.find(id => document.getElementById(id)?.classList.contains('active'));
                const currentIndex = pages.indexOf(currentPage);
                if (diffX > 0 && currentIndex > 0 && window.showPage) {
                    window.showPage(pages[currentIndex - 1]);
                } else if (diffX < 0 && currentIndex < pages.length - 1 && window.showPage) {
                    window.showPage(pages[currentIndex + 1]);
                }
            }
        }, { passive: true });
    }
};

// ==================== 震动反馈 ====================
const HapticManager = {
    supported: 'vibrate' in navigator,
    trigger(pattern) {
        if (this.supported) navigator.vibrate(pattern);
    },
    success() { this.trigger(50); },
    error() { this.trigger([50, 30, 50]); },
    warning() { this.trigger([100, 50, 100]); }
};

// ==================== V3 UI 初始化 ====================
function initV3UI() {
    document.querySelectorAll('.nav-v3-menu button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (window.navigateTo) window.navigateTo(page);
        });
    });

    document.querySelectorAll('.feature-card-v3, .info-card-v3').forEach(card => {
        card.addEventListener('click', () => {
            const target = card.dataset.targetPage;
            if (target && window.navigateTo) window.navigateTo(target);
        });
    });

    const navV3 = document.getElementById('mainNav');
    if (navV3) {
        let lastScrollY = 0;
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            navV3.style.top = scrollY > 80 ? (scrollY > lastScrollY ? '-70px' : '0.5rem') : '0.5rem';
            lastScrollY = scrollY;
        }, { passive: true });

        navV3.addEventListener('click', (e) => {
            if (e.target.closest('.nav-v3-menu button')) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
}

function initHeroParticles() {
    const container = document.getElementById('heroParticles');
    if (!container || container.children.length > 0) return;
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'hero-v3-particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (8 + Math.random() * 12) + 's';
        p.style.animationDelay = Math.random() * 10 + 's';
        p.style.width = (2 + Math.random() * 4) + 'px';
        p.style.height = p.style.width;
        container.appendChild(p);
    }
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));
}

function syncNavIndicatorV3(page) {
    document.querySelectorAll('.nav-v3-menu button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });
}

function getWeatherSvg(weather) {
    const iconMap = {
        'sunny': '<svg viewBox="0 0 24 24" fill="none" stroke="#ffd93d" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
        'cloudy': '<svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
        'rainy': '<svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6M8 14v6M12 16v6"/></svg>',
        'overcast': '<svg viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/></svg>',
        'night': '<svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    };
    if (weather && typeof weather === 'string') {
        const w = weather.toLowerCase();
        if (w.includes('晴')) return iconMap['sunny'];
        if (w.includes('多云')) return iconMap['cloudy'];
        if (w.includes('阴')) return iconMap['overcast'];
        if (w.includes('雨')) return iconMap['rainy'];
        if (w.includes('夜')) return iconMap['night'];
    }
    return iconMap['sunny'];
}

// 全局导出
window.HomePageManager = HomePageManager;
window.LoadingManager = LoadingManager;
window.ToastManager = ToastManager;
window.OnlineOfflineManager = OnlineOfflineManager;
window.PullToRefresh = PullToRefresh;
window.SwipeManager = SwipeManager;
window.HapticManager = HapticManager;
window.heroLastSyncAt = heroLastSyncAt;
window.formatHeroSyncLabel = formatHeroSyncLabel;
window.clearBrandIntroTimers = clearBrandIntroTimers;
window.prefersReducedMotion = prefersReducedMotion;
window.initV3UI = initV3UI;
window.initHeroParticles = initHeroParticles;
window.initScrollAnimations = initScrollAnimations;
window.syncNavIndicatorV3 = syncNavIndicatorV3;
window.getWeatherSvg = getWeatherSvg;

export {
    HomePageManager, LoadingManager, ToastManager,
    OnlineOfflineManager, PullToRefresh, SwipeManager, HapticManager,
    formatHeroSyncLabel, prefersReducedMotion,
    initV3UI, initHeroParticles, initScrollAnimations,
    syncNavIndicatorV3, getWeatherSvg
};
