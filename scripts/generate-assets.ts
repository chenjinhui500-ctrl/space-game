import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Asset = { name: string; svg: string };
const outDir = join(process.cwd(), 'public', 'assets');
mkdirSync(outDir, { recursive: true });

const badge = (fill: string, stroke = '#10203c', extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><filter id="s"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity=".25"/></filter><g filter="url(#s)"><circle cx="64" cy="64" r="48" fill="${fill}" stroke="${stroke}" stroke-width="8"/>${extra}</g></svg>`;
const assets: Asset[] = [
 {name:'ship_player.svg',svg:`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><g stroke="#10203c" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"><path d="M64 13c25 19 36 53 28 91-16-8-40-8-56 0-8-38 3-72 28-91z" fill="#6ee7ff"/><path d="M40 77 18 94l7-36 18-6z" fill="#ffcf5a"/><path d="m88 77 22 17-7-36-18-6z" fill="#ffcf5a"/><ellipse cx="64" cy="50" rx="18" ry="20" fill="#fff"/><ellipse cx="64" cy="50" rx="10" ry="12" fill="#8f7cff"/><path d="M49 105c8 9 22 9 30 0" fill="#ff7aa8"/></g></svg>`},
 {name:'enemy_low.svg',svg:badge('#75f08a','#10203c','<circle cx="48" cy="55" r="7" fill="#10203c"/><circle cx="80" cy="55" r="7" fill="#10203c"/><path d="M46 82c10 8 26 8 36 0" fill="none" stroke="#10203c" stroke-width="6" stroke-linecap="round"/><path d="M23 43 10 28M105 43l13-15" stroke="#10203c" stroke-width="7" stroke-linecap="round"/>')},
 {name:'enemy_mid.svg',svg:badge('#ffb347','#10203c','<rect x="36" y="38" width="56" height="42" rx="15" fill="#fff" stroke="#10203c" stroke-width="6"/><circle cx="52" cy="58" r="7" fill="#10203c"/><circle cx="76" cy="58" r="7" fill="#10203c"/><path d="M64 20v18M26 64H8M120 64h-18" stroke="#10203c" stroke-width="7" stroke-linecap="round"/>')},
 {name:'enemy_high.svg',svg:badge('#9e8cff','#10203c','<path d="M64 22 92 64 64 106 36 64z" fill="#d8f7ff" stroke="#10203c" stroke-width="6"/><circle cx="64" cy="64" r="14" fill="#ff7aa8" stroke="#10203c" stroke-width="5"/>')},
 {name:'planet_low.svg',svg:badge('#64d96b','#10203c','<path d="M22 72c26-16 57-16 84 0" fill="none" stroke="#a8ffb2" stroke-width="12" stroke-linecap="round"/><circle cx="46" cy="43" r="8" fill="#f6ff8f"/>')},
 {name:'planet_mid.svg',svg:badge('#4dc6ff','#10203c','<path d="M24 50h80M31 82h66" stroke="#fff" stroke-width="10" stroke-linecap="round"/><circle cx="83" cy="39" r="10" fill="#ffcf5a"/>')},
 {name:'planet_high.svg',svg:badge('#c88cff','#10203c','<path d="M35 35 93 93M93 35 35 93" stroke="#fff" stroke-width="9" stroke-linecap="round"/><circle cx="64" cy="64" r="15" fill="#ffe66d"/>')},
 {name:'planet_neutral.svg',svg:badge('#ffe66d','#10203c','<path d="M35 72h58v20H35zM44 49h40v23H44z" fill="#fff" stroke="#10203c" stroke-width="6" stroke-linejoin="round"/><path d="M55 49V35h18v14" fill="none" stroke="#10203c" stroke-width="6" stroke-linecap="round"/>')},
 {name:'coin.svg',svg:badge('#ffd84d','#935f00','<text x="64" y="78" text-anchor="middle" font-size="44" font-family="Arial" font-weight="900" fill="#935f00">¢</text>')},
 {name:'xp.svg',svg:badge('#45f0ff','#10203c','<path d="M64 25 94 64 64 103 34 64z" fill="#dffbff" stroke="#10203c" stroke-width="6"/>')},
 {name:'tech.svg',svg:badge('#ff7ad9','#10203c','<path d="M39 37h50v50H39z" fill="#fff" stroke="#10203c" stroke-width="6"/><path d="M52 52h24v24H52z" fill="#8f7cff"/>')},
 {name:'black_box.svg',svg:badge('#202a44','#7df9ff','<rect x="34" y="44" width="60" height="40" rx="10" fill="#ffcf5a" stroke="#10203c" stroke-width="6"/><circle cx="48" cy="64" r="5" fill="#10203c"/><path d="M62 64h18" stroke="#10203c" stroke-width="6" stroke-linecap="round"/>')},
 {name:'ui_panel.svg',svg:`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect x="14" y="24" width="100" height="80" rx="20" fill="#162a58" stroke="#7df9ff" stroke-width="8"/></svg>`},
 {name:'minimap_icon.svg',svg:badge('#162a58','#7df9ff','<path d="M64 22v84M22 64h84" stroke="#eaf8ff" stroke-width="8" stroke-linecap="round"/><circle cx="64" cy="64" r="12" fill="#7df9ff"/>')},
];
['hive','machine','crystal','gravity','void','time','core'].forEach((n,i)=>assets.push({name:`civ_${n}.svg`,svg:badge(['#7cff8a','#b7c0d8','#b088ff','#55ddff','#3b2a78','#ffd36d','#ff5a79'][i],'#10203c',`<text x="64" y="77" text-anchor="middle" font-size="34" font-family="Arial" font-weight="900" fill="#10203c">${['虫','机','晶','引','虚','时','核'][i]}</text>`) }));
['laser','missile','drone','shield','emp','blackhole'].forEach((n,i)=>assets.push({name:`weapon_${n}.svg`,svg:badge(['#ff5b8a','#ffb347','#79f2ff','#85ffbb','#ffe66d','#7c5cff'][i],'#10203c',`<text x="64" y="77" text-anchor="middle" font-size="30" font-family="Arial" font-weight="900" fill="#10203c">${['光','弹','机','盾','磁','洞'][i]}</text>`) }));

const endpoint = process.env.ASSET_API_ENDPOINT;
const key = process.env.ASSET_API_KEY;
if (endpoint && key) console.log('ASSET_API_* detected; v1 keeps deterministic local SVG fallback for reproducible builds.');
for (const a of assets) writeFileSync(join(outDir, a.name), a.svg);
console.log(`Generated ${assets.length} cute vector placeholder assets in ${outDir}`);
