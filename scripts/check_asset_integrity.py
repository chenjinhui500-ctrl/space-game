#!/usr/bin/env python3
"""Validate manifest paths, folders, and status/file consistency."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tools.asset_pipeline import existing_raw_variants, load_manifest, raw_variant_paths


def main() -> int:
    parser = argparse.ArgumentParser(description="Check asset manifest integrity.")
    parser.add_argument("--strict", action="store_true", help="Treat todo assets without raw/final files as failures.")
    parser.add_argument("--output", default=str(ROOT / "assets/generated/logs/integrity_report.md"))
    args = parser.parse_args()

    manifest = load_manifest()
    errors: list[str] = []
    warnings: list[str] = []
    lines = ["# Asset Integrity Report", "", f"Total assets: {len(manifest.get('assets', []))}", ""]

    ids = set()
    for asset in manifest.get("assets", []):
        aid = asset.get("id")
        if aid in ids:
            errors.append(f"Duplicate id: {aid}")
        ids.add(aid)

        raw_dir = ROOT / asset["raw_output_dir"]
        final_path = ROOT / asset["final_output_path"]
        sheet_path = ROOT / asset["contact_sheet_path"]
        if not raw_dir.is_dir():
            errors.append(f"Missing raw directory for {aid}: {asset['raw_output_dir']}")
        if final_path.parent.name != asset["category"]:
            errors.append(f"Final path category mismatch for {aid}: {asset['final_output_path']}")

        raw_paths = raw_variant_paths(asset)
        raw_existing = existing_raw_variants(asset)
        status = asset.get("status")
        if status in {"generated", "reviewed", "exported"} and not raw_existing:
            errors.append(f"{aid} status={status} but no raw variants exist")
        if status in {"reviewed", "exported"} and not sheet_path.exists():
            warnings.append(f"{aid} status={status} but contact sheet is missing")
        if status == "exported" and not final_path.exists():
            errors.append(f"{aid} status=exported but final file is missing")
        if args.strict and status == "todo":
            if not raw_existing:
                warnings.append(f"{aid} todo and no raw candidates yet")
            if not final_path.exists():
                warnings.append(f"{aid} todo and no final PNG yet")
        missing_variants = [p.name for p in raw_paths if status in {"generated", "reviewed", "exported"} and not p.exists()]
        if missing_variants:
            warnings.append(f"{aid} missing expected variants: {', '.join(missing_variants)}")

    lines += ["## Errors", ""] + ([f"- {e}" for e in errors] or ["- None"])
    lines += ["", "## Warnings", ""] + ([f"- {w}" for w in warnings] or ["- None"])
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(output.relative_to(ROOT))
    print(f"errors={len(errors)} warnings={len(warnings)}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
