# 迷失深空：远征者 / Lost Deep Space: Drifter

这是一个放在 `lost-deep-space-clean/` 里的全新干净 H5 游戏项目，不修改旧项目、不复用旧 Canvas 原型、不复用旧资产管线。

## 游戏内容

第一版 Demo 包含：主菜单、玩家飞船移动、无限太空背景、随机星球生成、星球守卫敌人、自动攻击、金币/经验/科技碎片掉落、升级三选一、中立星球停靠、七大终极文明苏醒 UI、死亡结算、黑匣子机制和 localStorage 保存记录。

## 技术

- TypeScript 入口：`src/main.ts`
- Phaser 3 入口：`import Phaser from 'phaser'` 与 `new Phaser.Game(...)`
- Vite 命令：`npm run dev`、`npm run build`、`npm run preview`
- 程序生成 SVG 占位资源：`scripts/generate-assets.ts` → `public/assets/`

## GitHub Pages

合并 PR 后，仓库根目录的 GitHub Actions workflow 会进入本文件夹执行：

```bash
npm install
npm run generate:assets
npm run build
node scripts/verify-runtime.mjs
```

通过后会部署 `lost-deep-space-clean/dist`，在线试玩链接仍然是：

<https://chenjinhui500-ctrl.github.io/space-game/>
