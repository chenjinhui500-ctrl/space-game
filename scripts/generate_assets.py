#!/usr/bin/env python3
"""Generate raw candidate images from assets_manifest.json via OpenAI Image API."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tools.asset_pipeline import LOG_DIR, append_jsonl, ensure_manifest_dirs, iter_assets, load_manifest, save_manifest, utc_now


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate Starship Survivors asset candidates.")
    parser.add_argument("--manifest", default=str(ROOT / "assets/manifest/assets_manifest.json"))
    parser.add_argument("--status", default="todo", choices=["todo", "failed", "generated", "reviewed", "exported"])
    parser.add_argument("--priority", choices=["P0", "P1", "P2", "P3"])
    parser.add_argument("--category")
    parser.add_argument("--asset-id")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--variants", type=int, help="Override manifest generate_variants for this run.")
    parser.add_argument("--overwrite", action="store_true", help="Regenerate variants even if files already exist.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest_path = Path(args.manifest)
    manifest = load_manifest(manifest_path)
    ensure_manifest_dirs(manifest)
    from tools.openai_image_client import OpenAIImageClient

    client = OpenAIImageClient()
    log_path = LOG_DIR / "generate_assets.jsonl"

    selected = list(iter_assets(manifest, status=args.status, priority=args.priority, category=args.category, asset_id=args.asset_id))
    if args.limit:
        selected = selected[: args.limit]

    if not selected:
        print("No matching manifest items to generate.")
        return 0

    print(f"Generating {len(selected)} manifest item(s). Logs: {log_path}")
    failures = 0
    for asset in selected:
        variants = args.variants or int(asset.get("generate_variants", 4))
        try:
            print(f"- {asset['id']} ({asset['priority']}) x{variants}")
            results = client.generate_variants(
                prompt=asset["prompt"],
                output_dir=ROOT / asset["raw_output_dir"],
                width=int(asset["output_width"]),
                height=int(asset["output_height"]),
                transparent_background=bool(asset["transparent_background"]),
                asset_id=asset["id"],
                variants=variants,
                skip_existing=not args.overwrite,
            )
            asset["status"] = "generated"
            asset["notes"] = (asset.get("notes", "") + f"\nGenerated {variants} candidate(s) at {utc_now()}.").strip()
            append_jsonl(log_path, {"event": "generated", "asset_id": asset["id"], "results": results})
        except Exception as exc:  # noqa: BLE001 - batch runner records and continues
            failures += 1
            asset["status"] = "failed"
            asset["notes"] = (asset.get("notes", "") + f"\nGeneration failed at {utc_now()}: {exc}").strip()
            append_jsonl(log_path, {"event": "failed", "asset_id": asset["id"], "error": str(exc)})
            print(f"  FAILED: {exc}", file=sys.stderr)
        finally:
            save_manifest(manifest, manifest_path)

    print(f"Done. Failures: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
