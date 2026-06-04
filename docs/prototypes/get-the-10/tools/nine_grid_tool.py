#!/usr/bin/env python3
"""get the 10 九宫格生成和切割工具。"""

from __future__ import annotations

import argparse
import json
import random
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


@dataclass(frozen=True)
class CellMeta:
    grid_index: int
    cell_index: int
    path: str
    prompt: str
    width: int
    height: int


PALETTES = [
    ("#221918", "#a83228", "#f0c46d", "#31463f"),
    ("#111722", "#35536b", "#e8d8b0", "#a55d35"),
    ("#1d2117", "#5d754d", "#f2d38a", "#c14f3c"),
    ("#211b25", "#62384d", "#d8c4a0", "#2c4c55"),
]

SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="生成或切割 get the 10 九宫格素材")
    sub = parser.add_subparsers(dest="command", required=True)

    demo = sub.add_parser("demo", help="生成三张演示九宫格并切割成 27 张")
    demo.add_argument("--intent", required=True, help="短意图，例如：愤怒")
    demo.add_argument("--output-dir", required=True, type=Path)
    demo.add_argument("--grids", type=int, default=3)
    demo.add_argument("--size", type=int, default=1536)
    demo.add_argument("--seed", type=int, default=42)
    demo.add_argument("--web-root", type=Path, default=None, help="网页根目录，用来把切片路径写成可访问的相对路径")

    cut = sub.add_parser("cut", help="切割真实九宫格图片")
    cut.add_argument("--input", required=True, type=Path)
    cut.add_argument("--output-dir", required=True, type=Path)
    cut.add_argument("--grid-index", type=int, default=1)
    cut.add_argument("--prefix", default="grid")
    cut.add_argument("--web-root", type=Path, default=None, help="网页根目录，用来把切片路径写成可访问的相对路径")

    batch = sub.add_parser("batch-cut", help="切割目录下的多张九宫格图片")
    batch.add_argument("--input-dir", required=True, type=Path)
    batch.add_argument("--output-dir", required=True, type=Path)
    batch.add_argument("--pattern", default="*")
    batch.add_argument("--web-root", type=Path, default=None, help="网页根目录，用来把切片路径写成可访问的相对路径")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.command == "demo":
        return command_demo(args)
    if args.command == "cut":
        metas = cut_grid(args.input, args.output_dir, args.grid_index, args.prefix)
        write_manifest(args.output_dir, metas, args.web_root)
        return 0
    if args.command == "batch-cut":
        all_meta: list[CellMeta] = []
        paths = [path for path in sorted(args.input_dir.glob(args.pattern)) if is_supported_image(path)]
        for grid_index, path in enumerate(paths, start=1):
            all_meta.extend(cut_grid(path, args.output_dir, grid_index, path.stem))
        write_manifest(args.output_dir, all_meta, args.web_root)
        return 0
    raise ValueError(f"未知命令：{args.command}")


def command_demo(args: argparse.Namespace) -> int:
    args.output_dir.mkdir(parents=True, exist_ok=True)
    grids_dir = args.output_dir / "grids"
    slices_dir = args.output_dir / "slices"
    grids_dir.mkdir(parents=True, exist_ok=True)
    slices_dir.mkdir(parents=True, exist_ok=True)
    rng = random.Random(args.seed)
    all_meta: list[CellMeta] = []
    for grid_index in range(1, args.grids + 1):
        grid = create_demo_grid(args.intent, grid_index, args.size, rng)
        grid_path = grids_dir / f"grid-{grid_index:02d}.png"
        grid.save(grid_path)
        all_meta.extend(cut_grid(grid_path, slices_dir, grid_index, f"grid-{grid_index:02d}", args.intent))
    write_manifest(args.output_dir, all_meta, args.web_root)
    return 0


