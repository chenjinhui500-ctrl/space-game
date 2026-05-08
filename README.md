# 迷失深空：远征者 / Lost Deep Space: Drifter

这是一个从干净仓库结构重新建立的 H5 网页小游戏 Demo。目标是让仓库合并到 `main` 后自动部署到 GitHub Pages，你不需要本地运行命令。

## 在线试玩

合并 PR 后，GitHub Actions 会自动部署：

<https://chenjinhui500-ctrl.github.io/space-game/>

## 当前 Demo 内容

- TypeScript 源码入口：`src/main.ts`
- Phaser 3 API 入口：`phaser` 包，并在游戏启动时创建 `new Phaser.Game(...)`
- Vite 命令入口：`npm run dev`、`npm run build`、`npm run preview`
- 程序生成的圆润、可爱、厚描边 SVG 占位资源：`public/assets/`
- 第一版可玩循环：主菜单、飞船移动、程序星球、敌人生成、自动攻击、掉落、升级、中立星球停靠、七大终极文明苏醒 UI、死亡结算、黑匣子存档与回收标记
- GitHub Pages 自动部署：`.github/workflows/pages.yml`

## GitHub 自动部署流程

每次 `main` 更新后，workflow 会自动执行：

```bash
npm install
npm run generate:assets
npm run build
node scripts/verify-runtime.mjs
```

通过后会把 `dist/` 发布到 GitHub Pages。

## 项目结构

```text
.github/workflows/pages.yml  # GitHub Pages 部署
index.html                   # H5 入口
package.json                 # npm 脚本与依赖
public/assets/               # 统一风格 SVG 占位资源
scripts/generate-assets.ts   # 资源生成脚本
scripts/verify-runtime.mjs   # 构建与玩法入口验证
src/main.ts                  # 游戏主逻辑
src/styles.css               # 页面样式
vendor/                      # 当前环境可离线安装的最小本地包
```

> 说明：`vendor/` 只用于保证本仓库在 npm registry 受限环境和 GitHub Actions 中都能稳定执行指定命令，不包含旧 Canvas 原型或旧资产管线。
