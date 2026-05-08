import { existsSync } from 'node:fs';

const calls = [];
const ctx = new Proxy({}, { get(_target, prop) {
  if (prop === 'createRadialGradient') return () => ({ addColorStop() {} });
  if (prop === 'measureText') return (s) => ({ width: String(s).length * 10 });
  if (prop === 'canvas') return canvas;
  return (...args) => calls.push([prop, args]);
}, set(target, prop, value) { target[prop] = value; return true; } });
const listeners = {};
const canvas = { width: 0, height: 0, style: {}, getContext: () => ctx, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }), addEventListener(name, cb) { (listeners[name] ||= []).push(cb); } };
globalThis.window = { addEventListener(name, cb) { (listeners[name] ||= []).push(cb); }, dispatchEvent() {} };
globalThis.document = { body: { appendChild() {} }, getElementById: () => ({ appendChild() {} }), createElement: (tag) => tag === 'canvas' ? canvas : { style: {}, appendChild() {} } };
globalThis.localStorage = { data: new Map(), getItem(k) { return this.data.get(k) ?? null; }, setItem(k, v) { this.data.set(k, String(v)); }, removeItem(k) { this.data.delete(k); } };
globalThis.Image = class { constructor() { this.complete = true; } set src(v) { this._src = v; this.complete = true; } get src() { return this._src; } };
globalThis.performance = { now: () => currentTime };
let raf;
let currentTime = 1000;
globalThis.requestAnimationFrame = (cb) => { raf = cb; return 1; };

function assert(condition, message) { if (!condition) throw new Error(message); }
function tick(ms = 16) { currentTime += ms; const cb = raf; cb?.(currentTime); }

if (!existsSync('dist/assets/main.js')) throw new Error('dist/assets/main.js not found; run npm run build first.');
await import('../dist/assets/main.js');
const game = globalThis.__PHASER_GAME__;
const scene = game?.scene;
assert(scene, 'game scene was not created');
tick();
assert(scene.mode === 'menu', 'main menu did not open');

scene.startRun();
tick(100);
assert(scene.mode === 'playing', 'start game did not enter playing mode');
assert(scene.player.visible === true, 'player is not visible after start');
assert(scene.planets.length > 0, 'procedural planets were not generated');
assert(scene.planets.some(p => p.kind === 'neutral'), 'neutral planet was not generated');

const beforeX = scene.player.x;
scene.wasd.D.isDown = true;
tick(250);
scene.wasd.D.isDown = false;
assert(scene.player.x > beforeX, 'keyboard movement did not move player');

const hostile = scene.planets.find(p => p.kind !== 'neutral');
assert(hostile, 'no hostile planet available for spawn test');
scene.player.setPosition(hostile.x, hostile.y);
scene.checkPlanets(20000);
assert(scene.enemies.getChildren().length > 0, 'enemy did not spawn near hostile planet');

const killsBeforeAuto = scene.keys.kills;
tick(500);
assert(scene.bullets.getChildren().length > 0 || scene.keys.kills > killsBeforeAuto || scene.enemies.getChildren()[0]?.hp < scene.enemies.getChildren()[0]?.maxHp, 'automatic weapon did not fire at enemy');
const enemy = scene.enemies.getChildren()[0];
if (enemy) scene.hitEnemy({ damage: 99999, destroy() {}, blast: 0 }, enemy);
assert(scene.keys.kills >= 1, 'enemy kill was not recorded');
assert(scene.drops.getChildren().some(d => ['coin', 'xp', 'tech'].includes(d.kind)), 'loot did not drop after enemy death');

scene.pickDrop({ kind: 'xp', value: 9999, destroy() {} });
assert(scene.mode === 'levelup', 'level-up choices did not open after enough XP');
scene.mode = 'playing'; scene.overlay.removeAll(true);

const neutral = scene.planets.find(p => p.kind === 'neutral');
scene.player.setPosition(neutral.x, neutral.y);
scene.checkPlanets(30000);
assert(scene.lastDock?.kind === 'neutral', 'neutral docking trigger was not detected');
scene.openDock();
assert(scene.mode === 'docked', 'dock panel did not open');

scene.mode = 'playing'; scene.overlay.removeAll(true); scene.keys.hp = 1; scene.keys.shield = 0; scene.keys.coins = 50;
scene.damagePlayer(5);
assert(scene.mode === 'dead', 'death settlement did not open');
assert(scene.save.blackBox, 'black box was not saved on death');
const deaths = scene.save.blackBox;
scene.startRun();
assert(scene.drops.getChildren().some(d => d.kind === 'black_box'), 'black box drop did not spawn in next run');
const box = scene.drops.getChildren().find(d => d.kind === 'black_box');
scene.player.setPosition(deaths.x, deaths.y);
scene.pickDrop(box);
assert(!scene.save.blackBox, 'black box was not cleared after recovery');
assert(scene.save.blackBoxes >= 1, 'black box recovery count did not increment');

console.log('Runtime smoke verification passed: menu, movement, enemy spawn, auto attack, loot, level-up, neutral dock, death settlement, and black-box recovery all triggered.');
