#!/usr/bin/env python3

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


ROOT = Path("/mnt/data/repositories/ClawObserver")
ASSETS = ROOT / "clawobserver" / "static" / "assets"
LAYOUT_PATH = ROOT / "clawobserver" / "static" / "reference-scene-layout.json"
CURRENT_SAMPLE = ASSETS / "static_scene.jpg"
REFERENCE_BG = ASSETS / "reference-scene-base.jpg"
OUTPUT_IMAGE = ROOT / "tmp" / "static_scene_tuned_20260509.png"
OUTPUT_REPORT = ROOT / "tmp" / "static_scene_tuned_20260509_report.md"

TOP_TAG_SHIFT = (8, -15)
MID_TAG_SHIFT = (5, 18)
WORKSTATION_SCALE = 0.90
WORKSTATION_DROP = 11
LOUNGE_SCALE = 0.85
LOUNGE_POS = (228, 606, 158, 236)
LOUNGE_TAG_RECT = (342, 617, 120, 34)


WORKSTATION_TOP = [
    ("main", "Main (5)"),
    ("se-codex", "SE Codex (5)"),
    ("media-manager", "Media Mgr (4)"),
    ("info-assistant", "Info Asst (2)"),
    ("Generated Image May 09, 2026 - 10_31AM", "Build Ops (4)"),
]

WORKSTATION_MID = [
    ("Generated Image May 09, 2026 - 10_11AM", "Test Eng (3)"),
    ("agent-keeper", "UI Design (1)"),
    ("se-kiro", "Deployer (0)"),
    ("server-manager", "Monitor (0)"),
    ("main", "Security (3)"),
]

LOUNGE_AGENT = ("agent-keeper", "Break")


def load_font(size: int) -> ImageFont.ImageFont:
    for candidate in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    ):
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def fit_text(draw: ImageDraw.ImageDraw, text: str, max_width: int, start_size: int, min_size: int = 10):
    for size in range(start_size, min_size - 1, -1):
        font = load_font(size)
        box = draw.textbbox((0, 0), text, font=font)
        if box[2] - box[0] <= max_width:
            return font
    return load_font(min_size)


def clean_label(name: str) -> str:
    return Path(name).stem.replace("-", " ").replace("_", " ").title()


def crop_pose_sheet(path: Path, state: str) -> Image.Image:
    sheet = Image.open(path).convert("RGB")
    width, height = sheet.size
    if width >= height * 1.4:
        half = width // 2
        crop_box = (0, 0, half, height) if state == "working" else (half, 0, width, height)
        pose = sheet.crop(crop_box).convert("RGBA")
    else:
        pose = sheet.convert("RGBA")

    bg = Image.new("RGB", pose.size, pose.getpixel((5, 5)))
    diff = ImageChops.difference(pose.convert("RGB"), bg)
    diff = diff.filter(ImageFilter.GaussianBlur(radius=1.4))
    mask = diff.convert("L").point(lambda px: 255 if px > 16 else 0)
    bbox = mask.getbbox()
    if bbox:
        pad = 14
        left = max(bbox[0] - pad, 0)
        top = max(bbox[1] - pad, 0)
        right = min(bbox[2] + pad, pose.width)
        bottom = min(bbox[3] + pad, pose.height)
        pose = pose.crop((left, top, right, bottom))
        mask = mask.crop((left, top, right, bottom))
    pose.putalpha(mask)
    return pose


def fit_sprite(sprite: Image.Image, width: int, height: int, scale: float) -> Image.Image:
    ratio = min(width / sprite.width, height / sprite.height)
    ratio *= scale
    new_size = (max(1, int(sprite.width * ratio)), max(1, int(sprite.height * ratio)))
    return sprite.resize(new_size, Image.LANCZOS)


def paste_sprite(base: Image.Image, sprite: Image.Image, rect, scale: float = 1.0):
    x, y, width, height = rect
    scaled = fit_sprite(sprite, width, height, scale)
    paste_x = x + (width - scaled.width) // 2
    paste_y = y + (height - scaled.height)

    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    shadow_sprite = Image.new("RGBA", scaled.size, (0, 0, 0, 0))
    alpha = scaled.getchannel("A").point(lambda px: int(px * 0.28))
    shadow_sprite.putalpha(alpha)
    shadow.alpha_composite(shadow_sprite, (paste_x + 5, paste_y + 8))
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    base.alpha_composite(shadow)
    base.alpha_composite(scaled, (paste_x, paste_y))


def draw_plate_tag(base: Image.Image, rect, text: str, fill, outline, text_fill=(245, 249, 255, 255)):
    x, y, width, height = rect
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle((x, y, x + width, y + height), radius=12, fill=fill, outline=outline, width=2)
    font = fit_text(draw, text, width - 18, 16)
    box = draw.textbbox((0, 0), text, font=font)
    text_w = box[2] - box[0]
    text_h = box[3] - box[1]
    draw.text((x + (width - text_w) / 2, y + (height - text_h) / 2 - 1), text, font=font, fill=text_fill)


