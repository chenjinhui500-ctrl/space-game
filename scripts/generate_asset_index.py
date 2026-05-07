#!/usr/bin/env python3
"""Generate src/generatedAssetIndex.js from assets_manifest.json."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tools.asset_pipeline import load_manifest

DEFAULT_OUTPUT = ROOT / "src" / "generatedAssetIndex.js"


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def build_index_source(manifest: dict) -> str:
    assets = sorted(manifest.get("assets", []), key=lambda item: item["id"])
    lines = [
        "// This file is auto-generated from assets/manifest/assets_manifest.json.",
        "// Do not edit by hand; run `python scripts/generate_asset_index.py` instead.",
        "",
        "export const GENERATED_ASSETS = Object.freeze({",
    ]
    for asset in assets:
        lines.append(f"  {asset['id']}: {js_string(asset['final_output_path'])},")
    lines += ["});", "", "export function getGeneratedAssetPath(assetId) {", "  return GENERATED_ASSETS[assetId] ?? null;", "}", ""]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate src/generatedAssetIndex.js from the asset manifest.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    manifest = load_manifest()
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(build_index_source(manifest), encoding="utf-8")
    print(output.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
