import Phaser from 'phaser';
import './styles.css';

window.addEventListener('error', (event) => {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (root) root.innerHTML = `<div class="boot-card"><h1>迷失深空：远征者</h1><p>游戏启动遇到问题，请刷新页面。</p><pre>${event.message}</pre></div>`;
});

type PlanetKind = 'low' | 'mid' | 'high' | 'neutral';
type LootKind = 'coin' | 'xp' | 'tech' | 'blackBox';

type Planet = { x: number; y: number; radius: number; kind: PlanetKind; name: string; angry: boolean; seen: boolean };
type Enemy = { x: number; y: number; hp: number; speed: number; damage: number; kind: 'low' | 'mid' | 'high' };
type Loot = { x: number; y: number; kind: LootKind; value: number; collected: boolean };
type Shot = { x: number; y: number; vx: number; vy: number; life: number; damage: number };

const CIVILIZATIONS = ['虫巢母星', '机械母星', '水晶母星', '引力母星', '虚空母星', '时间母星', '深空核心'];
const SAVE_KEY = 'lost-deep-space-clean-save-v1';
const ASSET_NAMES = ['ship_player', 'enemy_low', 'enemy_mid', 'enemy_high', 'planet_low', 'planet_mid', 'planet_high', 'planet_neutral', 'coin', 'xp', 'tech', 'black_box', 'weapon_laser', 'weapon_missile', 'weapon_drone', 'weapon_shield', 'weapon_emp', 'weapon_blackhole', 'civ_hive', 'civ_machine', 'civ_crystal', 'civ_gravity', 'civ_void', 'civ_time', 'civ_core'];

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = '<div class="boot-card"><h1>迷失深空：远征者</h1><p>正在启动远征...</p></div><canvas id="game"></canvas><div class="loading-note">WASD / 方向键移动 · 自动攻击 · 触摸左下角虚拟摇杆</div>';
const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;
document.querySelector('.boot-card')?.remove();
new Phaser.Game({ title: 'Lost Deep Space: Drifter', type: Phaser.AUTO });

const save = JSON.parse(localStorage.getItem(SAVE_KEY) || '{"bestDay":0,"bestKills":0,"explored":0,"blackBoxes":0,"permanent":{"hp":0,"shield":0,"attack":0,"radar":0,"recycle":0,"discount":0}}');
const state = { mode: 'menu', day: 1, level: 1, xp: 0, coins: 0, tech: 0, kills: 0, explored: 0, dockPrompt: false, dockOpen: false, upgradeOpen: false, blackBoxRecovered: false };
const player = { x: 0, y: 0, hp: 120, maxHp: 120, shield: 60, maxShield: 60, speed: 230, attack: 22, magnet: 130, radar: 900 };
const keys: Record<string, boolean> = {};
let width = 0;
let height = 0;
let lastTime = 0;
let shootCooldown = 0;
let pointerStick: null | { id: number; x: number; y: number; dx: number; dy: number } = null;
let planets: Planet[] = [];
let enemies: Enemy[] = [];
let loot: Loot[] = [];
let shots: Shot[] = [];

