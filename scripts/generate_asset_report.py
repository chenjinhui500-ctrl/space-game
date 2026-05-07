#!/usr/bin/env python3
"""Generate a Markdown production report from assets_manifest.json."""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tools.asset_pipeline import REPORT_PATH, load_manifest, priority_completion, stats_by_field, utc_now


def table(counter: Counter) -> list[str]:
    lines = ["| Key | Count |", "|---|---:|"]
    for key, count in sorted(counter.items()):
        lines.append(f"| {key} | {count} |")
    return lines


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate asset status report.")
    parser.add_argument("--output", default=str(REPORT_PATH))
    args = parser.parse_args()
    manifest = load_manifest()
    assets = manifest.get("assets", [])
    status = stats_by_field(manifest, "status")
    category = stats_by_field(manifest, "category")
    priority = stats_by_field(manifest, "priority")
    completion = priority_completion(manifest)

    lines = [
        "# 《星舰幸存者》资产生产报告",
        "",
        f"生成时间：{utc_now()}",
        f"资产总数：{len(assets)}",
        f"已生成数：{status.get('generated', 0)}",
        f"已导出数：{status.get('exported', 0)}",
        f"失败数：{status.get('failed', 0)}",
        "",
        "## 按状态统计",
        "",
        *table(status),
        "",
        "## 按分类统计",
        "",
        *table(category),
        "",
        "## 按优先级统计",
        "",
        *table(priority),
        "",
        "## P0/P1/P2/P3 完成度",
        "",
        "| Priority | Total | Todo | Generated | Reviewed | Exported | Failed |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for prio in ["P0", "P1", "P2", "P3"]:
        row = completion.get(prio, {})
        lines.append(
            f"| {prio} | {row.get('total', 0)} | {row.get('todo', 0)} | {row.get('generated', 0)} | "
            f"{row.get('reviewed', 0)} | {row.get('exported', 0)} | {row.get('failed', 0)} |"
        )
    lines += ["", "## P0 资产清单", ""]
    for asset in assets:
        if asset.get("priority") == "P0":
            lines.append(f"- `{asset['id']}` / {asset['zh_name']} / status={asset['status']}")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(output.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
