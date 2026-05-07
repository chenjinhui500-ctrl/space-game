# 《星舰幸存者》 / Starship Survivors

一个无依赖的浏览器端 2D 太空生存射击 Canvas 原型。玩家驾驶飞船在无限深空中移动、生存、割草式战斗，观察星球势力的危险范围，并自由选择路线、挑战星球或进入休息站中转。

当前版本仍保持原生 HTML / CSS / JavaScript + Canvas，无 npm 前端构建、无 Phaser、无 Vite、无 TypeScript、无外部 CDN。

## 项目方向

- 无限宇宙生存
- 飞船割草
- Roguelike 局内成长
- 星球势力挑战
- 周期性休息站中转

## 技术方案

- 原生 HTML
- 原生 CSS
- 原生 JavaScript
- 浏览器 Canvas 2D API
- Python 资产自动化脚本
- OpenAI Image API 批量生成候选图

## 运行游戏原型

无需安装前端依赖，也不需要启动开发服务器。

方式一：直接双击打开：

```text
index.html
```

方式二：在浏览器中选择“打开文件”，然后打开项目根目录下的 `index.html`。

## 资产自动生产方案

本仓库已建立标准化资产管线：

```text
assets/manifest/assets_manifest.json   资产生产权威清单
assets/generated/raw/                   原始候选图
assets/generated/contact_sheets/        候选图汇总图
assets/generated/reviewed/              人工审阅暂存区
assets/generated/logs/                  生成、导出、检查日志
assets/final/{category}/                游戏最终 PNG 资产
assets/source_prompts/                  每个资产的 prompt 快照
```

完整说明见：

- `docs/ASSET_PIPELINE.md`
- `docs/ASSET_NAMING_RULES.md`
- `docs/ASSET_LIST.md`

## 配置 OpenAI API Key

复制示例环境文件：

```bash
cp .env.example .env
```

编辑 `.env` 并填写：

```text
OPENAI_API_KEY=你的本地密钥
```

`.env` 不应提交到仓库。脚本也不会硬编码密钥。

## 安装资产脚本依赖

```bash
python -m pip install -r requirements.txt
```

依赖保持最小：`requests` 用于调用 OpenAI Image API，`Pillow` 用于 contact sheet 与最终 PNG 尺寸归一化。

## 一键生产首批 P0 资产

```bash
python scripts/generate_assets.py --priority P0
python scripts/make_contact_sheets.py --priority P0
python scripts/export_final_assets.py --priority P0
python scripts/generate_asset_report.py
```

如果生成中断，重新运行相同命令即可断点续跑；失败项可用：

```bash
python scripts/retry_failed_assets.py --priority P0
```

## 查看生成结果

- 原始候选图：`assets/generated/raw/{asset_id}/`
- 汇总图：`assets/generated/contact_sheets/{asset_id}_sheet.png`
- 最终 PNG：`assets/final/{category}/{asset_id}.png`
- 资产报告：`docs/ASSET_REPORT.md`
- 完整性报告：`assets/generated/logs/integrity_report.md`



## 资产命名与接入安全

`assets/manifest/assets_manifest.json` 是唯一资产数据源。所有最终 PNG 文件名、分类目录、raw 候选目录和 contact sheet 路径都由 manifest 中的 `id`、`category`、`final_output_path`、`raw_output_dir` 和 `contact_sheet_path` 控制。

不要手动猜测或随意创建 `assets/final/` 下的文件名。游戏代码接入资产时，应优先使用自动生成的索引：

```js
import { GENERATED_ASSETS } from './generatedAssetIndex.js';

const shipPath = GENERATED_ASSETS.ship_player_t1_explorer;
```

也可以使用 `src/assetPaths.js` 中基于 P0 语义别名的封装。后续 Codex 接入资产时，不需要猜文件名，只能查 manifest 和 `src/generatedAssetIndex.js`。

如果自动生成或完整性检查失败，不要继续游戏接入；先修复 manifest 命名、路径或状态问题，再运行：

```bash
python scripts/check_asset_integrity.py
python scripts/generate_asset_index.py
```

## 自动生成资产（GitHub Actions）

仓库提供手动触发的 GitHub Actions 工作流：`Generate Assets`。

运行路径：

```text
GitHub → Actions → Generate Assets → Run workflow
```

首次试跑建议：

- `priority`：先选 `P0`
- `limit`：先填 `3`
- `export_final`：保持默认 `true`

确认生成风格、API 额度消耗、contact sheet 和 final PNG 都符合预期后，再逐步扩大 `limit` 或切换到 `P1 / P2 / P3 / all`。

工作流会读取 GitHub Repository Secret：`OPENAI_API_KEY`。设置路径：

```text
Settings → Secrets and variables → Actions → Repository secrets → New repository secret
```

工作流完成后会上传 artifact，包含 raw 候选图、contact sheets、final PNG、资产报告和日志；如果有生成结果变更，工作流还会尝试提交到 `asset-generation-output` 分支并创建 PR。

## 当前功能

- 黑色太空背景。
- 随机星星背景。
- 玩家飞船临时三角形图形。
- WASD / 方向键移动。
- 空格发射子弹。
- 3 个不同颜色的星球占位圆形。
- 每个星球显示攻击范围圆圈。
- 玩家进入星球攻击范围时显示警告提示。
- 右上角显示简易小地图。
- 左上角显示玩家生命值和当前状态。
- `src/assetPaths.js` 已预留主要 P0 图片路径，后续可逐步替换 Canvas 几何占位。

## 后续计划

1. 配置 `OPENAI_API_KEY` 后生成 P0 候选图和 contact sheet。
2. 人工挑选 `selected_variant` 并导出最终 PNG。
3. 在 Canvas 渲染层中按 `src/assetPaths.js` 逐步接入图片。
4. 继续扩展基础战斗、资源掉落、休息站升级和星球挑战。
