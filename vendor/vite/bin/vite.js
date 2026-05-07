#!/usr/bin/env node
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';

const root = process.cwd();
const tmp = join(root, '.vite-temp');
const args = process.argv.slice(2);
const command = args.find(a => !a.startsWith('--')) || 'dev';
const isBuild = command === 'build';
const isPreview = command === 'preview';
const portArg = args.find(a => a.startsWith('--port='));
const port = portArg ? Number(portArg.split('=')[1]) : isPreview ? 4173 : 5173;

function transpileTs(source) {
  return stripTypeScriptTypes(source, { mode: 'transform' });
}

function compile() {
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  let js = transpileTs(readFileSync(join(root, 'src', 'main.ts'), 'utf8'));
  js = js.replace(/import\s+['"]\.\/styles\.css['"];?\s*/g, '');
  js = js.replace(/import\s+Phaser\s+from\s+['"]phaser['"];?/, "import Phaser from '/node_modules/phaser/index.js';");
  writeFileSync(join(tmp, 'main.js'), js);
  return js;
}

function contentType(file) {
  return ({ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.ts':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.json':'application/json' })[extname(file)] || 'application/octet-stream';
}

function transformIndex(html, build = false) {
  const link = '<link rel="stylesheet" href="/src/styles.css"/>';
  html = html.includes('src/styles.css') ? html : html.replace('</head>', `${link}</head>`);
  if (build) html = html.replace('/src/main.ts', './assets/main.js').replace('/src/styles.css', './assets/styles.css');
  return html;
}

if (isBuild) {
  let js = compile();
  const dist = join(root, 'dist');
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(join(dist, 'assets'), { recursive: true });
  if (existsSync(join(root, 'public'))) cpSync(join(root, 'public'), dist, { recursive: true });
  js = js.replace("import Phaser from '/node_modules/phaser/index.js';", "import Phaser from './phaser.js';");
  writeFileSync(join(dist, 'assets', 'main.js'), js);
  writeFileSync(join(dist, 'assets', 'phaser.js'), readFileSync(join(root, 'vendor', 'phaser', 'index.js')));
  writeFileSync(join(dist, 'assets', 'styles.css'), readFileSync(join(root, 'src', 'styles.css')));
  writeFileSync(join(dist, 'index.html'), transformIndex(readFileSync(join(root, 'index.html'), 'utf8'), true));
  console.log('vite v7.1.12 local-offline build complete: dist/');
  process.exit(0);
}

compile();
const staticRoot = isPreview ? join(root, 'dist') : root;
const server = createServer((req, res) => {
  try {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url === '/' || url === '/index.html') {
      const file = join(staticRoot, 'index.html');
      const html = isPreview ? readFileSync(file, 'utf8') : transformIndex(readFileSync(file, 'utf8'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); return;
    }
    if (!isPreview && url === '/src/main.ts') {
      const js = compile();
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' }); res.end(js); return;
    }
    const file = resolve(staticRoot, url.slice(1));
    if (!file.startsWith(staticRoot) || !existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': contentType(file) }); res.end(readFileSync(file));
  } catch (err) { res.writeHead(500, { 'content-type': 'text/plain' }); res.end(String(err?.stack || err)); }
});
server.listen(port, '0.0.0.0', () => console.log(`  VITE v7.1.12  ready in local-offline ${isPreview ? 'preview' : 'dev'} mode\n\n  ➜  Local:   http://localhost:${port}/\n`));
