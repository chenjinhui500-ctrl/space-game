#!/usr/bin/env python3
"""Validate manifest naming, paths, folders, and status/file consistency."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tools.asset_pipeline import existing_raw_variants, load_manifest, raw_variant_paths

ID_PATTERN = re.compile(r"^[a-z0-9_]+$")
VALID_PRIORITIES = {"P0", "P1", "P2", "P3"}
VALID_STATUSES = {"todo", "generated", "reviewed", "exported", "failed"}


def is_relative_safe_posix_path(value: str) -> bool:
    """Return True when value is a relative repo path without parent traversal."""
    if not value or value.startswith("/") or "\\" in value:
        return False
    path = PurePosixPath(value)
    return ".." not in path.parts


def expect_path_under(value: str, expected_parent: str, errors: list[str], label: str, asset_id: str) -> None:
    if not is_relative_safe_posix_path(value):
        errors.append(f"{asset_id} {label} must be a safe relative POSIX path: {value!r}")
        return
    if not value.startswith(expected_parent.rstrip("/") + "/"):
        errors.append(f"{asset_id} {label} must be under {expected_parent}/: {value}")


def validate_manifest_schema(asset: dict, index: int, ids: set[str], final_paths: dict[str, str], errors: list[str]) -> None:
    aid = asset.get("id")
    display_id = aid or f"<asset #{index}>"

    if not isinstance(aid, str) or not aid:
        errors.append(f"Asset #{index} is missing required id")
        return
    if aid in ids:
        errors.append(f"Duplicate id: {aid}")
    ids.add(aid)
    if not ID_PATTERN.fullmatch(aid):
        errors.append(f"{aid} id must use only lowercase letters, numbers, and underscores")

    category = asset.get("category")
    if not isinstance(category, str) or not category:
        errors.append(f"{display_id} must have category")
        category = ""

    final_output_path = asset.get("final_output_path")
    if not isinstance(final_output_path, str) or not final_output_path:
        errors.append(f"{display_id} must have final_output_path")
    else:
        expect_path_under(final_output_path, f"assets/final/{category}", errors, "final_output_path", display_id)
        if not final_output_path.endswith(".png"):
            errors.append(f"{display_id} final_output_path must end with .png: {final_output_path}")
        previous_owner = final_paths.get(final_output_path)
        if previous_owner and previous_owner != aid:
            errors.append(f"Duplicate final_output_path {final_output_path}: {previous_owner} and {aid}")
        final_paths[final_output_path] = aid

    raw_output_dir = asset.get("raw_output_dir")
    expected_raw_dir = f"assets/generated/raw/{aid}"
    if not isinstance(raw_output_dir, str) or not raw_output_dir:
        errors.append(f"{display_id} must have raw_output_dir")
    elif raw_output_dir != expected_raw_dir:
        errors.append(f"{display_id} raw_output_dir must be {expected_raw_dir}: {raw_output_dir}")

    contact_sheet_path = asset.get("contact_sheet_path")
    if not isinstance(contact_sheet_path, str) or not contact_sheet_path:
        errors.append(f"{display_id} must have contact_sheet_path")
    else:
        expect_path_under(
            contact_sheet_path,
            "assets/generated/contact_sheets",
            errors,
            "contact_sheet_path",
            display_id,
        )
        if not contact_sheet_path.endswith(".png"):
            errors.append(f"{display_id} contact_sheet_path must end with .png: {contact_sheet_path}")

    if asset.get("output_format") != "png":
        errors.append(f"{display_id} output_format must be png")
    if "transparent_background" not in asset:
        errors.append(f"{display_id} must include transparent_background")
    elif not isinstance(asset.get("transparent_background"), bool):
        errors.append(f"{display_id} transparent_background must be a boolean")
    if asset.get("priority") not in VALID_PRIORITIES:
        errors.append(f"{display_id} priority must be one of {sorted(VALID_PRIORITIES)}")
    if asset.get("status") not in VALID_STATUSES:
        errors.append(f"{display_id} status must be one of {sorted(VALID_STATUSES)}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Check asset manifest integrity.")
    parser.add_argument("--strict", action="store_true", help="Treat todo assets without raw/final files as failures.")
    parser.add_argument("--output", default=str(ROOT / "assets/generated/logs/integrity_report.md"))
    args = parser.parse_args()

    manifest = load_manifest()
    errors: list[str] = []
    warnings: list[str] = []
    assets = manifest.get("assets", [])
    lines = ["# Asset Integrity Report", "", f"Total assets: {len(assets)}", ""]

    ids: set[str] = set()
    final_paths: dict[str, str] = {}
    for index, asset in enumerate(assets, start=1):
        validate_manifest_schema(asset, index, ids, final_paths, errors)
        aid = asset.get("id")
        if not isinstance(aid, str) or not aid:
            continue

        raw_output_dir = asset.get("raw_output_dir")
        final_output_path = asset.get("final_output_path")
        contact_sheet_path = asset.get("contact_sheet_path")
        if not all(isinstance(value, str) and value for value in (raw_output_dir, final_output_path, contact_sheet_path)):
            continue

        raw_dir = ROOT / raw_output_dir
        final_path = ROOT / final_output_path
        sheet_path = ROOT / contact_sheet_path
        if not raw_dir.is_dir():
            errors.append(f"Missing raw directory for {aid}: {raw_output_dir}")
        if final_path.parent.as_posix() != (ROOT / "assets" / "final" / asset.get("category", "")).as_posix():
            errors.append(f"Final path category mismatch for {aid}: {final_output_path}")

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
