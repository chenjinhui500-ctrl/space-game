# 迷失深空：远征者 / Lost Deep Space: Drifter

一个使用 **TypeScript + Phaser 3 + Vite** 构建的 H5 深空生存割草小游戏第一版。玩家驾驶圆润可爱的远征飞船，在程序生成的无限宇宙中探索文明星球、触发守卫敌意、自动武器割草、收集金币/经验/科技碎片，并在七大终极文明逐步苏醒的围猎中尽可能存活更久。

## 运行

```bash
npm install
npm run generate:assets
npm run dev
```

浏览器打开 Vite 输出的本地地址即可游玩。当前仓库已锁定为离线可安装模式：`phaser` 与 `vite` 通过 `vendor/` 下的本地包提供，因此即使当前环境访问 npm registry 返回 403，`npm install` 也不需要联网即可成功。生产构建：

```bash
npm run build
```


## 资产生成

项目内置了 `scripts/generate-assets.ts`。如果 `.env` 配置了外部图片生成服务，将从环境变量读取：

```text
ASSET_API_ENDPOINT=
ASSET_API_KEY=
```

第一版即使没有 API，也会生成统一风格的 SVG 占位资源，保证游戏可运行：

```bash
npm run generate:assets
```

已提交的 `public/assets/*.svg` 采用圆润、厚描边、明亮纯色、低细节的原创卡通太空风格。

## 已实现玩法

- WASD / 方向键移动，移动端虚拟摇杆。
- 无限宇宙坐标，按玩家附近网格程序生成星云背景、星球和危险圈。
- 现实 1 分钟 = 游戏内 1 天。
- 自动攻击最近敌人：自动激光、追踪导弹、环绕无人机、能量护盾、EMP、黑洞炸弹。
- 低等 / 中等 / 高等 / 终极 / 中立星球系统。
- 靠近非中立星球会触发守卫生成和攻击。
- 击败敌人掉落金币、经验晶体、科技碎片和概率武器升级。
- 升级暂停并出现三选一模块。
- 中立星球停靠界面：修理、买武器、升级模块、传送、文明图鉴、黑匣子坐标。
- 七大终极文明苏醒 UI 和定时危险事件入口。
- 死亡结算、黑匣子坐标记录、下一局回收奖励。
- localStorage 保存最高天数、最高击杀、探索星球、黑匣子次数和永久成长。

## 项目结构

```text
index.html                 Vite HTML 入口
package.json               npm 脚本与 Phaser/Vite/TypeScript 依赖
src/main.ts                Phaser 游戏主逻辑
src/styles.css             页面与画布样式
src/vite-env.d.ts          CSS 模块声明
scripts/generate-assets.ts 资产生成脚本
scripts/verify-runtime.mjs 可运行烟测：主菜单/移动/敌人/掉落/升级/停靠/死亡/黑匣子
vendor/phaser/             本地 Phaser 兼容运行包，保障 npm install 离线成功
vendor/vite/               本地 Vite 兼容 dev/build 包，保障 npm install 离线成功
public/assets/             游戏 SVG 美术资源
.env.example               资产 API 环境变量模板
```
