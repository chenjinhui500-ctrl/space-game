const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const PLAYER_SPEED = 260;
const BULLET_SPEED = 520;
const BULLET_COOLDOWN = 180;
const STAR_COUNT = 180;

const keys = new Set();
const bullets = [];
let lastShotAt = 0;
let lastFrameTime = performance.now();

const player = {
  x: GAME_WIDTH / 2,
  y: GAME_HEIGHT - 92,
  radius: 16,
  health: 100,
  status: '安全航行',
};

const planets = [
  {
    name: '奥雷利亚',
    x: 230,
    y: 170,
    radius: 36,
    attackRange: 125,
    power: 1,
    attackMode: '脉冲',
    color: '#4cc9f0',
  },
  {
    name: '烬核星',
    x: 680,
    y: 245,
    radius: 48,
    attackRange: 165,
    power: 2,
    attackMode: '激光',
    color: '#ff6b35',
  },
  {
    name: '紫卫星',
    x: 470,
    y: 470,
    radius: 42,
    attackRange: 145,
    power: 3,
    attackMode: '追踪飞弹',
    color: '#9b5de5',
  },
];

const stars = Array.from({ length: STAR_COUNT }, () => ({
  x: Math.random() * GAME_WIDTH,
  y: Math.random() * GAME_HEIGHT,
  radius: 0.6 + Math.random() * 1.6,
  alpha: 0.35 + Math.random() * 0.65,
}));

window.addEventListener('keydown', (event) => {
  keys.add(event.code);

  if (event.code === 'Space' || event.code.startsWith('Arrow')) {
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});

function gameLoop(currentTime) {
  const deltaSeconds = Math.min((currentTime - lastFrameTime) / 1000, 0.05);
  lastFrameTime = currentTime;

  update(deltaSeconds, currentTime);
  draw();

  requestAnimationFrame(gameLoop);
}

function update(deltaSeconds, currentTime) {
  updatePlayer(deltaSeconds);
  updateBullets(deltaSeconds);
  updatePlayerStatus();

  if (keys.has('Space') && currentTime - lastShotAt >= BULLET_COOLDOWN) {
    shootBullet();
    lastShotAt = currentTime;
  }
}

function updatePlayer(deltaSeconds) {
  let moveX = 0;
  let moveY = 0;

  if (keys.has('KeyA') || keys.has('ArrowLeft')) {
    moveX -= 1;
  }

  if (keys.has('KeyD') || keys.has('ArrowRight')) {
    moveX += 1;
  }

  if (keys.has('KeyW') || keys.has('ArrowUp')) {
    moveY -= 1;
  }

  if (keys.has('KeyS') || keys.has('ArrowDown')) {
    moveY += 1;
  }

  if (moveX !== 0 || moveY !== 0) {
    const length = Math.hypot(moveX, moveY);
    player.x += (moveX / length) * PLAYER_SPEED * deltaSeconds;
    player.y += (moveY / length) * PLAYER_SPEED * deltaSeconds;
  }

  player.x = clamp(player.x, player.radius, GAME_WIDTH - player.radius);
  player.y = clamp(player.y, player.radius, GAME_HEIGHT - player.radius);
}

function updateBullets(deltaSeconds) {
  for (let index = bullets.length - 1; index >= 0; index -= 1) {
    bullets[index].y -= BULLET_SPEED * deltaSeconds;

    if (bullets[index].y < -20) {
      bullets.splice(index, 1);
    }
  }
}

function updatePlayerStatus() {
  const activePlanet = getActivePlanet();

  if (!activePlanet) {
    player.status = '安全航行';
    return;
  }

  player.status = `进入 ${activePlanet.name} 攻击范围 | 强度 ${activePlanet.power} | ${activePlanet.attackMode}`;
}

function shootBullet() {
  bullets.push({
    x: player.x,
    y: player.y - 22,
    width: 5,
    height: 16,
  });
}

function draw() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  drawSpaceBackground();
  drawPlanets();
  drawBullets();
  drawPlayer();
  drawHud();
  drawMiniMap();
}

function drawSpaceBackground() {
  ctx.fillStyle = '#02030a';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  for (const star of stars) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlanets() {
  for (const planet of planets) {
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 2;
    ctx.arc(planet.x, planet.y, planet.attackRange, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = planet.color;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#d9f7ff';
    ctx.font = '14px Arial, Microsoft YaHei, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${planet.name} Lv.${planet.power}`, planet.x, planet.y + planet.radius + 22);
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(-18, 20);
  ctx.lineTo(18, 20);
  ctx.closePath();
  ctx.fillStyle = '#66e3ff';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 3;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-8, 21);
  ctx.lineTo(0, 34);
  ctx.lineTo(8, 21);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 196, 87, 0.85)';
  ctx.fill();

  ctx.restore();
}

function drawBullets() {
  ctx.fillStyle = '#fff06a';

  for (const bullet of bullets) {
    ctx.beginPath();
    ctx.roundRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height, 3);
    ctx.fill();
  }
}

function drawHud() {
  drawPanel(18, 18, 330, 78);

  ctx.fillStyle = '#edf6ff';
  ctx.font = '18px Arial, Microsoft YaHei, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`生命值：${player.health}`, 36, 48);

  ctx.fillStyle = player.status === '安全航行' ? '#9dffb0' : '#fff3a3';
  ctx.font = '16px Arial, Microsoft YaHei, sans-serif';
  ctx.fillText(`状态：${player.status}`, 36, 78);

  const activePlanet = getActivePlanet();
  if (!activePlanet) {
    return;
  }

  drawPanel(GAME_WIDTH / 2 - 260, 18, 520, 44);
  ctx.fillStyle = '#fff3a3';
  ctx.font = '18px Arial, Microsoft YaHei, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`警告：已进入 ${activePlanet.name} 的攻击范围`, GAME_WIDTH / 2, 47);
}

function drawMiniMap() {
  const mapWidth = 190;
  const mapHeight = 126;
  const mapX = GAME_WIDTH - mapWidth - 18;
  const mapY = 18;
  const scaleX = mapWidth / GAME_WIDTH;
  const scaleY = mapHeight / GAME_HEIGHT;

  drawPanel(mapX, mapY, mapWidth, mapHeight);

  ctx.fillStyle = '#edf6ff';
  ctx.font = '13px Arial, Microsoft YaHei, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('小地图', mapX + 12, mapY + 20);

  for (const planet of planets) {
    ctx.beginPath();
    ctx.fillStyle = planet.color;
    ctx.arc(mapX + planet.x * scaleX, mapY + planet.y * scaleY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.arc(
      mapX + planet.x * scaleX,
      mapY + planet.y * scaleY,
      planet.attackRange * scaleX,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.fillStyle = '#66e3ff';
  ctx.arc(mapX + player.x * scaleX, mapY + player.y * scaleY, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPanel(x, y, width, height) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 10);
  ctx.fill();
  ctx.stroke();
}

function getActivePlanet() {
  return planets.find((planet) => {
    const distance = Math.hypot(player.x - planet.x, player.y - planet.y);
    return distance <= planet.attackRange;
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

requestAnimationFrame(gameLoop);