def inset_rect(rect, shift, scale=0.92):
    x, y, width, height = rect
    new_w = int(width * scale)
    new_h = int(height * scale)
    new_x = x + (width - new_w) // 2 + shift[0]
    new_y = y + (height - new_h) // 2 + shift[1]
    return new_x, new_y, new_w, new_h


def compare_images():
    current = Image.open(CURRENT_SAMPLE).convert("RGB")
    reference = Image.open(REFERENCE_BG).convert("RGB")
    diff = ImageChops.difference(current, reference).convert("L")
    bbox = diff.point(lambda px: 255 if px > 20 else 0).getbbox()
    return {
        "current_size": current.size,
        "reference_size": reference.size,
        "changed_bbox": bbox,
    }


def main():
    layout = json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))
    comparison = compare_images()
    canvas = Image.open(REFERENCE_BG).convert("RGBA")

    adjustments = []

    for index, (asset_name, tag_text) in enumerate(WORKSTATION_TOP):
        entry = layout["workstations"][index]
        tag = entry["tag"]
        char = entry["character"]
        tag_rect = inset_rect((tag["x"], tag["y"], tag["width"], tag["height"]), TOP_TAG_SHIFT, scale=0.90)
        draw_plate_tag(canvas, tag_rect, tag_text, fill=(30, 83, 154, 236), outline=(18, 49, 95, 255))
        sprite = crop_pose_sheet(ASSETS / f"{asset_name}.jpg", "working")
        char_rect = (char["x"], char["y"] + WORKSTATION_DROP, char["width"], char["height"])
        paste_sprite(canvas, sprite, char_rect, scale=WORKSTATION_SCALE)
        adjustments.append(
            f"top tag {index + 1}: x {tag['x']} -> {tag_rect[0]}, y {tag['y']} -> {tag_rect[1]}; "
            f"sprite y {char['y']} -> {char_rect[1]}, scale {WORKSTATION_SCALE:.2f}"
        )

    for index, (asset_name, tag_text) in enumerate(WORKSTATION_MID, start=5):
        entry = layout["workstations"][index]
        tag = entry["tag"]
        char = entry["character"]
        tag_rect = inset_rect((tag["x"], tag["y"], tag["width"], tag["height"]), MID_TAG_SHIFT, scale=0.90)
        draw_plate_tag(canvas, tag_rect, tag_text, fill=(28, 78, 145, 236), outline=(16, 42, 86, 255))
        sprite = crop_pose_sheet(ASSETS / f"{asset_name}.jpg", "working")
        char_rect = (char["x"], char["y"] + WORKSTATION_DROP, char["width"], char["height"])
        paste_sprite(canvas, sprite, char_rect, scale=WORKSTATION_SCALE)
        adjustments.append(
            f"middle tag {index - 4}: x {tag['x']} -> {tag_rect[0]}, y {tag['y']} -> {tag_rect[1]}; "
            f"sprite y {char['y']} -> {char_rect[1]}, scale {WORKSTATION_SCALE:.2f}"
        )

    lounge_sprite = crop_pose_sheet(ASSETS / f"{LOUNGE_AGENT[0]}.jpg", "idle")
    paste_sprite(canvas, lounge_sprite, LOUNGE_POS, scale=LOUNGE_SCALE)
    draw_plate_tag(
        canvas,
        LOUNGE_TAG_RECT,
        LOUNGE_AGENT[1],
        fill=(31, 89, 158, 232),
        outline=(16, 42, 86, 255),
    )
    adjustments.append(
        f"lounge sprite: rect {LOUNGE_POS}, scale {LOUNGE_SCALE:.2f}; lounge tag moved to {LOUNGE_TAG_RECT}"
    )

    OUTPUT_IMAGE.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT_IMAGE)

    report_lines = [
        "# Tuned Static Scene Sample",
        "",
        f"- Compared `{CURRENT_SAMPLE}` directly against `{REFERENCE_BG}` before rebuild.",
        f"- Source and reference image size: `{comparison['current_size']}` / `{comparison['reference_size']}`.",
        f"- Difference bounding box from comparison: `{comparison['changed_bbox']}`.",
        f"- Output image: `{OUTPUT_IMAGE}`.",
        "",
        "## Applied Adjustments",
    ]
    report_lines.extend(f"- {item}" for item in adjustments)
    report_lines.extend(
        [
            "",
            "## Remaining Obvious Issues",
            "- Sprite extraction still relies on soft gray-background cutouts, so some edge haloing may remain on close inspection.",
            "- Character art styles are mixed because this pass prioritizes placement correction over full asset harmonization.",
        ]
    )
    OUTPUT_REPORT.write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    print(OUTPUT_IMAGE)
    print(OUTPUT_REPORT)


if __name__ == "__main__":
    main()
