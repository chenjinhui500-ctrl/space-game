# 《星舰幸存者》资产自动生产管线

## manifest 是什么

`assets/manifest/assets_manifest.json` 是资产生产的唯一权威清单。每个资产包含：唯一 ID、分类、中文名、英文名、用途、风格、prompt、输出尺寸、透明背景要求、候选图数量、最终路径、raw 路径、contact sheet 路径、状态、优先级和标签。

脚本全部以 manifest 为输入和状态存储点，因此支持断点续跑与可追踪输出。

## 环境配置

1. 安装最小 Python 依赖：

```bash
python -m pip install -r requirements.txt
```

2. 配置密钥：

```bash
cp .env.example .env
# 编辑 .env，填写 OPENAI_API_KEY
```

密钥只从环境变量或本地 `.env` 读取，不允许硬编码进仓库。

## 生成候选图

生成 P0 候选图：

```bash
python scripts/generate_assets.py --priority P0
```

常用参数：

- `--priority P0|P1|P2|P3`
- `--category ships`
- `--asset-id ship_player_t1_explorer`
- `--limit 3`
- `--overwrite`

候选图输出到：

```text
assets/generated/raw/{asset_id}/{asset_id}_v01.png
assets/generated/raw/{asset_id}/{asset_id}_v02.png
...
```

生成日志写入：

```text
assets/generated/logs/generate_assets.jsonl
```

## 生成 contact sheet

```bash
python scripts/make_contact_sheets.py --priority P0
```

输出到：

```text
assets/generated/contact_sheets/{asset_id}_sheet.png
```

contact sheet 用于人工快速比较同一资产的多个候选版本。

## 导出最终 PNG

```bash
python scripts/export_final_assets.py --priority P0
```

规则：

1. 如果 manifest 中设置了 `selected_variant`，导出该候选。
2. 如果未设置，默认导出第 1 张候选图。
3. 导出后状态更新为 `exported`。
4. 目标路径为 `assets/final/{category}/{asset_id}.png`。

## 失败重试

```bash
python scripts/retry_failed_assets.py --priority P0
```

该脚本只处理 `status=failed` 的资产，适合网络中断、限流或临时 API 错误后的恢复。

## 完整性检查

```bash
python scripts/check_asset_integrity.py
```

检查内容：

- manifest ID 是否重复。
- 每项是否有 raw 文件夹。
- final 路径分类是否正确。
- raw、contact sheet、final 是否与 status 一致。
- 是否存在丢失候选图或导出文件。

报告输出到：

```text
assets/generated/logs/integrity_report.md
```

## 生产报告

```bash
python scripts/generate_asset_report.py
```

输出：

```text
docs/ASSET_REPORT.md
```

报告统计总资产数、已生成数、已导出数、失败数、分类统计与 P0/P1/P2/P3 完成度。

## 断点续跑机制

- `generate_assets.py` 默认只处理指定 `status` 的资产，通常为 `todo`。
- 已存在的 raw 候选图默认跳过，除非传入 `--overwrite`。
- 每个资产生成结束都会立即写回 manifest，批处理中断后可继续运行。
- 失败项会标记为 `failed`，之后用 `retry_failed_assets.py` 单独重跑。

## 如何扩展新资产

1. 在 `assets/manifest/assets_manifest.json` 新增一项，并遵守 `docs/ASSET_NAMING_RULES.md`。
2. 确认 `category` 对应 `assets/final/{category}/`。
3. 填写 prompt、尺寸、透明背景、优先级和标签。
4. 运行完整性检查。
5. 使用生成脚本按优先级或 ID 批量生成。
