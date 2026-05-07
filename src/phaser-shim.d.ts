declare namespace Phaser {
  const AUTO: any;
  class Scene { constructor(config?: any); [key: string]: any; }
  class Game { constructor(config: any); }
  namespace Physics { namespace Arcade { type Image = any; type Group = any; } }
  namespace GameObjects { type Image = any; type Container = any; type TileSprite = any; type Arc = any; }
  namespace Types { namespace Input { namespace Keyboard { type CursorKeys = any; } } }
  namespace Input { namespace Keyboard { type Key = any; } type Pointer = any; }
  namespace Math { const Distance: any; const RND: any; function Between(a: number, b: number): number; function FloatBetween(a: number, b: number): number; function Clamp(v: number, min: number, max: number): number; const Angle: any; }
  namespace Utils { namespace Array { function GetRandom<T>(a: T[]): T; function Shuffle<T>(a: T[]): T[]; } }
  namespace Scale { const FIT: any; const CENTER_BOTH: any; }
}
declare module 'phaser' { export default Phaser; }
