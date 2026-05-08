"""Minimal OpenAI Image API client for the Starship Survivors asset pipeline.

This module intentionally uses only ``requests`` plus the standard library so the
Canvas prototype remains independent from front-end build tooling. It reads API
credentials from environment variables and can optionally load a local .env file.
"""

from __future__ import annotations

import base64
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

OPENAI_IMAGE_ENDPOINT = "https://api.openai.com/v1/images/generations"
SUPPORTED_GPT_IMAGE_SIZES = {"1024x1024", "1024x1536", "1536x1024", "auto"}


def load_dotenv(path: str | Path = ".env") -> None:
    """Load simple KEY=VALUE lines into os.environ if not already present."""
    env_path = Path(path)
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def normalize_generation_size(width: int, height: int) -> str:
    """Choose an Image API-compatible size closest to the desired output."""
    if width == height:
        return "1024x1024"
    if width > height:
        return "1536x1024"
    return "1024x1536"


class OpenAIImageClient:
    """Small wrapper around the OpenAI Image API text-to-image endpoint."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        quality: Optional[str] = None,
        max_retries: Optional[int] = None,
        retry_seconds: Optional[float] = None,
        timeout: int = 180,
    ) -> None:
        load_dotenv()
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model or os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1")
        self.quality = quality or os.getenv("OPENAI_IMAGE_QUALITY", "medium")
        self.max_retries = int(max_retries or os.getenv("OPENAI_IMAGE_MAX_RETRIES", "3"))
        self.retry_seconds = float(retry_seconds or os.getenv("OPENAI_IMAGE_RETRY_SECONDS", "3"))
        self.timeout = timeout

    def require_api_key(self) -> None:
        if not self.api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Copy .env.example to .env, add a key, "
                "or export OPENAI_API_KEY before running generation."
            )

    def generate_image(
        self,
        prompt: str,
        output_path: str | Path,
        width: int,
        height: int,
        transparent_background: bool,
        asset_id: str,
        variant_index: int,
    ) -> Dict[str, Any]:
        """Generate one image and save it to output_path."""
        self.require_api_key()
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        size = normalize_generation_size(width, height)
        payload: Dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "size": size,
            "quality": self.quality,
            "output_format": "png",
        }
        if self.model.startswith("gpt-image"):
            payload["background"] = "transparent" if transparent_background else "opaque"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        last_error: Optional[str] = None
        for attempt in range(1, self.max_retries + 1):
            started_at = time.time()
            try:
                response = requests.post(
                    OPENAI_IMAGE_ENDPOINT,
                    headers=headers,
                    data=json.dumps(payload),
                    timeout=self.timeout,
                )
                if response.status_code >= 400:
                    last_error = f"HTTP {response.status_code}: {response.text[:1000]}"
                    raise RuntimeError(last_error)

                body = response.json()
                data = body.get("data") or []
                if not data:
                    last_error = "OpenAI response did not include image data"
                    raise RuntimeError(last_error)

                image_record = data[0]
                if "b64_json" in image_record:
                    output_path.write_bytes(base64.b64decode(image_record["b64_json"]))
                elif "url" in image_record:
                    image_response = requests.get(image_record["url"], timeout=self.timeout)
                    image_response.raise_for_status()
                    output_path.write_bytes(image_response.content)
                else:
                    last_error = "Image record had neither b64_json nor url"
                    raise RuntimeError(last_error)

                return {
                    "asset_id": asset_id,
                    "variant_index": variant_index,
                    "output_path": str(output_path),
                    "size_requested": f"{width}x{height}",
                    "size_generated": size,
                    "transparent_background": transparent_background,
                    "attempt": attempt,
                    "duration_seconds": round(time.time() - started_at, 2),
                    "status": "ok",
                    "model": self.model,
                }
            except Exception as exc:  # noqa: BLE001 - logged for resumable batch generation
                last_error = str(exc)
                if attempt < self.max_retries:
                    time.sleep(self.retry_seconds * attempt)

        raise RuntimeError(
            f"Failed to generate {asset_id} variant {variant_index} after "
            f"{self.max_retries} attempts: {last_error}"
        )

    def generate_variants(
        self,
        prompt: str,
        output_dir: str | Path,
        width: int,
        height: int,
        transparent_background: bool,
        asset_id: str,
        variants: int,
        skip_existing: bool = True,
    ) -> List[Dict[str, Any]]:
        """Generate several candidate PNGs for one manifest item."""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        results: List[Dict[str, Any]] = []
        for variant_index in range(1, variants + 1):
            output_path = output_dir / f"{asset_id}_v{variant_index:02d}.png"
            if skip_existing and output_path.exists() and output_path.stat().st_size > 0:
                results.append(
                    {
                        "asset_id": asset_id,
                        "variant_index": variant_index,
                        "output_path": str(output_path),
                        "status": "skipped_existing",
                    }
                )
                continue
            results.append(
                self.generate_image(
                    prompt=prompt,
                    output_path=output_path,
                    width=width,
                    height=height,
                    transparent_background=transparent_background,
                    asset_id=asset_id,
                    variant_index=variant_index,
                )
            )
        return results
