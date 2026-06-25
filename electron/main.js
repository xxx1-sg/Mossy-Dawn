/**
 * 晓山青 Viridiore - Electron 主进程
 *
 * 功能：
 *   - 窗口管理与生命周期
 *   - 桌面系统集成（托盘、菜单、通知）
 *   - 环境变量注入
 *   - HTTP 代理（NMC / 和风天气）
 */

const { app, BrowserWindow, Menu, Tray, ipcMain, Notification, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { Zlib } = require('zlib');

// ============================================================
// 环境变量加载（与 dev-server.js 逻辑一致）
// ============================================================
const ENV_FILE = path.join(__dirname, '..', '.env');
if (fs.existsSync(ENV_FILE)) {
    const lines = fs.readFileSync(ENV_FILE, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        let key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        // 去除引号
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (key) process.env[key] = value;
    }
}

// ============================================================
// 应用元数据
// ============================================================
const APP_NAME = '晓山青';
const APP_VERSION = '1.0.0';
const isDev = !app.isPackaged;

// ============================================================
// 全局引用（防止 GC 回收）
// ============================================================
let mainWindow = null;
let tray = null;

// ============================================================
// 主窗口创建
// ============================================================
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        title: `${APP_NAME} Viridiore`,
        icon: path.join(__dirname, '..', 'build', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            webSecurity: true,
        },
        show: false, // 等 ready-to-show 再显示
    });

    // 窗口准备就绪后显示（减少白屏闪烁）
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    // 加载入口页面
    if (isDev) {
        // 开发模式：通过本地服务器加载
        mainWindow.loadURL('http://localhost:8080/app.html');
    } else {
        // 生产模式：app.html 位于 asar 根目录
        mainWindow.loadFile(path.join(__dirname, '..', 'app.html'));
    }

    // 关闭按钮行为：最小化到托盘（而非退出）
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // 允许外部链接用系统浏览器打开
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    return mainWindow;
}

// ============================================================
// 应用菜单
// ============================================================
function createMenu() {
    const isMac = process.platform === 'darwin';

    const template = [
        // macOS 专属应用菜单
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),
        {
            label: '文件',
            submenu: [
                isMac ? { role: 'close' } : { role: 'quit', label: '退出' }
            ]
        },
        {
            label: '编辑',
            submenu: [
                { role: 'undo', label: '撤销' },
                { role: 'redo', label: '重做' },
                { type: 'separator' },
                { role: 'cut', label: '剪切' },
                { role: 'copy', label: '复制' },
                { role: 'paste', label: '粘贴' },
                { role: 'selectAll', label: '全选' },
            ]
        },
        {
            label: '视图',
            submenu: [
                { role: 'reload', label: '刷新' },
                { role: 'forceReload', label: '强制刷新' },
                { role: 'toggleDevTools', label: '开发者工具' },
                { type: 'separator' },
                { role: 'resetZoom', label: '实际大小' },
                { role: 'zoomIn', label: '放大' },
                { role: 'zoomOut', label: '缩小' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: '全屏' },
            ]
        },
        {
            label: '窗口',
            submenu: [
                { role: 'minimize', label: '最小化' },
                { role: 'zoom', label: '缩放' },
                ...(isMac ? [
                    { type: 'separator' },
                    { role: 'front', label: '全部置于顶层' },
                    { type: 'separator' },
                    { role: 'window' }
                ] : [
                    { role: 'close', label: '关闭' }
                ])
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: `关于 ${APP_NAME}`,
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: `关于 ${APP_NAME}`,
                            message: `${APP_NAME} Viridiore`,
                            detail: `版本 ${APP_VERSION}\n\n户外智能出行伴侣\n\n© 2024 晓山青团队`,
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// ============================================================
// 系统托盘
// ============================================================
function createTray() {
    // 托盘图标：优先使用 build/icon.png，降级到内联数据 URI
    let iconPath = path.join(__dirname, '..', 'build', 'icon.png');
    if (!fs.existsSync(iconPath)) {
        // 生成一个简单的 PNG 托盘图标（绿色圆形山峰）
        iconPath = path.join(__dirname, 'tray-icon.png');
        if (!fs.existsSync(iconPath)) {
            // 降级：使用空字符串让 Electron 找默认
            iconPath = path.join(__dirname, '..', 'build', 'icon.ico');
        }
    }

    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示窗口',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        { type: 'separator' },
        {
            label: '天气',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.webContents.send('navigate', 'weather');
                }
            }
        },
        {
            label: '追光',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.webContents.send('navigate', 'chase');
                }
            }
        },
        {
            label: '轨迹',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.webContents.send('navigate', 'trail');
                }
            }
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip(`${APP_NAME} Viridiore`);
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

// ============================================================
// HTTP 代理（与 dev-server.js 功能一致）
// ============================================================

/**
 * NMC 中央气象台代理
 */
