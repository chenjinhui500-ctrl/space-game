import fs from 'node:fs';

const required = ['package.json', 'index.html', 'src/main.ts', 'src/styles.css', 'scripts/generate-assets.ts', 'scripts/verify-runtime.mjs', 'public/assets', 'README.md', 'dist/index.html', 'dist/assets/main.js'];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing required file: ${file}`);
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const scriptName of ['dev', 'build', 'preview', 'generate:assets']) {
  if (!packageJson.scripts?.[scriptName]) throw new Error(`Missing npm script: ${scriptName}`);
}
if (!String(packageJson.dependencies?.phaser || '').includes('vendor/phaser')) throw new Error('Expected Phaser dependency to be available as a local file dependency for restricted CI.');
if (!String(packageJson.devDependencies?.vite || '').includes('vendor/vite')) throw new Error('Expected Vite dependency to be available as a local file dependency for restricted CI.');

const svgCount = fs.readdirSync('public/assets').filter((name) => name.endsWith('.svg')).length;
if (svgCount < 27) throw new Error(`Expected at least 27 SVG assets, found ${svgCount}.`);

const main = fs.readFileSync('src/main.ts', 'utf8');
const markers = ['new Phaser.Game', '迷失深空：远征者', 'startRun', 'createPlanet', 'spawnGuard', 'autoAttack', 'dropLoot', '升级三选一', '中立星球停靠', '七大终极文明苏醒', 'finishRun', 'blackBox', 'localStorage', '__LDSD_VERIFY__'];
for (const marker of markers) {
  if (!main.includes(marker)) throw new Error(`Missing gameplay marker: ${marker}`);
}

const builtIndex = fs.readFileSync('dist/index.html', 'utf8');
if (!builtIndex.includes('./assets/main.js')) throw new Error('Build output must use relative ./assets/main.js for GitHub Pages.');

console.log('Clean game runtime verification passed.');
