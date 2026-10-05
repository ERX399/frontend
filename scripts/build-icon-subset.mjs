/**
 * 扫描源码里用到的图标名（`icon="prefix:name"`），从 @iconify-json/* 抽成
 * lib/icons/subset.json，供 components/ui/icon.tsx 在 SSR 与客户端直接查表出 SVG。
 *
 * 为什么不用 @iconify/react 的运行时：它固定等 mount 后才填图标，SSR 出空 span、
 * 水合出 <svg>，结构对不上直接 React #418；而且 51KB 运行时会进每个页面的共享块。
 *
 * 用法: node scripts/build-icon-subset.mjs
 * 新增图标后必须重跑，否则图标名查不到只有空表格。
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'lib', 'icons', 'subset.json');

// 扫描范围：只扫源码，跳过依赖、产物、临时目录
const SCAN_DIRS = ['app', 'components', 'layouts', 'lib'];
const SKIP = new Set(['node_modules', 'dist', '.git']);

// 参与抽取的图标集。multi-color 的集合（如 logos）不在这里，它们的 body
// 自带多段 path，跟本表「单色 currentColor」的假设不符。
const SETS = ['lucide', 'mdi', 'simple-icons', 'ri', 'bi', 'thesvg'];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

/** 收集源码里出现的所有 `prefix:name` 图标名 */
function collectUsed() {
  const used = new Set();
  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
  // 也扫一下根目录的 ts 配置类文件
  for (const f of readdirSync(ROOT)) {
    if (/\.(tsx?|jsx?)$/.test(f)) files.push(join(ROOT, f));
  }

  const re = /icon=\{?["'`]([a-z0-9-]+:[a-z0-9-]+)["'`]/g;
  for (const file of files) {
    const src = readFileSync(file, 'utf-8');
    let m;
    while ((m = re.exec(src))) used.add(m[1]);
  }
  return used;
}

/** 从某个集合里取出 iconify JSON 的图标定义（含 alias 解析） */
function extract(setName, used) {
  let data;
  try {
    data = JSON.parse(readFileSync(join(ROOT, 'node_modules', `@iconify-json/${setName}`, 'icons.json'), 'utf-8'));
  } catch {
    return null;
  }

  const icons = {};
  const aliases = data.aliases ?? {};
  const want = [...used].filter((n) => n.startsWith(`${setName}:`)).map((n) => n.slice(setName.length + 1));

  const resolve = (name, depth = 0) => {
    if (depth > 5) return null;
    if (data.icons[name]) return data.icons[name];
    const alias = aliases[name];
    if (alias?.parent) {
      const parent = resolve(alias.parent, depth + 1);
      if (!parent) return null;
      // alias 可以只覆盖 transform，body 继承 parent
      return { ...parent, ...alias, parent: undefined };
    }
    return null;
  };

  for (const name of want) {
    const def = resolve(name);
    if (def?.body) {
      icons[name] = { body: def.body };
      if (def.width) icons[name].width = def.width;
      if (def.height) icons[name].height = def.height;
      if (def.left) icons[name].left = def.left;
      if (def.top) icons[name].top = def.top;
    }
  }

  if (Object.keys(icons).length === 0) return null;
  return {
    prefix: setName,
    icons,
    width: data.width ?? 24,
    height: data.height ?? 24,
  };
}

const used = collectUsed();
console.log(`扫到 ${used.size} 个图标名`);

const subset = {};
for (const set of SETS) {
  const part = extract(set, used);
  if (part) {
    subset[set] = part;
    console.log(`  ${set}: ${Object.keys(part.icons).length} 个`);
  }
}

writeFileSync(OUT, JSON.stringify(subset), 'utf-8');
console.log(`写入 ${OUT}`);
