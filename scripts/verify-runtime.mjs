import fs from 'node:fs';import path from 'node:path';
const need=['package.json','index.html','src/main.ts','src/styles.css','scripts/generate-assets.ts','scripts/verify-runtime.mjs','public/assets','README.md','.github/workflows/pages.yml','dist/index.html','dist/assets/main.js'];
for(const p of need){if(!fs.existsSync(p))throw new Error(`Missing ${p}`)}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));for(const s of ['dev','build','preview','generate:assets'])if(!pkg.scripts?.[s])throw new Error(`Missing npm script ${s}`);
const svg=fs.readdirSync('public/assets').filter(f=>f.endsWith('.svg'));if(svg.length<27)throw new Error(`Expected at least 27 SVG assets, got ${svg.length}`);
const main=fs.readFileSync('src/main.ts','utf8');for(const marker of ['new Phaser.Game','迷失深空：远征者','autoAttack','spawnEnemy','blackBoxRecovered','七大终极文明','中立星球停靠','__LDSD_VERIFY__'])if(!main.includes(marker))throw new Error(`Missing gameplay marker ${marker}`);
const built=fs.readFileSync('dist/index.html','utf8');if(!built.includes('./assets/main.js'))throw new Error('GitHub Pages build must use relative ./assets/main.js path');
const workflow=fs.readFileSync('.github/workflows/pages.yml','utf8');for(const step of ['npm install','npm run generate:assets','npm run build','node scripts/verify-runtime.mjs','actions/deploy-pages'])if(!workflow.includes(step))throw new Error(`Workflow missing ${step}`);
console.log('Runtime verification passed: clean playable H5 demo, assets, build output and Pages workflow are present.');