function proxyNmc(req, res, apiPath) {
    const qs = req.url.split('?')[1] || '';
    const targetUrl = `https://www.nmc.cn${apiPath}${qs ? '?' + qs : ''}`;
    const url = new URL(targetUrl);

    const opts = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: req.method,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.nmc.cn/publish/alarm.html',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9'
        }
    };

    const proxyReq = https.request(opts, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
            'Content-Type': proxyRes.headers['content-type'] || 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=60'
        });
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('[NMC 代理] 失败:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'NMC 代理失败: ' + err.message }));
    });

    proxyReq.end();
}

/**
 * 和风天气 QWeather 代理
 */
function proxyQWeather(req, res, apiPath, queryString) {
    const apiKey = process.env.VITE_HEWEATHER_KEY;
    if (!apiKey || apiKey === 'YOUR_HEWEATHER_KEY') {
        res.writeHead(503, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            error: 'qweather_no_key',
            msg: '和风天气 API Key 未配置，请在 .env 中设置 VITE_HEWEATHER_KEY'
        }));
        return;
    }

    const apiHost = process.env.VITE_QWEATHER_HOST || 'api.qweather.com';
    const targetUrl = `https://${apiHost}${apiPath}${queryString ? '?' + queryString : ''}`;
    const url = new URL(targetUrl);

    let cacheMaxAge = 1800;
    if (apiPath.includes('/weather/now') || apiPath.includes('/air-quality/')) {
        cacheMaxAge = 60;
    } else if (apiPath.includes('/weather/24h')) {
        cacheMaxAge = 600;
    } else if (apiPath.includes('/weatheralert/')) {
        cacheMaxAge = 300;
    }

    const opts = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: req.method,
        headers: {
            'X-QW-Api-Key': apiKey,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip'
        }
    };

    const proxyReq = https.request(opts, (proxyRes) => {
        const contentEncoding = (proxyRes.headers['content-encoding'] || '').toLowerCase();
        res.writeHead(proxyRes.statusCode, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': `public, max-age=${cacheMaxAge}`
        });

        if (contentEncoding === 'gzip') {
            proxyRes.pipe(Zlib.createGunzip()).pipe(res);
        } else {
            proxyRes.pipe(res);
        }
    });

    proxyReq.on('error', (err) => {
        console.error('[和风代理] 失败:', err.message);
        if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ error: 'qweather_proxy_failed: ' + err.message }));
    });

    proxyReq.end();
}

// 代理服务器（在主进程内运行，处理 /api/* 请求）
let proxyServer = null;

function startProxyServer() {
    proxyServer = http.createServer((req, res) => {
        let urlPath = req.url.split('?')[0];

        if (urlPath === '/api/nmc/alarm') {
            proxyNmc(req, res, '/rest/findAlarm');
            return;
        }
        if (urlPath.startsWith('/api/nmc/alarmDetail')) {
            const detailPath = urlPath.replace('/api/nmc', '');
            proxyNmc(req, res, detailPath);
            return;
        }
        if (urlPath.startsWith('/api/qweather/')) {
            const qwPath = urlPath.replace('/api/qweather', '');
            const qwQuery = req.url.split('?')[1] || '';
            proxyQWeather(req, res, qwPath, qwQuery);
            return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unknown proxy path' }));
    });

    // 随机选一个空闲端口（开发模式下主服务器已在 8080）
    const PORT = isDev ? 8081 : 8080;
    proxyServer.listen(PORT, '127.0.0.1', () => {
        console.log(`[Electron] 代理服务器运行于 http://127.0.0.1:${PORT}`);
    });

    proxyServer.on('error', (err) => {
        console.error('[Electron] 代理服务器错误:', err.message);
    });
}

// ============================================================
// IPC 通信
// ============================================================

// 通知
ipcMain.handle('show-notification', async (event, { title, body }) => {
    if (Notification.isSupported()) {
        new Notification({ title, body }).show();
        return true;
    }
    return false;
});

// 获取环境变量
ipcMain.handle('get-env', async () => {
    return {
        VITE_AMAP_KEY: process.env.VITE_AMAP_KEY || 'YOUR_AMAP_KEY',
        VITE_AMAP_SECURITY_CODE: process.env.VITE_AMAP_SECURITY_CODE || 'YOUR_SECURITY_CODE',
        VITE_HEWEATHER_KEY: process.env.VITE_HEWEATHER_KEY || 'YOUR_HEWEATHER_KEY',
        VITE_WEATHER_API_KEY: process.env.VITE_WEATHER_API_KEY || '',
    };
});

// 获取版本
ipcMain.handle('get-app-version', async () => {
    return APP_VERSION;
});

// 窗口控制
ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});
ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});
ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.hide();
});

// 打开外部链接
ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url);
});

// 获取代理基础 URL
ipcMain.handle('get-proxy-url', async () => {
    const PORT = isDev ? 8081 : 8080;
    return `http://127.0.0.1:${PORT}`;
});

// ============================================================
// 应用生命周期
// ============================================================

app.whenReady().then(() => {
    createMenu();
    createWindow();
    createTray();
    startProxyServer();

    app.on('activate', () => {
        // macOS dock 点击行为
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else if (mainWindow) {
            mainWindow.show();
        }
    });
});

// 所有窗口关闭（macOS 除外）
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    app.isQuitting = true;
    if (proxyServer) {
        proxyServer.close();
    }
});
