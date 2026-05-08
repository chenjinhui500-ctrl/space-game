import fs from 'node:fs';
import path from 'node:path';

const outDir = path.join(process.cwd(), 'public', 'assets');
fs.mkdirSync(outDir, { recursive: true });

const assets: Record<string, [string, string]> = {
  ship_player: ['#67e8f9', '🚀'], enemy_low: ['#fb7185', '•'], enemy_mid: ['#fb923c', '✦'], enemy_high: ['#c084fc', '◆'],
  planet_low: ['#86efac', ''], planet_mid: ['#60a5fa', ''], planet_high: ['#a78bfa', ''], planet_neutral: ['#34d399', '★'],
  coin: ['#facc15', '$'], xp: ['#38bdf8', '✧'], tech: ['#c084fc', '⚙'], black_box: ['#334155', '?'], minimap_icon: ['#7dd3fc', '•'], ui_panel: ['#0f1f45', ''],
  weapon_laser: ['#22d3ee', 'L'], weapon_missile: ['#fb923c', 'M'], weapon_drone: ['#a3e635', 'D'], weapon_shield: ['#60a5fa', 'S'], weapon_emp: ['#f0abfc', 'E'], weapon_blackhole: ['#111827', 'B'],
  civ_hive: ['#fb7185', 'H'], civ_machine: ['#94a3b8', 'M'], civ_crystal: ['#67e8f9', 'C'], civ_gravity: ['#818cf8', 'G'], civ_void: ['#312e81', 'V'], civ_time: ['#fde68a', 'T'], civ_core: ['#f472b6', 'Ω']
};

function svg([color, label]: [string, string]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><filter id="shadow"><feDropShadow dx="0" dy="5" stdDeviation="3" flood-opacity=".28"/></filter></defs><rect width="128" height="128" rx="32" fill="#101b3d"/><g filter="url(#shadow)"><circle cx="64" cy="64" r="42" fill="${color}" stroke="#07122e" stroke-width="8"/><circle cx="49" cy="48" r="10" fill="#fff" opacity=".48"/><path d="M34 78c16 18 44 20 62 0" fill="none" stroke="#07122e" stroke-width="7" stroke-linecap="round" opacity=".55"/><text x="64" y="76" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="34" text-anchor="middle" fill="#07122e" font-weight="900">${label}</text></g></svg>`;
}

for (const [name, spec] of Object.entries(assets)) {
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg(spec));
}

console.log(`Generated ${Object.keys(assets).length} rounded cartoon SVG assets in public/assets`);
