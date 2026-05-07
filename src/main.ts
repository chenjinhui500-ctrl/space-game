import Phaser from 'phaser';
import './styles.css';

type PlanetKind = 'low' | 'mid' | 'high' | 'ultimate' | 'neutral';
type DropKind = 'coin' | 'xp' | 'tech' | 'black_box';
type GameMode = 'menu' | 'playing' | 'paused' | 'docked' | 'levelup' | 'dead' | 'meta';
type WeaponId = 'laser' | 'missile' | 'drone' | 'shield' | 'emp' | 'blackhole';
type Civilisation = { id: string; zh: string; day: number; color: number; event: string };
type SaveData = { bestDays: number; bestKills: number; explored: number; blackBoxes: number; tech: number; meta: Record<string, number>; blackBox?: BlackBoxData };
type BlackBoxData = { x: number; y: number; days: number; coins: number; weapon: WeaponId };

type Planet = { id: string; name: string; x: number; y: number; kind: PlanetKind; level: number; radius: number; range: number; asset: string; awakened?: number; visited?: boolean; danger?: number };
type Enemy = Phaser.Physics.Arcade.Image & { hp: number; maxHp: number; speed: number; damage: number; xp: number; coins: number; kind: PlanetKind; shootAt: number };
type Drop = Phaser.Physics.Arcade.Image & { kind: DropKind; value: number };
type Bullet = Phaser.Physics.Arcade.Image & { damage: number; life: number; homing?: boolean; blast?: number };

type Upgrade = { title: string; desc: string; apply: () => void; icon: WeaponId | 'ship' };

const WIDTH = 1280;
const HEIGHT = 720;
const SAVE_KEY = 'lost-deep-space-drifter-save-v1';
const DAY_MS = 60_000;
const ASSET_BASE = new URL('../assets/', import.meta.url).href;
const assets = ['ship_player','enemy_low','enemy_mid','enemy_high','planet_low','planet_mid','planet_high','planet_neutral','coin','xp','tech','black_box','weapon_laser','weapon_missile','weapon_drone','weapon_shield','weapon_emp','weapon_blackhole','civ_hive','civ_machine','civ_crystal','civ_gravity','civ_void','civ_time','civ_core'];
const civs: Civilisation[] = [
  { id: 'hive', zh: '虫巢母星', day: 3, color: 0x7cff8a, event: '虫群追猎' },
  { id: 'machine', zh: '机械母星', day: 6, color: 0xb7c0d8, event: '轨道炮信标' },
  { id: 'crystal', zh: '水晶母星', day: 9, color: 0xb088ff, event: '折射光束区' },
  { id: 'gravity', zh: '引力母星', day: 12, color: 0x55ddff, event: '迷你黑洞' },
  { id: 'void', zh: '虚空母星', day: 15, color: 0x7c5cff, event: '空间裂缝' },
  { id: 'time', zh: '时间母星', day: 18, color: 0xffd36d, event: '时间迟滞' },
  { id: 'core', zh: '深空核心', day: 22, color: 0xff5a79, event: '全图主脑猎杀' },
];

