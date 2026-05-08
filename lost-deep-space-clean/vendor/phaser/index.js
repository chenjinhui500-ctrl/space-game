const Phaser = {
  VERSION: '3.90.0-local-clean',
  AUTO: 'AUTO',
  Math: {
    Clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) }
  }
};

Phaser.Game = class Game {
  constructor(config = {}) {
    this.config = config;
    console.info(`[Phaser ${Phaser.VERSION}] ${config.title || 'Game'} ready`);
  }
};

export default Phaser;
export const VERSION = Phaser.VERSION;
