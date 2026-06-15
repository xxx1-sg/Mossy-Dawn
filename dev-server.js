/**
 * 晓山青 Viridiore - 本地开发服务器（带环境变量注入）
 *
 * 功能：
 *   - 加载 .env 中的 API 密钥
 *   - 将密钥注入到 HTML 中（window.__ENV__）
 *   - 提供静态文件服务
 *
 * 使用方法：
 *   node dev-server.js
 *
 * 然后在浏览器打开 http://localhost:8080/app.html
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 手动加载 .env 文件（不依赖 dotenv，无需 npm install）
const ENV_FILE = path.join(__dirname, '.env');
if (fs.existsSync(ENV_FILE)) {
    const lines = fs.readFileSync(ENV_FILE, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        // 去除引号
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (key) process.env[key] = value;
    }
}

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;

// MIME 类型映射
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
};

/**
 * 将 window.__ENV__ 注入到 HTML 文件中
 * 在 </head> 之前插入内联脚本
 */
function injectEnvVars(html) {
    const envScript = `<script>
window.__ENV__ = {
    VITE_AMAP_KEY: ${JSON.stringify(process.env.VITE_AMAP_KEY || 'YOUR_AMAP_KEY')},
    VITE_AMAP_SECURITY_CODE: ${JSON.stringify(process.env.VITE_AMAP_SECURITY_CODE || 'YOUR_SECURITY_CODE')},
    VITE_HEWEATHER_KEY: ${JSON.stringify(process.env.VITE_HEWEATHER_KEY || 'YOUR_HEWEATHER_KEY')},
    VITE_WEATHER_API_KEY: ${JSON.stringify(process.env.VITE_WEATHER_API_KEY || '')}
};
</script>`;

    // 在 </head> 之前插入
    const idx = html.lastIndexOf('</head>');
    if (idx === -1) {
        // 没有 </head>，插到 <body> 之前
        const bodyIdx = html.indexOf('<body');
        if (bodyIdx === -1) return envScript + '\n' + html;
        return html.slice(0, bodyIdx) + envScript + '\n' + html.slice(bodyIdx);
    }
    return html.slice(0, idx) + envScript + '\n' + html.slice(idx);
}

/**
 * NMC 中央气象台代理
 * 用 https.request 转发请求，加上合法 Referer 绕过反爬
 */
function proxyNmc(req, res, apiPath) {
    // 取查询字符串
    const qs = req.url.split('?')[1] || '';
    const targetUrl = `https://www.nmc.cn${apiPath}${qs ? '?' + qs : ''}`;

    const url = new URL(targetUrl);
    const opts = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: req.method,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.nmc.cn/publish/alarm.html',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9'
        }
    };

    const proxyReq = require('https').request(opts, proxyRes => {
        res.writeHead(proxyRes.statusCode, {
            'Content-Type': proxyRes.headers['content-type'] || 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=60'
        });
        proxyRes.pipe(res);
    });

    proxyReq.on('error', err => {
        console.error('[NMC 代理] 失败:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'NMC 代理失败: ' + err.message }));
    });

    proxyReq.end();
}

const server = http.createServer((req, res) => {
    // 去掉查询参数
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';

    // ===== 代理路由：CORS 绕道 =====
    // 1. NMC 中央气象台预警代理
    if (urlPath === '/api/nmc/alarm') {
        proxyNmc(req, res, '/rest/findAlarm');
        return;
    }
    // 2. NMC 预警详情代理
    if (urlPath.startsWith('/api/nmc/alarmDetail')) {
        const detailPath = urlPath.replace('/api/nmc', '');
        proxyNmc(req, res, detailPath);
        return;
    }

    const filePath = path.join(ROOT, urlPath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';

    // 安全检查：防止路径穿越
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(`文件未找到: ${urlPath}`);
            return;
        }

        res.writeHead(200, { 'Content-Type': mime });

        // HTML 文件注入环境变量
        if (ext === '.html') {
            let html = data.toString('utf8');
            html = injectEnvVars(html);
            res.end(html);
        } else {
            res.end(data);
        }
    });
});

server.listen(PORT, () => {
    console.log('========================================');
    console.log('  晓山青 Viridiore - 本地开发服务器');
    console.log('========================================');
    console.log(`  已启动: http://localhost:${PORT}/app.html`);
    console.log('');
    console.log('  已注入的环境变量:');
    if (process.env.VITE_AMAP_KEY && process.env.VITE_AMAP_KEY !== 'YOUR_AMAP_KEY') {
        console.log('    [x] VITE_AMAP_KEY');
    } else {
        console.log('    [ ] VITE_AMAP_KEY (未配置)');
    }
    if (process.env.VITE_HEWEATHER_KEY && process.env.VITE_HEWEATHER_KEY !== 'YOUR_HEWEATHER_KEY') {
        console.log('    [x] VITE_HEWEATHER_KEY');
    } else {
        console.log('    [ ] VITE_HEWEATHER_KEY (未配置)');
    }
    if (process.env.VITE_WEATHER_API_KEY) {
        console.log('    [x] VITE_WEATHER_API_KEY');
    } else {
        console.log('    [ ] VITE_WEATHER_API_KEY (未配置)');
    }
    console.log('');
    console.log('  按 Ctrl+C 停止服务器');
    console.log('========================================');
});
