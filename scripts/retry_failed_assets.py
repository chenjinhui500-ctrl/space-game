#!/usr/bin/env python3
"""Retry only failed manifest items by delegating to generate_assets.py."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser(description="Retry failed image generations.")
    parser.add_argument("--priority", choices=["P0", "P1", "P2", "P3"])
    parser.add_argument("--category")
    parser.add_argument("--asset-id")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    command = [sys.executable, str(ROOT / "scripts/generate_assets.py"), "--status", "failed"]
    for name in ("priority", "category", "asset_id", "limit"):
        value = getattr(args, name)
        if value:
            command.extend([f"--{name.replace('_', '-')}", str(value)])
    if args.overwrite:
        command.append("--overwrite")
    return subprocess.call(command, cwd=ROOT)


if __name__ == "__main__":
    raise SystemExit(main())
