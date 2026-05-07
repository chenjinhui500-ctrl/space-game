"""Shared manifest, file, and image utilities for asset automation scripts."""

from __future__ import annotations

import json
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "assets" / "manifest" / "assets_manifest.json"
LOG_DIR = ROOT / "assets" / "generated" / "logs"
REPORT_PATH = ROOT / "docs" / "ASSET_REPORT.md"
FINAL_CATEGORY_DIRS = {
    "ships",
    "weapons",
    "enemies",
    "planets",
    "stations",
    "resources",
    "ui",
    "effects",
    "backgrounds",
    "environment",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_manifest(path: Path = MANIFEST_PATH) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def save_manifest(manifest: Dict[str, Any], path: Path = MANIFEST_PATH) -> None:
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def iter_assets(
    manifest: Dict[str, Any],
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    asset_id: Optional[str] = None,
) -> Iterable[Dict[str, Any]]:
    for asset in manifest.get("assets", []):
        if status and asset.get("status") != status:
            continue
        if priority and asset.get("priority") != priority:
            continue
        if category and asset.get("category") != category:
            continue
        if asset_id and asset.get("id") != asset_id:
            continue
        yield asset


def append_jsonl(path: Path, record: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    record = {"timestamp": utc_now(), **record}
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def ensure_manifest_dirs(manifest: Dict[str, Any]) -> None:
    for asset in manifest.get("assets", []):
        (ROOT / asset["raw_output_dir"]).mkdir(parents=True, exist_ok=True)
        (ROOT / asset["contact_sheet_path"]).parent.mkdir(parents=True, exist_ok=True)
        (ROOT / asset["final_output_path"]).parent.mkdir(parents=True, exist_ok=True)


def raw_variant_path(asset: Dict[str, Any], variant_index: int) -> Path:
    return ROOT / asset["raw_output_dir"] / f"{asset['id']}_v{variant_index:02d}.png"


def raw_variant_paths(asset: Dict[str, Any]) -> List[Path]:
    return [raw_variant_path(asset, i) for i in range(1, int(asset.get("generate_variants", 4)) + 1)]


def existing_raw_variants(asset: Dict[str, Any]) -> List[Path]:
    return [path for path in raw_variant_paths(asset) if path.exists() and path.stat().st_size > 0]


def selected_variant_index(asset: Dict[str, Any]) -> int:
    selected = asset.get("selected_variant")
    if isinstance(selected, int) and selected > 0:
        return selected
    if isinstance(selected, str) and selected.isdigit():
        return int(selected)
    return 1


def export_selected_asset(asset: Dict[str, Any]) -> Path:
    source = raw_variant_path(asset, selected_variant_index(asset))
    if not source.exists():
        available = existing_raw_variants(asset)
        if not available:
            raise FileNotFoundError(f"No raw variants available for {asset['id']}")
        source = available[0]
    destination = ROOT / asset["final_output_path"]
    destination.parent.mkdir(parents=True, exist_ok=True)

    try:
        from PIL import Image

        with Image.open(source) as image:
            image = image.convert("RGBA") if asset.get("transparent_background") else image.convert("RGB")
            desired_size = (int(asset["output_width"]), int(asset["output_height"]))
            if image.size != desired_size:
                image.thumbnail(desired_size, Image.Resampling.LANCZOS)
                mode = "RGBA" if asset.get("transparent_background") else "RGB"
                fill = (0, 0, 0, 0) if mode == "RGBA" else (5, 8, 22)
                canvas = Image.new(mode, desired_size, fill)
                offset = ((desired_size[0] - image.width) // 2, (desired_size[1] - image.height) // 2)
                if mode == "RGBA":
                    canvas.paste(image, offset, image)
                else:
                    canvas.paste(image, offset)
                image = canvas
            image.save(destination, "PNG")
    except ImportError:
        shutil.copy2(source, destination)

    asset["status"] = "exported"
    asset["selected_variant"] = selected_variant_index(asset)
    asset["notes"] = (asset.get("notes", "") + f"\nExported from {source.name} at {utc_now()}.").strip()
    return destination


def stats_by_field(manifest: Dict[str, Any], field: str) -> Counter:
    return Counter(asset.get(field, "unknown") for asset in manifest.get("assets", []))


def priority_completion(manifest: Dict[str, Any]) -> Dict[str, Dict[str, int]]:
    output: Dict[str, Dict[str, int]] = defaultdict(lambda: Counter())
    for asset in manifest.get("assets", []):
        output[asset.get("priority", "unknown")][asset.get("status", "unknown")] += 1
        output[asset.get("priority", "unknown")]["total"] += 1
    return {key: dict(value) for key, value in sorted(output.items())}
