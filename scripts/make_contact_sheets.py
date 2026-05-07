#!/usr/bin/env python3
"""Create contact sheets from generated candidate images."""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tools.asset_pipeline import append_jsonl, existing_raw_variants, iter_assets, load_manifest, save_manifest, LOG_DIR


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build contact sheets for generated assets.")
    parser.add_argument("--priority", choices=["P0", "P1", "P2", "P3"])
    parser.add_argument("--category")
    parser.add_argument("--asset-id")
    parser.add_argument("--status", default=None)
    parser.add_argument("--sheet-width", type=int, default=2048)
    parser.add_argument("--thumb-size", type=int, default=448)
    return parser.parse_args()


def make_sheet(asset: dict, paths: list[Path], sheet_width: int, thumb_size: int) -> Path:
    from PIL import Image, ImageDraw, ImageFont

    cols = max(1, sheet_width // (thumb_size + 48))
    rows = math.ceil(len(paths) / cols)
    title_h = 84
    cell_w = sheet_width // cols
    cell_h = thumb_size + 78
    sheet = Image.new("RGB", (sheet_width, title_h + rows * cell_h), (12, 16, 32))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    draw.text((28, 24), f"{asset['id']} / {asset['zh_name']} / {asset['priority']}", fill=(235, 244, 255), font=font)

    for i, path in enumerate(paths):
        image = Image.open(path).convert("RGBA")
        image.thumbnail((thumb_size, thumb_size), Image.Resampling.LANCZOS)
        col = i % cols
        row = i // cols
        x = col * cell_w + (cell_w - image.width) // 2
        y = title_h + row * cell_h + 20
        checker = Image.new("RGBA", (thumb_size, thumb_size), (22, 28, 48, 255))
        px = col * cell_w + (cell_w - thumb_size) // 2
        py = title_h + row * cell_h + 20
        sheet.paste(checker.convert("RGB"), (px, py))
        sheet.paste(image, (x, y), image)
        draw.rectangle((px, py, px + thumb_size, py + thumb_size), outline=(74, 95, 130), width=2)
        draw.text((px + 12, py + thumb_size + 16), f"v{i + 1:02d}: {path.name}", fill=(188, 210, 235), font=font)

    out = ROOT / asset["contact_sheet_path"]
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, "PNG")
    return out


def main() -> int:
    args = parse_args()
    manifest = load_manifest()
    failures = 0
    for asset in iter_assets(manifest, status=args.status, priority=args.priority, category=args.category, asset_id=args.asset_id):
        paths = existing_raw_variants(asset)
        if not paths:
            continue
        try:
            out = make_sheet(asset, paths, args.sheet_width, args.thumb_size)
            if asset.get("status") == "generated":
                asset["notes"] = (asset.get("notes", "") + f"\nContact sheet created: {asset['contact_sheet_path']}").strip()
            append_jsonl(LOG_DIR / "make_contact_sheets.jsonl", {"event": "contact_sheet", "asset_id": asset["id"], "path": str(out)})
            print(out.relative_to(ROOT))
        except Exception as exc:  # noqa: BLE001
            failures += 1
            append_jsonl(LOG_DIR / "make_contact_sheets.jsonl", {"event": "failed", "asset_id": asset["id"], "error": str(exc)})
            print(f"FAILED {asset['id']}: {exc}", file=sys.stderr)
    save_manifest(manifest)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
