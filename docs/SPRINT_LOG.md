# Sprint Log

## 2026-05-07：资产自动生产系统搭建

### 本次完成内容

- 建立 `assets/manifest/`、`assets/generated/`、`assets/final/`、`assets/source_prompts/` 标准目录结构。
- 建立全量 `assets_manifest.json` 与可读版 `docs/ASSET_LIST.md`。
- 建立统一风格文件 `assets/manifest/style_guide.json`。
- 实现 OpenAI Image API 封装：`tools/openai_image_client.py`。
- 实现 manifest/路径/导出共享工具：`tools/asset_pipeline.py`。
- 实现批量生图、contact sheet、最终导出、失败重试、完整性检查和报告脚本。
- 新增 `src/assetPaths.js`，为 Canvas 原型后续接入 P0 图片资产预留映射。
- 更新 README 和资产管线文档。

### 资产总数

- 总计：89
- P0：19
- P1：36
- P2：26
- P3：8

### P0 列表

- `ship_player_t1_explorer`：T1探索船
- `effect_thruster_flame_basic`：推进器火焰
- `weapon_laser_basic`：基础激光占位
- `effect_small_explosion`：小爆炸
- `enemy_basic_small_ship`：小型飞船
- `planet_fire_war`：赤焰战争星
- `planet_rock_mining`：碎岩矿星
- `planet_hive_breeding`：虫巢孵化星
- `effect_planet_range_outer_basic`：星球外圈范围特效
- `bg_deep_space_main`：深空背景
- `station_rest_basic`：休息站主体
- `resource_exp_orb`：经验球
- `ui_icon_rest_station`：休息站图标
- `ui_icon_hp`：HP
- `ui_icon_shield`：Shield
- `ui_icon_xp`：XP
- `ui_icon_level`：Level
- `ui_icon_kill`：Kill
- `ui_icon_timer`：Timer

### 已生成 / 未生成状态

当前已完成生产系统与全量 manifest。由于仓库环境没有提供 `OPENAI_API_KEY`，本次未实际调用 Image API 生成第一批 PNG；所有资产仍处于 `todo` 状态。配置 `.env` 后即可按 P0/P1/P2/P3 分批运行。

### 后续建议

1. 配置本地 `.env` 并先运行 `python scripts/generate_assets.py --priority P0`。
2. 运行 `python scripts/make_contact_sheets.py --priority P0`，人工查看 contact sheet。
3. 在 manifest 中为需要人工挑选的资产设置 `selected_variant`。
4. 运行 `python scripts/export_final_assets.py --priority P0` 导出首批可接入 PNG。
5. 将 `src/assetPaths.js` 中 P0 路径逐步接入 Canvas 渲染层。
