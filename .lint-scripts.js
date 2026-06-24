/**
 * 提取 app.html 中所有 <script> 标签内容到独立 .js 文件，
 * 用 node --check 做语法校验（不执行）。
 *
 * 跳过：含 type="application/json" 或 type="module" 的纯数据/模块脚本无意义，
 * 正常内联脚本会被原样写出。
 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'app.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let m;
const blocks = [];
let i = 0;
while ((m = scriptRe.exec(html)) !== null) {
    const attrs = m[1] || '';
    const body = m[2] || '';
    // 跳过空 / JSON / 外部 src / module
    if (!body.trim()) continue;
    if (/type\s*=\s*["'](application\/json|module)["']/i.test(attrs)) continue;
    if (/\bsrc\s*=/i.test(attrs)) continue;
    blocks.push({ idx: ++i, body });
}

if (!blocks.length) {
    console.log('未找到内联 <script> 块');
    process.exit(0);
}

const tmpDir = path.join(__dirname, '.lint-scripts');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

const { execSync } = require('child_process');
let allOk = true;
for (const b of blocks) {
    const file = path.join(tmpDir, `block-${String(b.idx).padStart(3, '0')}.js`);
    fs.writeFileSync(file, b.body);
    try {
        execSync(`node --check "${file}"`, { stdio: 'pipe' });
        console.log(`[OK] block #${b.idx} (${b.body.length} bytes)`);
    } catch (e) {
        allOk = false;
        console.error(`[FAIL] block #${b.idx} (${b.body.length} bytes)`);
        const stderr = e.stderr ? e.stderr.toString() : e.message;
        console.error(stderr.split('\n').slice(0, 20).join('\n'));
    }
}

if (allOk) console.log(`\n[ALL OK] ${blocks.length} 个脚本块全部通过 node --check`);
else { console.error(`\n[FAIL] 存在语法错误`); process.exit(1); }