const defaultSave = (): SaveData => ({ bestDays: 0, bestKills: 0, explored: 0, blackBoxes: 0, tech: 0, meta: { hp: 0, shield: 0, attack: 0, radar: 0, recovery: 0, discount: 0 } });
const loadSave = (): SaveData => ({ ...defaultSave(), ...(JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') as Partial<SaveData>) });
const saveGame = (data: SaveData) => localStorage.setItem(SAVE_KEY, JSON.stringify(data));
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);

class MainScene extends Phaser.Scene {
  mode: GameMode = 'menu';
  save: SaveData = loadSave();
  player!: Phaser.Physics.Arcade.Image;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  planets: Planet[] = [];
  enemies!: Phaser.Physics.Arcade.Group;
  bullets!: Phaser.Physics.Arcade.Group;
  drops!: Phaser.Physics.Arcade.Group;
  planetSprites = new Map<string, Phaser.GameObjects.Image>();
  ui!: Phaser.GameObjects.Container;
  overlay!: Phaser.GameObjects.Container;
  stars!: Phaser.GameObjects.TileSprite;
  keys = { hp: 120, maxHp: 120, shield: 35, maxShield: 35, xp: 0, level: 1, coins: 0, tech: 0, kills: 0, explored: 0, speed: 260, attack: 1, magnet: 145, crit: 0.05 };
  weapons: Record<WeaponId, number> = { laser: 1, missile: 1, drone: 1, shield: 1, emp: 0, blackhole: 0 };
  timers = { laser: 0, missile: 0, emp: 0, blackhole: 0, spawn: 0, hazard: 0 };
  runStart = 0;
  lastDock?: Planet;
  joystick?: { base: Phaser.GameObjects.Arc; knob: Phaser.GameObjects.Arc; pointer?: number; x: number; y: number; dx: number; dy: number };

  preload() { for (const key of assets) this.load.svg(key, `${ASSET_BASE}${key}.svg`, { width: 96, height: 96 }); }

  create() {
    this.physics.world.setBounds(-1_000_000, -1_000_000, 2_000_000, 2_000_000);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x050719).setOrigin(0).setScrollFactor(0);
    this.makeStars();
    this.enemies = this.physics.add.group(); this.bullets = this.physics.add.group(); this.drops = this.physics.add.group();
    this.player = this.physics.add.image(0, 0, 'ship_player').setCircle(30).setDepth(20).setVisible(false);
    this.player.setDamping(true).setDrag(0.92).setMaxVelocity(420);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown-ESC', () => { if (this.mode === 'playing') this.openMenu('paused'); });
    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.hitEnemy(b as Bullet, e as Enemy));
    this.physics.add.overlap(this.player, this.enemies, (_, e) => this.damagePlayer((e as Enemy).damage * 0.03));
    this.physics.add.overlap(this.player, this.drops, (_, d) => this.pickDrop(d as Drop));
    this.createUi(); this.createJoystick(); this.openMenu('menu');
  }

  makeStars() {
    const g = this.make.graphics({ x: 0, y: 0 }, false); g.fillStyle(0x071024).fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 360; i++) { g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.25, 0.9)); g.fillCircle(Phaser.Math.Between(0, 1024), Phaser.Math.Between(0, 1024), Phaser.Math.FloatBetween(0.5, 2)); }
    for (let i = 0; i < 12; i++) { g.fillStyle(Phaser.Utils.Array.GetRandom([0x2b4cff, 0x6633aa, 0x0f8faa]), 0.08); g.fillCircle(Phaser.Math.Between(0, 1024), Phaser.Math.Between(0, 1024), Phaser.Math.Between(60, 170)); }
    g.generateTexture('starfield', 1024, 1024); g.destroy();
    this.stars = this.add.tileSprite(0, 0, WIDTH, HEIGHT, 'starfield').setOrigin(0).setScrollFactor(0).setDepth(-10);
  }

  startRun() {
    this.children.list.filter(o => !['uiRoot','overlayRoot'].includes(o.name)).forEach(o => { if (o !== this.player && o !== this.stars) o.destroy(); });
    this.planets = []; this.planetSprites.clear(); this.enemies.clear(true, true); this.bullets.clear(true, true); this.drops.clear(true, true);
    const m = this.save.meta; this.keys = { hp: 120 + m.hp * 20, maxHp: 120 + m.hp * 20, shield: 35 + m.shield * 12, maxShield: 35 + m.shield * 12, xp: 0, level: 1, coins: 0, tech: 0, kills: 0, explored: 0, speed: 260, attack: 1 + m.attack * 0.08, magnet: 145 + m.radar * 20, crit: 0.05 };
    this.weapons = { laser: 1, missile: 1, drone: 1, shield: 1, emp: 0, blackhole: 0 }; this.timers = { laser: 0, missile: 0, emp: 0, blackhole: 0, spawn: 0, hazard: 0 };
    this.player.setPosition(0, 0).setVisible(true).setActive(true); this.player.setVelocity(0, 0); this.runStart = this.time.now; this.mode = 'playing'; this.overlay.removeAll(true);
    this.generatePlanetsAround(0, 0, true); this.spawnBlackBox();
  }

  generatePlanetsAround(cx: number, cy: number, initial = false) {
    const grid = 900;
    for (let gx = Math.floor((cx - 1800) / grid); gx <= Math.floor((cx + 1800) / grid); gx++) for (let gy = Math.floor((cy - 1800) / grid); gy <= Math.floor((cy + 1800) / grid); gy++) {
      const id = `${gx}:${gy}`; if (this.planets.some(p => p.id === id)) continue;
      const r = Phaser.Math.RND.frac(); const kind: PlanetKind = initial && gx === 0 && gy === 0 ? 'neutral' : r < .12 ? 'neutral' : r < .55 ? 'low' : r < .82 ? 'mid' : r < .96 ? 'high' : 'ultimate';
      const p: Planet = { id, name: this.planetName(kind), x: gx * grid + Phaser.Math.Between(-260, 260), y: gy * grid + Phaser.Math.Between(-260, 260), kind, level: Math.max(1, Math.round(Math.hypot(gx, gy) + 1)), radius: kind === 'ultimate' ? 86 : kind === 'neutral' ? 68 : 58, range: kind === 'neutral' ? 160 : kind === 'ultimate' ? 430 : 260, asset: kind === 'low' ? 'planet_low' : kind === 'mid' ? 'planet_mid' : kind === 'high' || kind === 'ultimate' ? 'planet_high' : 'planet_neutral' };
      this.planets.push(p); const img = this.add.image(p.x, p.y, p.asset).setDisplaySize(p.radius * 2, p.radius * 2).setDepth(2).setName('planet'); this.planetSprites.set(id, img);
      this.add.circle(p.x, p.y, p.range, kind === 'neutral' ? 0x54ffcc : 0xff5577, .06).setStrokeStyle(2, kind === 'neutral' ? 0x54ffcc : 0xff5577, .23).setDepth(1).setName('planet');
      this.add.text(p.x, p.y + p.radius + 12, p.name, { fontFamily: 'Microsoft YaHei,Arial', fontSize: '15px', color: '#dffbff', stroke: '#10203c', strokeThickness: 4 }).setOrigin(.5).setDepth(3).setName('planet');
      for (let i = 0; i < 3; i++) this.add.circle(gx * grid + Phaser.Math.Between(-380, 380), gy * grid + Phaser.Math.Between(-380, 380), Phaser.Math.Between(9, 24), 0x8d9bb8, .55).setStrokeStyle(3, 0x10203c, .8).setDepth(0).setName('spaceDecor');
      if (Phaser.Math.RND.frac() < .28) this.add.image(gx * grid + Phaser.Math.Between(-330, 330), gy * grid + Phaser.Math.Between(-330, 330), Phaser.Utils.Array.GetRandom(['coin','xp','tech'])).setDisplaySize(30, 30).setDepth(1).setName('spaceDecor');
    }
  }

  planetName(kind: PlanetKind) { const pools = { low: ['软爪原星','茸芽绿洲','泡泡兽巢'], mid: ['齿轮港','蓝环工坊','脉冲城'], high: ['星辉议会','紫晶庭','苍穹矩阵'], ultimate: ['远古终端','沉睡母体','禁忌核心'], neutral: ['糖星驿站','暖光港','圆环休息站'] }; return Phaser.Utils.Array.GetRandom(pools[kind]); }

  update(time: number, delta: number) {
    this.stars.tilePositionX = this.cameras.main.scrollX * .18; this.stars.tilePositionY = this.cameras.main.scrollY * .18;
    if (this.mode !== 'playing') return;
    const dt = delta / 1000; this.generatePlanetsAround(this.player.x, this.player.y); this.movePlayer(dt); this.updateWeapons(time); this.updateEnemies(dt, time); this.updateDrops(dt); this.checkPlanets(time); this.updateCivEvents(time); this.updateUi();
  }

  movePlayer(dt: number) {
    let x = 0, y = 0; if (this.cursors.left.isDown || this.wasd.A.isDown) x--; if (this.cursors.right.isDown || this.wasd.D.isDown) x++; if (this.cursors.up.isDown || this.wasd.W.isDown) y--; if (this.cursors.down.isDown || this.wasd.S.isDown) y++; if (this.joystick) { x += this.joystick.dx; y += this.joystick.dy; }
    const len = Math.hypot(x, y); if (len > 0) this.player.setVelocity((x / len) * this.keys.speed, (y / len) * this.keys.speed); else this.player.setVelocity(this.player.body!.velocity.x * .85, this.player.body!.velocity.y * .85);
    this.player.rotation = Math.atan2(this.player.body!.velocity.y, this.player.body!.velocity.x) + Math.PI / 2;
    this.keys.shield = Math.min(this.keys.maxShield, this.keys.shield + dt * (4 + this.weapons.shield * 2));
  }

  nearestEnemy(max = 720) { let best: Enemy | undefined; let bd = max; for (const e of this.enemies.getChildren() as Enemy[]) { const d = dist(this.player, e); if (d < bd) { bd = d; best = e; } } return best; }
  updateWeapons(time: number) {
    const target = this.nearestEnemy();
    if (target && time > this.timers.laser) { this.fire(target, 'weapon_laser', 640, 22 * this.keys.attack, false); this.timers.laser = time + Math.max(110, 430 - this.weapons.laser * 45); }
    if (target && time > this.timers.missile) { for (let i = 0; i < this.weapons.missile; i++) this.fire(target, 'weapon_missile', 420, 34 * this.keys.attack, true, i * .18); this.timers.missile = time + 1500; }
    if (this.weapons.emp && time > this.timers.emp) { this.enemies.getChildren().forEach(e => { if (dist(this.player, e as Enemy) < 260) this.hitEnemy({ damage: 16 * this.keys.attack, destroy: () => undefined, blast: 0 } as unknown as Bullet, e as Enemy); }); this.timers.emp = time + 3800; }
    if (this.weapons.blackhole && target && time > this.timers.blackhole) { this.fire(target, 'weapon_blackhole', 320, 60 * this.keys.attack, true).blast = 150; this.timers.blackhole = time + 6200; }
    this.drawDrones(time);
  }
  fire(target: Enemy, texture: string, speed: number, damage: number, homing = false, angleOffset = 0) { const b = this.bullets.create(this.player.x, this.player.y, texture) as Bullet; b.setDisplaySize(28, 28).setCircle(14).setDepth(15); b.damage = Math.random() < this.keys.crit ? damage * 2 : damage; b.life = 2200; b.homing = homing; this.physics.moveToObject(b, target, speed); b.rotation = Math.atan2(b.body!.velocity.y, b.body!.velocity.x) + angleOffset; return b; }
  drawDrones(time: number) { for (let i = 0; i < this.weapons.drone; i++) { const a = time / 420 + i * Math.PI * 2 / this.weapons.drone; const x = this.player.x + Math.cos(a) * 92, y = this.player.y + Math.sin(a) * 92; const e = this.enemies.getChildren().find(v => dist({ x, y }, v as Enemy) < 44) as Enemy | undefined; if (e) this.hitEnemy({ damage: .55 * this.keys.attack, destroy: () => undefined, blast: 0 } as unknown as Bullet, e); } }

  updateEnemies(dt: number, time: number) { for (const e of this.enemies.getChildren() as Enemy[]) { this.physics.moveToObject(e, this.player, e.speed); e.rotation = Math.atan2(e.body!.velocity.y, e.body!.velocity.x) + Math.PI / 2; if (e.kind !== 'low' && time > e.shootAt && dist(e, this.player) < 520) { this.damagePlayer(e.damage * .35); e.shootAt = time + 1500; } } for (const b of this.bullets.getChildren() as Bullet[]) { b.life -= dt * 1000; if (b.homing) { const t = this.nearestEnemy(620); if (t) this.physics.moveToObject(b, t, 440); } if (b.life <= 0) b.destroy(); } }
  updateDrops(dt: number) { for (const d of this.drops.getChildren() as Drop[]) if (dist(d, this.player) < this.keys.magnet) this.physics.moveToObject(d, this.player, 260 + 700 * dt); }

  checkPlanets(time: number) { let dock: Planet | undefined; for (const p of this.planets) { const d = dist(this.player, p); if (d < p.radius + 85 && p.kind === 'neutral') dock = p; if (d < p.range && p.kind !== 'neutral' && time > this.timers.spawn) { this.spawnEnemy(p); this.timers.spawn = time + Math.max(220, 950 - this.day() * 16); } if (d < p.radius + 40 && !p.visited) { p.visited = true; this.keys.explored++; this.save.explored = Math.max(this.save.explored, this.keys.explored); } } this.lastDock = dock; }
  spawnEnemy(p: Planet) { const a = Phaser.Math.FloatBetween(0, Math.PI * 2); const kind = p.kind === 'ultimate' ? 'high' : p.kind; const key = kind === 'low' ? 'enemy_low' : kind === 'mid' ? 'enemy_mid' : 'enemy_high'; const e = this.enemies.create(p.x + Math.cos(a) * p.radius, p.y + Math.sin(a) * p.radius, key) as Enemy; e.setDisplaySize(50, 50).setCircle(24).setDepth(12); e.kind = p.kind; e.maxHp = (35 + p.level * 12) * (p.kind === 'ultimate' ? 3 : 1); e.hp = e.maxHp; e.speed = 70 + p.level * 8 + (p.kind === 'low' ? 35 : 0); e.damage = 8 + p.level * 1.5; e.xp = 10 + p.level * 2; e.coins = 3 + p.level; e.shootAt = 0; }
  updateCivEvents(time: number) { if (time < this.timers.hazard) return; this.timers.hazard = time + 1800; for (const c of civs) if (this.day() >= c.day) { const p = Phaser.Utils.Array.GetRandom(this.planets.filter(v => v.kind !== 'neutral')) || { x: this.player.x + 600, y: this.player.y }; this.spawnEnemy({ ...p, kind: c.id === 'hive' ? 'low' : c.id === 'machine' ? 'mid' : 'ultimate', level: Math.ceil(this.day() / 2), radius: 20 } as Planet); if (c.id === 'gravity') this.physics.moveTo(this.player, p.x, p.y, 34); } }

  hitEnemy(b: Bullet, e: Enemy) { e.hp -= b.damage; if (b.blast) for (const other of this.enemies.getChildren() as Enemy[]) if (dist(e, other) < b.blast) other.hp -= b.damage * .55; b.destroy(); if (e.hp <= 0) { this.keys.kills++; this.drop(e.x, e.y, 'xp', e.xp); this.drop(e.x + 12, e.y, 'coin', e.coins); if (Math.random() < .18) this.drop(e.x - 12, e.y, 'tech', 1); if (Math.random() < .025) this.randomWeapon(); e.destroy(); } }
  drop(x: number, y: number, kind: DropKind, value: number) { const d = this.drops.create(x + Phaser.Math.Between(-12, 12), y + Phaser.Math.Between(-12, 12), kind === 'coin' ? 'coin' : kind === 'xp' ? 'xp' : kind === 'tech' ? 'tech' : 'black_box') as Drop; d.kind = kind; d.value = value; d.setDisplaySize(28, 28).setCircle(14).setDepth(10); }
  pickDrop(d: Drop) { if (d.kind === 'coin') this.keys.coins += d.value; if (d.kind === 'tech') { this.keys.tech += d.value; this.save.tech += d.value; } if (d.kind === 'xp') { this.keys.xp += d.value; if (this.keys.xp >= this.needXp()) this.levelUp(); } if (d.kind === 'black_box' && this.save.blackBox) { this.keys.coins += Math.round(this.save.blackBox.coins * (.35 + this.save.meta.recovery * .05)); this.keys.tech += 2; this.save.blackBoxes++; delete this.save.blackBox; saveGame(this.save); } d.destroy(); }
  needXp() { return 70 + this.keys.level * 42; }
  levelUp() { this.keys.xp -= this.needXp(); this.keys.level++; this.openLevelUp(); }
  damagePlayer(v: number) { const s = Math.min(this.keys.shield, v); this.keys.shield -= s; this.keys.hp -= v - s; if (this.keys.hp <= 0) this.die(); }
  day() { return Math.max(0, (this.time.now - this.runStart) / DAY_MS + 1); }

  createUi() { this.ui = this.add.container(0, 0).setScrollFactor(0).setDepth(1000).setName('uiRoot'); this.overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(2000).setName('overlayRoot'); }
  panel(x: number, y: number, w: number, h: number, color = 0x0b1735) { return this.add.rectangle(x, y, w, h, color, .78).setOrigin(0).setStrokeStyle(3, 0x7df9ff, .35); }
  updateUi() { this.ui.removeAll(true); const g = this.add.graphics(); this.ui.add(g); this.ui.add(this.panel(18, 16, 300, 112)); this.ui.add(this.text(34, 28, `生命 ${Math.ceil(this.keys.hp)}/${this.keys.maxHp}  护盾 ${Math.ceil(this.keys.shield)}/${this.keys.maxShield}`)); this.ui.add(this.text(34, 58, `等级 ${this.keys.level}  经验 ${Math.floor(this.keys.xp)}/${this.needXp()}  金币 ${this.keys.coins}  科技 ${this.keys.tech}`)); this.ui.add(this.text(34, 88, `击杀 ${this.keys.kills}  探索星球 ${this.keys.explored}`)); this.ui.add(this.panel(515, 14, 250, 48)); this.ui.add(this.text(640, 25, `存活第 ${this.day().toFixed(1)} 天`, 22).setOrigin(.5,0)); this.drawMiniMap(); this.drawWeapons(); this.drawCivs(); if (this.lastDock) this.dockButton(); this.drawBlackBoxArrow(); }
  text(x: number, y: number, s: string, size = 16, color = '#eaf8ff') { return this.add.text(x, y, s, { fontFamily: 'Microsoft YaHei,Arial', fontSize: `${size}px`, color, stroke: '#10203c', strokeThickness: 4 }); }
  drawMiniMap() { this.ui.add(this.panel(1050, 16, 210, 150)); const g = this.add.graphics(); this.ui.add(g); g.lineStyle(2, 0x9cecff, .5).strokeCircle(1155, 91, 58); g.fillStyle(0x66e3ff).fillCircle(1155, 91, 5); const scale = .045; for (const p of this.planets.filter(p => dist(p, this.player) < 1300)) { const col = p.kind === 'neutral' ? 0x54ffcc : p.kind === 'ultimate' ? 0xff5a79 : 0xffd36d; g.fillStyle(col).fillCircle(1155 + (p.x - this.player.x) * scale, 91 + (p.y - this.player.y) * scale, p.kind === 'neutral' ? 5 : 4); } for (const e of (this.enemies.getChildren() as Enemy[]).slice(0, 20)) g.fillStyle(0xff5577).fillCircle(1155 + (e.x - this.player.x) * scale, 91 + (e.y - this.player.y) * scale, 2); this.ui.add(this.text(1070, 140, '小地图：蓝=你 绿=中立 红=追击', 12, '#bfefff')); }
  drawWeapons() { this.ui.add(this.panel(18, 585, 370, 112)); this.ui.add(this.text(34, 596, '当前武器', 17)); (Object.keys(this.weapons) as WeaponId[]).forEach((w, i) => { if (this.weapons[w]) { this.ui.add(this.add.image(52 + i * 54, 650, `weapon_${w}`).setDisplaySize(40, 40)); this.ui.add(this.text(64 + i * 54, 668, `Lv.${this.weapons[w]}`, 12).setOrigin(.5)); } }); }
  drawCivs() { this.ui.add(this.panel(1030, 184, 230, 318)); this.ui.add(this.text(1046, 196, '七大终极文明苏醒', 17)); civs.forEach((c, i) => { const p = Phaser.Math.Clamp(this.day() / c.day, 0, 1); const y = 230 + i * 36; this.ui.add(this.add.image(1048, y + 8, `civ_${c.id}`).setDisplaySize(24, 24)); this.ui.add(this.text(1066, y, `${c.zh} ${(p * 100).toFixed(0)}%`, 12, p >= 1 ? '#ff9db5' : '#dffbff')); this.ui.add(this.add.rectangle(1066, y + 22, 138 * p, 6, c.color).setOrigin(0)); if (p >= 1) this.ui.add(this.text(1200, y, c.event, 10, '#ffd36d')); }); }
  dockButton() { const b = this.add.rectangle(1060, 525, 190, 54, 0x54ffcc, .85).setOrigin(0).setStrokeStyle(4, 0x10203c); const t = this.text(1155, 540, '停靠中立星球', 18, '#10203c').setOrigin(.5,0); b.setInteractive().on('pointerdown', () => this.openDock()); this.ui.add([b,t]); }
  drawBlackBoxArrow() { const bb = this.save.blackBox; if (!bb) return; const a = Phaser.Math.Angle.Between(this.player.x, this.player.y, bb.x, bb.y); this.ui.add(this.text(520, 70, `黑匣子 ${Math.round(dist(this.player, bb))}m ↗`, 15, '#ffd36d')); }

  openMenu(kind: GameMode) { this.mode = kind; this.overlay.removeAll(true); this.overlay.add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x02030a, .78).setOrigin(0)); this.overlay.add(this.text(640, 92, '迷失深空：远征者', 42, '#7df9ff').setOrigin(.5)); this.overlay.add(this.text(640, 144, 'Lost Deep Space: Drifter', 18, '#ffd36d').setOrigin(.5)); const items = kind === 'meta' ? ['初始生命提升','初始护盾提升','初始攻击力提升','初始雷达范围提升','黑匣子回收效率提升','中立商店折扣','返回主菜单'] : ['开始游戏','继续远征','永久升级','文明图鉴']; items.forEach((label, i) => this.button(500, 210 + i * 62, 280, 46, label, () => this.menuAction(label))); this.overlay.add(this.text(640, 655, `纪录：${this.save.bestDays.toFixed(1)}天 / ${this.save.bestKills}击杀 / ${this.save.explored}星球 / 黑匣子${this.save.blackBoxes}次 / 永久科技${this.save.tech}`, 15).setOrigin(.5)); }
  menuAction(label: string) { if (label.includes('开始') || label.includes('继续')) this.startRun(); else if (label === '永久升级') this.openMenu('meta'); else if (label === '文明图鉴') this.codex(); else if (label === '返回主菜单') this.openMenu('menu'); else { const keys = ['hp','shield','attack','radar','recovery','discount']; const names = ['初始生命提升','初始护盾提升','初始攻击力提升','初始雷达范围提升','黑匣子回收效率提升','中立商店折扣']; const idx = names.indexOf(label); if (idx >= 0 && this.save.tech >= 3 + this.save.meta[keys[idx]]) { this.save.tech -= 3 + this.save.meta[keys[idx]]; this.save.meta[keys[idx]]++; saveGame(this.save); this.openMenu('meta'); } } }
  button(x: number, y: number, w: number, h: number, label: string, cb: () => void) { const r = this.add.rectangle(x, y, w, h, 0x162a58, .95).setOrigin(0).setStrokeStyle(3, 0x7df9ff); const t = this.text(x + w / 2, y + 12, label, 18).setOrigin(.5, 0); r.setInteractive({ useHandCursor: true }).on('pointerdown', cb).on('pointerover', () => r.setFillStyle(0x24447e)); this.overlay.add([r,t]); }
  openDock() { this.mode = 'docked'; this.overlay.removeAll(true); this.overlay.add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x02030a, .62).setOrigin(0)); this.overlay.add(this.text(640, 120, `停靠：${this.lastDock?.name ?? '中立星球'}`, 32, '#54ffcc').setOrigin(.5)); ['修理飞船 20金币','购买武器 45金币','升级模块 30金币','传送到更危险星域','查看文明图鉴','查看黑匣子坐标','离港'].forEach((l,i)=>this.button(490,190+i*58,300,44,l,()=>this.dockAction(l))); }
  dockAction(l: string) { const discount = 1 - this.save.meta.discount * .04; if (l.startsWith('修理') && this.keys.coins >= 20 * discount) { this.keys.coins -= Math.ceil(20 * discount); this.keys.hp = this.keys.maxHp; } else if (l.startsWith('购买') && this.keys.coins >= 45 * discount) { this.keys.coins -= Math.ceil(45 * discount); this.randomWeapon(); } else if (l.startsWith('升级') && this.keys.coins >= 30 * discount) { this.keys.coins -= Math.ceil(30 * discount); this.openLevelUp(); return; } else if (l.startsWith('传送')) { this.player.setPosition(this.player.x + 1600, this.player.y - 900); } else if (l.startsWith('查看文明')) { this.codex(); return; } else if (l.startsWith('查看黑匣')) { this.overlay.add(this.text(640, 600, this.save.blackBox ? `坐标 X:${Math.round(this.save.blackBox.x)} Y:${Math.round(this.save.blackBox.y)}` : '暂无黑匣子', 18, '#ffd36d').setOrigin(.5)); return; } this.mode = 'playing'; this.overlay.removeAll(true); }
  codex() { this.overlay.removeAll(true); this.overlay.add(this.add.rectangle(0,0,WIDTH,HEIGHT,0x02030a,.82).setOrigin(0)); this.overlay.add(this.text(640,72,'文明图鉴 / 后续 Boss 入口',30,'#7df9ff').setOrigin(.5)); civs.forEach((c,i)=>this.overlay.add(this.text(270,130+i*58,`${c.zh}：第${c.day}天苏醒，事件：${c.event}`,18))); this.button(520,610,240,48,'返回主菜单',()=>this.openMenu('menu')); }
  openLevelUp() { this.mode = 'levelup'; this.overlay.removeAll(true); this.overlay.add(this.add.rectangle(0,0,WIDTH,HEIGHT,0x02030a,.72).setOrigin(0)); this.overlay.add(this.text(640,130,'升级！选择一个模块',32,'#ffd36d').setOrigin(.5)); Phaser.Utils.Array.Shuffle(this.upgrades()).slice(0,3).forEach((u,i)=>this.button(370+i*230,245,200,170,`${u.title}\n${u.desc}`,()=>{u.apply();this.overlay.removeAll(true);this.mode='playing';})); }
  upgrades(): Upgrade[] { return [ {title:'激光伤害 +20%',desc:'自动激光更疼',icon:'laser',apply:()=>this.keys.attack+=.2}, {title:'导弹数量 +1',desc:'更多追踪导弹',icon:'missile',apply:()=>this.weapons.missile++}, {title:'飞船速度 +10%',desc:'走位更灵活',icon:'ship',apply:()=>this.keys.speed*=1.1}, {title:'护盾上限 +15%',desc:'更耐打',icon:'shield',apply:()=>this.keys.maxShield*=1.15}, {title:'金币吸取范围 +20%',desc:'少走弯路',icon:'ship',apply:()=>this.keys.magnet*=1.2}, {title:'无人机数量 +1',desc:'环绕切割',icon:'drone',apply:()=>this.weapons.drone++}, {title:'暴击率 +5%',desc:'偶尔双倍',icon:'laser',apply:()=>this.keys.crit+=.05}, {title:'最大生命 +20',desc:'续航提升',icon:'shield',apply:()=>{this.keys.maxHp+=20;this.keys.hp+=20}}, {title:'解锁 EMP',desc:'范围电磁脉冲',icon:'emp',apply:()=>this.weapons.emp++}, {title:'黑洞炸弹 +1',desc:'小范围引力爆破',icon:'blackhole',apply:()=>this.weapons.blackhole++} ]; }
  randomWeapon() { const w = Phaser.Utils.Array.GetRandom(Object.keys(this.weapons) as WeaponId[]); this.weapons[w]++; }
  die() { this.mode = 'dead'; const days = this.day(); this.save.bestDays = Math.max(this.save.bestDays, days); this.save.bestKills = Math.max(this.save.bestKills, this.keys.kills); this.save.explored = Math.max(this.save.explored, this.keys.explored); this.save.blackBox = { x: this.player.x, y: this.player.y, days, coins: Math.round(this.keys.coins * .45), weapon: Phaser.Utils.Array.GetRandom(Object.keys(this.weapons) as WeaponId[]) }; saveGame(this.save); this.overlay.removeAll(true); this.overlay.add(this.add.rectangle(0,0,WIDTH,HEIGHT,0x02030a,.82).setOrigin(0)); this.overlay.add(this.text(640,150,'飞船失联，黑匣子已记录',34,'#ff9db5').setOrigin(.5)); this.overlay.add(this.text(640,220,`存活 ${days.toFixed(1)} 天 / 击杀 ${this.keys.kills} / 探索 ${this.keys.explored} 星球`,20).setOrigin(.5)); this.overlay.add(this.text(640,260,`黑匣子坐标 X:${Math.round(this.player.x)} Y:${Math.round(this.player.y)}，下一局可追踪回收。`,18,'#ffd36d').setOrigin(.5)); this.button(500,335,280,50,'返回主菜单',()=>this.openMenu('menu')); }
  spawnBlackBox() { if (this.save.blackBox) this.drop(this.save.blackBox.x, this.save.blackBox.y, 'black_box', 1); }
  createJoystick() { const base = this.add.circle(96, HEIGHT - 96, 58, 0x7df9ff, .12).setStrokeStyle(3, 0x7df9ff, .25).setScrollFactor(0).setDepth(1200); const knob = this.add.circle(96, HEIGHT - 96, 24, 0x7df9ff, .35).setScrollFactor(0).setDepth(1201); this.joystick = { base, knob, x: 96, y: HEIGHT - 96, dx: 0, dy: 0 }; this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.x < 220 && p.y > HEIGHT - 220 && this.joystick) this.joystick.pointer = p.id; }); this.input.on('pointermove', (p: Phaser.Input.Pointer) => { const j = this.joystick; if (!j || j.pointer !== p.id) return; const a = Phaser.Math.Angle.Between(j.x,j.y,p.x,p.y), d = Math.min(58, Phaser.Math.Distance.Between(j.x,j.y,p.x,p.y)); j.dx = Math.cos(a) * d / 58; j.dy = Math.sin(a) * d / 58; j.knob.setPosition(j.x + j.dx * 58, j.y + j.dy * 58); }); this.input.on('pointerup', (p: Phaser.Input.Pointer) => { const j = this.joystick; if (j?.pointer === p.id) { j.pointer = undefined; j.dx = 0; j.dy = 0; j.knob.setPosition(j.x,j.y); } }); }
}

new Phaser.Game({ type: Phaser.AUTO, parent: 'app', width: WIDTH, height: HEIGHT, backgroundColor: '#050719', physics: { default: 'arcade', arcade: { debug: false } }, scene: MainScene, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH } });
