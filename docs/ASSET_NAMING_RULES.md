# 《星舰幸存者》资产命名规则

## 统一 ID 格式

资产 ID 使用小写英文、数字和下划线：

```text
{category}_{subtype}_{name}_{tier_or_variant}
```

示例：

- `ship_player_t1_explorer`
- `enemy_basic_small_ship`
- `weapon_laser_basic`
- `resource_exp_orb`
- `planet_fire_war`
- `station_rest_basic`
- `ui_icon_hp`
- `effect_small_explosion`
- `bg_deep_space_main`

## 分类目录

最终资产必须输出到对应分类目录：

```text
assets/final/ships/
assets/final/weapons/
assets/final/enemies/
assets/final/planets/
assets/final/stations/
assets/final/resources/
assets/final/ui/
assets/final/effects/
assets/final/backgrounds/
assets/final/environment/
```

## 文件格式

- 最终游戏资产默认导出为 PNG。
- 原始候选图保留 PNG，路径为 `assets/generated/raw/{asset_id}/`。
- contact sheet 路径为 `assets/generated/contact_sheets/{asset_id}_sheet.png`。
- 图标如未来需要矢量版，可额外输出 SVG，但 PNG 仍是默认接入格式。
- 背景类默认非透明；其他资产默认透明背景。

## 尺寸标准

| 类型 | 默认尺寸 | 背景 |
|---|---:|---|
| 飞船 | 1024x1024 | 透明 |
| 敌人 | 1024x1024 | 透明 |
| 星球 | 1024x1024 | 透明 |
| 武器/特效 | 512x512 | 透明 |
| 资源 | 512x512 | 透明 |
| UI 图标 | 256x256 | 透明 |
| 背景 | 1920x1080 | 非透明 |
| contact sheet | 约 2048 宽 | 非透明汇总图 |

## 状态机

manifest 中的 `status` 只能使用：

- `todo`：尚未生成。
- `generated`：已有 raw 候选图。
- `reviewed`：人工已审阅并设置 `selected_variant`。
- `exported`：已导出最终 PNG。
- `failed`：生成失败，可用 retry 脚本重试。