def create_demo_grid(intent: str, grid_index: int, size: int, rng: random.Random) -> Image.Image:
    cell = size // 3
    image = Image.new("RGB", (cell * 3, cell * 3), "#111111")
    for cell_index in range(9):
        local_rng = random.Random(rng.randint(1, 10_000_000))
        tile = create_demo_tile(intent, grid_index, cell_index + 1, cell, local_rng)
        x = (cell_index % 3) * cell
        y = (cell_index // 3) * cell
        image.paste(tile, (x, y))
    return image


def create_demo_tile(intent: str, grid_index: int, cell_index: int, size: int, rng: random.Random) -> Image.Image:
    palette = PALETTES[(grid_index + cell_index + rng.randrange(len(PALETTES))) % len(PALETTES)]
    bg, accent, light, dark = palette
    img = Image.new("RGB", (size, size), bg)
    draw = ImageDraw.Draw(img, "RGBA")
    for y in range(size):
        t = y / max(1, size - 1)
        r0, g0, b0 = hex_to_rgb(bg)
        r1, g1, b1 = hex_to_rgb(accent)
        draw.line([(0, y), (size, y)], fill=(int(r0 * (1 - t) + r1 * t), int(g0 * (1 - t) + g1 * t), int(b0 * (1 - t) + b1 * t), 255))
    horizon = rng.randint(size // 3, int(size * 0.62))
    points = [(0, horizon)]
    for x in range(0, size + 1, max(1, size // 6)):
        points.append((x, horizon + rng.randint(-size // 10, size // 10)))
    points.extend([(size, size), (0, size)])
    draw.polygon(points, fill=(*hex_to_rgb(dark), 172))
    for _ in range(rng.randint(5, 12)):
        x = rng.randint(0, size)
        w = rng.randint(size // 38, size // 14)
        h = rng.randint(size // 6, size // 2)
        y = rng.randint(size // 4, size - h // 2)
        color = light if rng.random() > 0.45 else accent
        draw.rectangle((x, y, x + w, y + h), fill=(*hex_to_rgb(color), rng.randint(65, 150)))
    draw.arc((size * 0.18, size * 0.43, size * 0.86, size * 1.06), 195, 350, fill=(*hex_to_rgb(light), 120), width=max(3, size // 42))
    for _ in range(16):
        x = rng.randint(0, size)
        y = rng.randint(0, size)
        r = rng.randint(1, max(2, size // 70))
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(*hex_to_rgb(light), rng.randint(50, 145)))
    return img.filter(ImageFilter.UnsharpMask(radius=1, percent=112, threshold=3))


def cut_grid(path: Path, output_dir: Path, grid_index: int, prefix: str, intent: str | None = None) -> list[CellMeta]:
    if not path.exists():
        raise FileNotFoundError(path)
    output_dir.mkdir(parents=True, exist_ok=True)
    img = Image.open(path).convert("RGB")
    cell_w = img.width // 3
    cell_h = img.height // 3
    if cell_w < 1 or cell_h < 1:
        raise ValueError(f"图片太小，无法切成九宫格：{path}")
    metas: list[CellMeta] = []
    for idx in range(9):
        col = idx % 3
        row = idx // 3
        x0 = col * cell_w
        y0 = row * cell_h
        x1 = img.width if col == 2 else (col + 1) * cell_w
        y1 = img.height if row == 2 else (row + 1) * cell_h
        tile = img.crop((x0, y0, x1, y1))
        out = output_dir / f"{prefix}-{idx + 1:02d}.png"
        tile.save(out)
        prompt = f"{intent or 'unknown'} / 九宫格 {grid_index} / 切片 {idx + 1}"
        metas.append(CellMeta(grid_index, idx + 1, str(out), prompt, tile.width, tile.height))
    return metas


def write_manifest(output_dir: Path, metas: list[CellMeta], web_root: Path | None = None) -> None:
    manifest = {
        "count": len(metas),
        "items": [
            {
                "grid_index": item.grid_index,
                "cell_index": item.cell_index,
                "path": to_web_path(Path(item.path), web_root),
                "prompt": item.prompt,
                "width": item.width,
                "height": item.height,
            }
            for item in metas
        ],
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def to_web_path(path: Path, web_root: Path | None) -> str:
    if web_root is not None:
        return path.resolve().relative_to(web_root.resolve()).as_posix()
    parts = path.parts
    if "get-the-10" in parts:
        index = parts.index("get-the-10")
        return Path(*parts[index + 1 :]).as_posix()
    return path.as_posix()


def is_supported_image(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


if __name__ == "__main__":
    raise SystemExit(main())
