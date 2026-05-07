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

## GitHub Actions 自动生成资产

仓库新增了手动工作流：

```text
.github/workflows/generate-assets.yml
```

该工作流只会在 GitHub 页面手动触发，不会在 push 或 PR 时自动消耗图片生成额度。

### 设置 OPENAI_API_KEY Secret

在 GitHub 仓库页面按以下路径设置密钥：

```text
Settings → Secrets and variables → Actions → Repository secrets → New repository secret
```

- Name：`OPENAI_API_KEY`
- Secret：填写你的 OpenAI API Key

不要把 Key 写进仓库、README、manifest、workflow 或任何脚本中。原因：

- 仓库历史不可轻易删除，误提交的 Key 即使后来删除也可能已泄露。
- PR、Actions 日志和 fork 可能扩大泄露范围。
- 使用 GitHub Secrets 可以让 Actions 在运行时注入环境变量，脚本只读取 `OPENAI_API_KEY`，不会把密钥写入文件。

### 手动运行流程

在 GitHub 页面：

```text
GitHub → Actions → Generate Assets → Run workflow
```

参数建议：

- `priority`：第一次先选 `P0`。
- `limit`：第一次先填 `3`，确认风格、费用和输出都正常后再扩大。
- `export_final`：默认 `true`，会把默认候选图导出到 `assets/final/{category}/`。

工作流执行内容：

1. checkout 仓库。
2. setup Python。
3. `python -m pip install -r requirements.txt`。
4. 按输入的 `priority` 和 `limit` 运行 `scripts/generate_assets.py`。
5. 运行 `scripts/make_contact_sheets.py`。
6. 如果 `export_final=true`，运行 `scripts/export_final_assets.py`。
7. 运行 `scripts/check_asset_integrity.py`。
8. 运行 `scripts/generate_asset_report.py`。
9. 上传生成结果 artifact。
10. 如果有文件变化，提交到 `asset-generation-output` 分支并创建 PR。

### Artifact 内容

每次工作流都会上传 artifact，包含：

```text
assets/generated/raw/
assets/generated/contact_sheets/
assets/final/
docs/ASSET_REPORT.md
assets/generated/logs/
```

如果自动创建 PR 因权限或分支保护失败，可在 workflow run 页面下载 artifact，手动检查并合并生成结果。

## 命名与接入安全加固

`assets/manifest/assets_manifest.json` 是唯一资产数据源。所有最终 PNG 文件名、分类目录、raw 候选目录、contact sheet 路径和游戏接入路径都必须从 manifest 字段读取，不允许后续人工猜测或随意创建最终资产文件名。

### 严格校验规则

`python scripts/check_asset_integrity.py` 会阻止以下问题继续进入 GitHub Actions：

- 重复资产 ID。
- ID 含有非小写英文、数字或下划线字符。
- 缺少 `category`、`final_output_path`、`raw_output_dir` 或 `contact_sheet_path`。
- `final_output_path` 不在 `assets/final/{category}/` 下。
- `raw_output_dir` 不等于 `assets/generated/raw/{asset_id}`。
- `contact_sheet_path` 不在 `assets/generated/contact_sheets/` 下。
- `output_format` 不是 `png`。
- 缺少 `transparent_background`。
- `priority` 不是 `P0 / P1 / P2 / P3`。
- `status` 不是 `todo / generated / reviewed / exported / failed`。
- 多个资产输出到同一个 `final_output_path`。

如果检查失败，脚本返回非零退出码，GitHub Actions 会停止，不应继续导出错误资产或接入游戏。

### 自动生成游戏接入索引

运行：

```bash
python scripts/generate_asset_index.py
```

会从 manifest 生成：

```text
src/generatedAssetIndex.js
```

游戏代码应优先通过以下方式读取资产：

- `GENERATED_ASSETS[asset_id]`
- `getGeneratedAssetPath(asset_id)`
- `src/assetPaths.js` 中面向 P0/语义别名的封装

后续 Codex 或人工接入资产时，不需要猜文件名，只能查 `assets_manifest.json` 和 `src/generatedAssetIndex.js`。如果 manifest 改动，必须重新运行 `python scripts/generate_asset_index.py` 再接入。

### GitHub Actions 中的安全顺序

`Generate Assets` workflow 会先运行完整性检查，再生成图片；图片生成、contact sheet 和 final PNG 导出后，会重新生成 `src/generatedAssetIndex.js`，再次运行完整性检查，最后才生成报告和上传 artifact。任何 integrity 失败都会让 workflow 失败，避免错误路径继续扩散。
