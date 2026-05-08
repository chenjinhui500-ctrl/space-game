#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const args = process.argv.slice(2);
const command = args[0] || 'dev';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.ts': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml; charset=utf-8' };

function stripTypeScript(source) {
  let output = source
    .replace(/^type .*$/gm, '')
    .replace(/document\.querySelector<[^>]+>/g, 'document.querySelector')
    .replace(/\(window as any\)/g, 'window')
    .replace(/let pointerStick: null \| \{[^}]+\} = null;/, 'let pointerStick = null;')
    .replace(/function spawnGuard\(planet: Pick<Planet, 'x' \| 'y' \| 'kind'>\)/, 'function spawnGuard(planet)')
    .replace(/\b(const|let|var)(\s+[A-Za-z_$][\w$]*)\s*:\s*[^=;]+(?=\s*[=;])/g, '$1$2')
    .replace(/\)!/g, ')');

  output = output.replace(/function\s+([A-Za-z_$][\w$]*)\(([^)]*)\)/g, (match, name, params) => {
    const cleaned = params.split(',').map((param) => param.replace(/\s*:\s*.*$/, '')).join(',');
    return `function ${name}(${cleaned})`;
  });
  return output;
}

function transformMain(source) {
  return stripTypeScript(source)
    .replace("import Phaser from 'phaser';", "import Phaser from './phaser.js';")
    .replace('import \"./styles.css\";', '')
    .replace("import './styles.css';", '');
}


function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  mkdir(to);
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

function build() {
  fs.rmSync('dist', { recursive: true, force: true });
  mkdir('dist/assets');
  copyDir('public', 'dist');
  fs.copyFileSync('src/styles.css', 'dist/assets/styles.css');
  fs.copyFileSync('vendor/phaser/index.js', 'dist/assets/phaser.js');
  fs.writeFileSync('dist/assets/main.js', transformMain(fs.readFileSync('src/main.ts', 'utf8')));
  fs.writeFileSync('dist/index.html', '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/><title>迷失深空：远征者</title><link rel="stylesheet" href="./assets/styles.css?v=clean-game-2"/></head><body><div id="app"><div class="boot-card"><h1>迷失深空：远征者</h1><p>正在加载在线试玩...</p></div></div><script type="module" src="./assets/main.js?v=clean-game-2"></script></body></html>');
  console.log('Clean Vite build complete: dist/');
}

function serve(base, port) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = url === '/' ? 'index.html' : url.slice(1);
    if (file === 'src/main.ts') {
      res.setHeader('content-type', mime['.ts']);
      res.end(transformMain(fs.readFileSync('src/main.ts', 'utf8')).replace('./phaser.js', '/assets/phaser.js'));
      return;
    }
    if (file === 'assets/phaser.js' && !fs.existsSync(path.join(base, file))) file = 'vendor/phaser/index.js';
    const full = path.join(base, file);
    if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.setHeader('content-type', mime[path.extname(full)] || 'application/octet-stream');
    res.end(fs.readFileSync(full));
  });
  server.listen(port, () => console.log(`Local Vite ${command} server running at http://localhost:${port}/`));
}

const portFlag = args.findIndex((item) => item === '--port');
const inlinePort = args.find((item) => item.startsWith('--port='));
const port = Number(inlinePort?.split('=')[1] || (portFlag >= 0 ? args[portFlag + 1] : '')) || Number(process.env.PORT) || (command === 'preview' ? 4173 : 5173);
if (command === 'build') build();
else if (command === 'preview') serve('dist', port);
else serve('.', port);
