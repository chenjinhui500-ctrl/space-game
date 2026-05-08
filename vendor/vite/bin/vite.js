#!/usr/bin/env node
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tmp = join(root, '.vite-temp');
const args = process.argv.slice(2);
const isBuild = args[0] === 'build';
const portArg = args.find(a => a.startsWith('--port='));
const port = portArg ? Number(portArg.split('=')[1]) : 5173;

function compile() {
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const tsc = spawnSync('tsc', [
    '--outDir', tmp, '--rootDir', 'src', '--module', 'ES2022', '--target', 'ES2022',
    '--moduleResolution', 'bundler', '--skipLibCheck', 'true', '--noEmit', 'false',
    '--declaration', 'false', '--sourceMap', 'false', '--noEmitOnError', 'false'
  ], { cwd: root, encoding: 'utf8' });
  if (tsc.stdout) process.stdout.write(tsc.stdout);
  if (tsc.stderr) process.stderr.write(tsc.stderr);
  const main = join(tmp, 'main.js');
  if (!existsSync(main)) throw new Error('TypeScript emit failed: .vite-temp/main.js was not created');
  let js = readFileSync(main, 'utf8');
  js = js.replace(/import\s+['"]\.\/styles\.css['"];?\s*/g, '');
  js = js.replace(/import\s+Phaser\s+from\s+['"]phaser['"];?/, "import Phaser from '/node_modules/phaser/index.js';");
  writeFileSync(main, js);
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
  js = js.replaceAll('`/assets/${key}.svg`', '`./assets/${key}.svg`');
  writeFileSync(join(dist, 'assets', 'main.js'), js);
  writeFileSync(join(dist, 'assets', 'phaser.js'), readFileSync(join(root, 'vendor', 'phaser', 'index.js')));
  writeFileSync(join(dist, 'assets', 'styles.css'), readFileSync(join(root, 'src', 'styles.css')));
  writeFileSync(join(dist, 'index.html'), transformIndex(readFileSync(join(root, 'index.html'), 'utf8'), true));
  console.log('vite v7.1.12 local-offline build complete: dist/');
  process.exit(0);
}

compile();
const server = createServer((req, res) => {
  try {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url === '/' || url === '/index.html') {
      const html = transformIndex(readFileSync(join(root, 'index.html'), 'utf8'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); return;
    }
    if (url === '/src/main.ts') {
      const js = compile();
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' }); res.end(js); return;
    }
    const file = resolve(root, url.slice(1));
    if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': contentType(file) }); res.end(readFileSync(file));
  } catch (err) { res.writeHead(500, { 'content-type': 'text/plain' }); res.end(String(err?.stack || err)); }
});
server.listen(port, '0.0.0.0', () => console.log(`  VITE v7.1.12  ready in local-offline mode\n\n  ➜  Local:   http://localhost:${port}/\n`));
