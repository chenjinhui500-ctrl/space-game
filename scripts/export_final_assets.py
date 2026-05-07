#!/usr/bin/env python3
"""Export selected raw candidates into assets/final/{category}."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tools.asset_pipeline import LOG_DIR, append_jsonl, export_selected_asset, iter_assets, load_manifest, save_manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export selected final PNG assets.")
    parser.add_argument("--priority", choices=["P0", "P1", "P2", "P3"])
    parser.add_argument("--category")
    parser.add_argument("--asset-id")
    parser.add_argument("--status", default="generated", choices=["generated", "reviewed", "exported", "todo", "failed"])
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest = load_manifest()
    failures = 0
    exported = 0
    for asset in iter_assets(manifest, status=args.status, priority=args.priority, category=args.category, asset_id=args.asset_id):
        try:
            out = export_selected_asset(asset)
            append_jsonl(LOG_DIR / "export_final_assets.jsonl", {"event": "exported", "asset_id": asset["id"], "path": str(out)})
            print(out.relative_to(ROOT))
            exported += 1
        except Exception as exc:  # noqa: BLE001
            failures += 1
            append_jsonl(LOG_DIR / "export_final_assets.jsonl", {"event": "failed", "asset_id": asset["id"], "error": str(exc)})
            print(f"FAILED {asset['id']}: {exc}", file=sys.stderr)
    save_manifest(manifest)
    print(f"Exported: {exported}; failures: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