function resize() {
  width = canvas.width = Math.floor(innerWidth * devicePixelRatio);
  height = canvas.height = Math.floor(innerHeight * devicePixelRatio);
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

function persist() { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
function distance(ax: number, ay: number, bx: number, by: number) { return Math.hypot(ax - bx, ay - by); }
function assetUrl(name: string) { return new URL(`../assets/${name}.svg`, import.meta.url).href; }

function startRun() {
  Object.assign(state, { mode: 'playing', day: 1, level: 1, xp: 0, coins: 0, tech: 0, kills: 0, explored: 0, dockPrompt: false, dockOpen: false, upgradeOpen: false, blackBoxRecovered: false });
  Object.assign(player, { x: 0, y: 0, maxHp: 120 + save.permanent.hp * 18, hp: 120 + save.permanent.hp * 18, maxShield: 60 + save.permanent.shield * 12, shield: 60 + save.permanent.shield * 12, speed: 230, attack: 22 + save.permanent.attack * 4, magnet: 130, radar: 900 + save.permanent.radar * 80 });
  planets = [];
  enemies = [];
  loot = [];
  shots = [];
  for (let gx = -4; gx <= 4; gx += 1) for (let gy = -4; gy <= 4; gy += 1) createPlanet(gx, gy);
  planets.push({ x: 180, y: 80, radius: 58, kind: 'neutral', name: '晨星港', angry: false, seen: false });
  if (save.blackBox) loot.push({ x: save.blackBox.x, y: save.blackBox.y, kind: 'blackBox', value: Math.max(20, save.blackBox.coins || 0), collected: false });
}

function createPlanet(gx: number, gy: number) {
  const seed = Math.abs(Math.sin(gx * 91.7 + gy * 47.3) * 10000);
  const kinds: PlanetKind[] = ['low', 'mid', 'high'];
  const kind: PlanetKind = (Math.abs(gx) + Math.abs(gy)) % 9 === 0 ? 'neutral' : kinds[Math.floor(seed) % kinds.length];
  planets.push({ x: gx * 780 + (seed % 320) - 160, y: gy * 780 + ((seed * 1.7) % 320) - 160, radius: kind === 'neutral' ? 54 : 72, kind, name: kind === 'neutral' ? '中立星港' : kind === 'low' ? '低等星球' : kind === 'mid' ? '中等星球' : '高等星球', angry: false, seen: false });
}

function spawnGuard(planet: Pick<Planet, 'x' | 'y' | 'kind'>) {
  const kind = planet.kind === 'high' ? 'high' : planet.kind === 'mid' ? 'mid' : 'low';
  enemies.push({ x: planet.x + Math.random() * 160 - 80, y: planet.y + Math.random() * 160 - 80, hp: kind === 'high' ? 85 : kind === 'mid' ? 52 : 32, speed: kind === 'high' ? 105 : kind === 'mid' ? 125 : 150, damage: kind === 'high' ? 18 : kind === 'mid' ? 13 : 9, kind });
}

function update(dt: number) {
  if (state.mode !== 'playing' || state.upgradeOpen || state.dockOpen) return;
  state.day += dt / 60;
  let ax = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  let ay = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  if (pointerStick) { ax = Phaser.Math.Clamp(pointerStick.dx / 55, -1, 1); ay = Phaser.Math.Clamp(pointerStick.dy / 55, -1, 1); }
  const len = Math.hypot(ax, ay) || 1;
  player.x += (ax / len) * player.speed * dt;
  player.y += (ay / len) * player.speed * dt;

  state.dockPrompt = false;
  for (const planet of planets) {
    const d = distance(player.x, player.y, planet.x, planet.y);
    if (!planet.seen && d < player.radar) { planet.seen = true; state.explored += 1; }
    if (planet.kind === 'neutral' && d < planet.radius + 95) state.dockPrompt = true;
    if (planet.kind !== 'neutral' && !planet.angry && d < planet.radius + 230) {
      planet.angry = true;
      for (let i = 0; i < (planet.kind === 'high' ? 8 : 5); i += 1) spawnGuard(planet);
    }
  }
  if (state.day > 3 && Math.random() < dt * 0.7) spawnGuard({ x: player.x + 720 - Math.random() * 1440, y: player.y + 720 - Math.random() * 1440, kind: 'high' });

  for (const enemy of enemies) {
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    enemy.x += Math.cos(angle) * enemy.speed * dt;
    enemy.y += Math.sin(angle) * enemy.speed * dt;
    if (distance(player.x, player.y, enemy.x, enemy.y) < 30) {
      player.shield -= enemy.damage * dt;
      if (player.shield < 0) { player.hp += player.shield; player.shield = 0; }
    }
  }

  shootCooldown -= dt;
  if (shootCooldown <= 0) { autoAttack(); shootCooldown = 0.34; }
  for (const shot of shots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    for (const enemy of enemies) if (enemy.hp > 0 && distance(shot.x, shot.y, enemy.x, enemy.y) < 24) { enemy.hp -= shot.damage; shot.life = 0; }
  }
  shots = shots.filter((shot) => shot.life > 0);
  for (const enemy of enemies.filter((item) => item.hp <= 0)) {
    state.kills += 1;
    dropLoot(enemy.x, enemy.y);
    enemies.splice(enemies.indexOf(enemy), 1);
  }
  for (const item of loot) {
    const d = distance(player.x, player.y, item.x, item.y);
    if (d < player.magnet) { item.x += (player.x - item.x) * dt * 4; item.y += (player.y - item.y) * dt * 4; }
    if (d < 30) collectLoot(item);
  }
  loot = loot.filter((item) => !item.collected);
  player.shield = Math.min(player.maxShield, player.shield + dt * 2.5);
  if (player.hp <= 0) finishRun();
}

function autoAttack() {
  const target = [...enemies].sort((a, b) => distance(player.x, player.y, a.x, a.y) - distance(player.x, player.y, b.x, b.y))[0];
  if (!target) return;
  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  shots.push({ x: player.x, y: player.y, vx: Math.cos(angle) * 650, vy: Math.sin(angle) * 650, life: 1.1, damage: player.attack });
}

function dropLoot(x: number, y: number) {
  loot.push({ x, y, kind: 'coin', value: 4, collected: false }, { x: x + 18, y: y - 12, kind: 'xp', value: 26, collected: false });
  if (Math.random() < 0.35) loot.push({ x: x - 18, y: y + 8, kind: 'tech', value: 1, collected: false });
}

function collectLoot(item: Loot) {
  item.collected = true;
  if (item.kind === 'coin') state.coins += item.value;
  if (item.kind === 'tech') state.tech += item.value;
  if (item.kind === 'xp') { state.xp += item.value; if (state.xp >= 100) { state.xp -= 100; state.level += 1; state.upgradeOpen = true; } }
  if (item.kind === 'blackBox') { state.blackBoxRecovered = true; state.coins += item.value; save.blackBoxes = (save.blackBoxes || 0) + 1; delete save.blackBox; persist(); }
}

function finishRun() {
  state.mode = 'dead';
  save.bestDay = Math.max(save.bestDay || 0, Math.floor(state.day));
  save.bestKills = Math.max(save.bestKills || 0, state.kills);
  save.explored = Math.max(save.explored || 0, state.explored);
  save.blackBox = { x: player.x, y: player.y, day: Math.floor(state.day), coins: Math.floor(state.coins * 0.5), weapon: '自动激光' };
  persist();
}

function clickUi(x: number, y: number) {
  if (state.mode === 'menu') { startRun(); return; }
  if (state.mode === 'dead') { startRun(); return; }
  if (state.upgradeOpen) { player.attack *= 1.2; player.maxHp += 20; player.speed *= 1.05; state.upgradeOpen = false; return; }
  if (state.dockOpen) { state.dockOpen = false; return; }
  if (state.dockPrompt && x > innerWidth - 210 && y > innerHeight - 88) { state.dockOpen = true; player.hp = player.maxHp; player.shield = player.maxShield; }
}

function draw() {
  drawSpace();
  if (state.mode === 'menu') { drawPanel('迷失深空：远征者', 'Lost Deep Space: Drifter\n开始游戏 / 继续远征 / 永久升级 / 文明图鉴\n点击屏幕开始远征'); return; }
  const ox = innerWidth / 2 - player.x;
  const oy = innerHeight / 2 - player.y;
  for (const planet of planets) drawPlanet(planet, ox, oy);
  for (const item of loot) drawLoot(item, ox, oy);
  for (const enemy of enemies) drawEnemy(enemy, ox, oy);
  for (const shot of shots) drawShot(shot, ox, oy);
  drawShip(innerWidth / 2, innerHeight / 2);
  drawHud();
  if (state.upgradeOpen) drawPanel('升级三选一', '激光伤害 +20%\n飞船速度 +5%\n最大生命 +20\n点击任意位置选择并继续');
  if (state.dockOpen) drawPanel('中立星球停靠', '修理飞船完成\n商店 / 升级模块 / 传送 / 文明图鉴 / 黑匣子坐标\n点击关闭停靠界面');
  if (state.mode === 'dead') drawPanel('死亡结算', `存活 ${Math.floor(state.day)} 天 · 击杀 ${state.kills}\n黑匣子坐标已保存到 localStorage\n点击开始下一局并追踪回收`);
}

function drawSpace() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  const gradient = ctx.createRadialGradient(innerWidth * 0.3, innerHeight * 0.2, 20, innerWidth * 0.5, innerHeight * 0.5, innerWidth);
  gradient.addColorStop(0, '#173a73'); gradient.addColorStop(0.45, '#071432'); gradient.addColorStop(1, '#030611');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, innerWidth, innerHeight);
  for (let i = 0; i < 130; i += 1) { ctx.globalAlpha = 0.25 + (i % 5) * 0.12; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc((i * 97 + state.day * 4) % innerWidth, (i * 53) % innerHeight, 1 + (i % 3), 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
}

function drawShip(x: number, y: number) { blob(x, y, 24, '#67e8f9'); ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(x, y - 8, 11, 0, Math.PI * 2); ctx.fill(); }
function drawPlanet(planet: Planet, ox: number, oy: number) { const color = planet.kind === 'neutral' ? '#34d399' : planet.kind === 'low' ? '#86efac' : planet.kind === 'mid' ? '#60a5fa' : '#a78bfa'; blob(planet.x + ox, planet.y + oy, planet.radius, color); if (planet.angry) { ctx.strokeStyle = '#fb7185'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(planet.x + ox, planet.y + oy, planet.radius + 70, 0, Math.PI * 2); ctx.stroke(); } }
function drawEnemy(enemy: Enemy, ox: number, oy: number) { blob(enemy.x + ox, enemy.y + oy, 21, enemy.kind === 'high' ? '#c084fc' : enemy.kind === 'mid' ? '#fb923c' : '#fb7185'); }
function drawLoot(item: Loot, ox: number, oy: number) { blob(item.x + ox, item.y + oy, 11, item.kind === 'coin' ? '#facc15' : item.kind === 'xp' ? '#38bdf8' : item.kind === 'tech' ? '#c084fc' : '#334155'); }
function drawShot(shot: Shot, ox: number, oy: number) { ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(shot.x + ox, shot.y + oy); ctx.lineTo(shot.x + ox - shot.vx * 0.035, shot.y + oy - shot.vy * 0.035); ctx.stroke(); }
function blob(x: number, y: number, radius: number, color: string) { ctx.fillStyle = color; ctx.strokeStyle = '#07122e'; ctx.lineWidth = Math.max(3, radius * 0.12); ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(x - radius * 0.28, y - radius * 0.28, radius * 0.22, 0, Math.PI * 2); ctx.fill(); }

function drawHud() {
  rounded(12, 12, 278, 104, '#08162fcc');
  ctx.fillStyle = '#ffffff'; ctx.font = '15px sans-serif';
  ctx.fillText(`生命 ${Math.max(0, Math.floor(player.hp))}/${player.maxHp}  护盾 ${Math.floor(player.shield)}`, 28, 42);
  ctx.fillText(`等级 ${state.level}  XP ${state.xp}/100  金币 ${state.coins}`, 28, 70);
  ctx.fillText(`科技碎片 ${state.tech}  击杀 ${state.kills}`, 28, 96);
  ctx.textAlign = 'center'; ctx.fillText(`存活第 ${Math.floor(state.day)} 天`, innerWidth / 2, 32); ctx.textAlign = 'left';
  rounded(innerWidth - 188, 14, 174, 150, '#08162fcc'); ctx.fillText('小地图', innerWidth - 168, 40);
  ctx.fillStyle = '#67e8f9'; ctx.fillRect(innerWidth - 102, 86, 7, 7);
  for (const planet of planets.slice(0, 32)) { const mx = innerWidth - 102 + (planet.x - player.x) / 70; const my = 90 + (planet.y - player.y) / 70; if (mx > innerWidth - 178 && mx < innerWidth - 22 && my > 50 && my < 154) { ctx.fillStyle = planet.kind === 'neutral' ? '#86efac' : '#fca5a5'; ctx.fillRect(mx, my, 4, 4); } }
  rounded(innerWidth - 230, 182, 216, 196, '#08162fcc'); ctx.fillStyle = '#ffffff'; ctx.fillText('七大终极文明苏醒', innerWidth - 212, 208);
  CIVILIZATIONS.forEach((name, index) => ctx.fillText(`${name} ${Math.min(100, Math.floor((state.day / (4 + index)) * 100))}%`, innerWidth - 212, 234 + index * 20));
  ctx.fillText('武器：自动激光 / 追踪导弹 / 无人机 / 护盾 / EMP / 黑洞', 18, innerHeight - 24);
  if (state.dockPrompt) { rounded(innerWidth - 210, innerHeight - 82, 190, 58, '#34d399'); ctx.fillStyle = '#06281d'; ctx.fillText('停靠中立星球', innerWidth - 172, innerHeight - 48); }
}

function rounded(x: number, y: number, w: number, h: number, color: string) { ctx.fillStyle = color; ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 2; ctx.beginPath(); if ('roundRect' in ctx) ctx.roundRect(x, y, w, h, 18); else { const r = 18; ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); } ctx.fill(); ctx.stroke(); }
function drawPanel(title: string, body: string) { rounded(innerWidth / 2 - 250, innerHeight / 2 - 158, 500, 316, '#08162fee'); ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.font = '26px sans-serif'; ctx.fillText(title, innerWidth / 2, innerHeight / 2 - 102); ctx.font = '16px sans-serif'; body.split('\n').forEach((line, index) => ctx.fillText(line, innerWidth / 2, innerHeight / 2 - 46 + index * 34)); ctx.textAlign = 'left'; }

function loop(time: number) { const dt = Math.min(0.033, (time - lastTime) / 1000 || 0); lastTime = time; update(dt); draw(); requestAnimationFrame(loop); }

addEventListener('resize', resize); resize();
addEventListener('keydown', (event) => { keys[event.key.toLowerCase()] = true; if (event.key === 'Enter' && state.mode === 'menu') startRun(); });
addEventListener('keyup', (event) => { keys[event.key.toLowerCase()] = false; });
canvas.addEventListener('pointerdown', (event) => { clickUi(event.clientX, event.clientY); if (event.clientX < 170 && event.clientY > innerHeight - 170) pointerStick = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0 }; });
canvas.addEventListener('pointermove', (event) => { if (pointerStick && pointerStick.id === event.pointerId) { pointerStick.dx = event.clientX - pointerStick.x; pointerStick.dy = event.clientY - pointerStick.y; } });
canvas.addEventListener('pointerup', (event) => { if (pointerStick && pointerStick.id === event.pointerId) pointerStick = null; });
requestAnimationFrame(loop);

(window as any).__LDSD_VERIFY__ = { ASSET_NAMES, state, save, player, startRun, update, spawnGuard, autoAttack, dropLoot, collectLoot, finishRun, assetUrl };
