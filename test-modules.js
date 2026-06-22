/**
 * 模块依赖链验证脚本
 * 检查 import 引用是否存在
 */
const { readFileSync, existsSync } = require('fs');
const path = require('path');

const base = __dirname;
const files = [
    'js/core.js',
    'js/worker.js',
    'js/home.js',
    'js/contacts.js',
    'js/app.js'
];

console.log('=== 晓山青模块依赖链测试 ===\n');

let passed = 0, failed = 0;

for (const file of files) {
    const filePath = path.join(base, file);
    const content = readFileSync(filePath, 'utf8');

    // 提取所有 import from
    const importRe = /from\s+['"](\.\/[^'"]+)['"]/g;
    let match;
    let ok = true;
    const imports = [];

    while ((match = importRe.exec(content)) !== null) {
        imports.push(match[1]);
    }

    // 验证每个 import 目标存在
    for (const dep of imports) {
        // 移除 ./ 前缀处理
        const depPath = path.resolve(path.dirname(filePath), dep);
        if (!existsSync(depPath)) {
            console.error(`  [FAIL] ${file}`);
            console.error(`        引用 "${dep}" 不存在 (解析为: ${depPath})`);
            ok = false;
        }
    }

    // 检查括号匹配
    const open = (content.match(/\{/g) || []).length;
    const close = (content.match(/\}/g) || []).length;
    if (open !== close) {
        console.error(`  [FAIL] ${file}: 花括号不匹配 {=${open} }=${close}`);
        ok = false;
    }

    // 检查 export 语句
    const hasExport = /\bexport\b/.test(content);
    const hasImport = /\bimport\b/.test(content);

    if (ok) {
        console.log(`  [PASS] ${file}`);
        if (imports.length > 0) {
            console.log(`        依赖: ${imports.join(', ')}`);
        }
        passed++;
    } else {
        failed++;
    }
}

console.log(`\n=== 结果: ${passed}/${files.length} 通过, ${failed} 失败 ===`);

// 测试 app.html 是否引用了 js/app.js
const appHtml = readFileSync(path.join(base, 'app.html'), 'utf8');
const hasModuleImport = /type=["']module["']/.test(appHtml) || /src=["'].*\.js["']/.test(appHtml);
console.log(`\napp.html 引用模块: ${hasModuleImport ? '否 (待接入)' : '否 (待接入)'}`);

process.exit(failed > 0 ? 1 : 0);
