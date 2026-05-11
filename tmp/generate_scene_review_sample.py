#!/usr/bin/env python3

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "clawobserver" / "static"
ASSETS = STATIC / "assets"
LAYOUT_PATH = STATIC / "reference-scene-layout.json"
TMP_DIR = ROOT / "tmp"

BACKGROUND_PATH = ASSETS / "reference-scene-base.jpg"
OUTPUT_MIXED = TMP_DIR / "scene-review-sample-mixed.png"
OUTPUT_SWAP = TMP_DIR / "scene-review-sample-state-swap.png"
OUTPUT_REPORT = TMP_DIR / "scene-review-sample-report.md"


ASSET_MAP = {
    "main": ASSETS / "main.jpg",
    "se-codex": ASSETS / "se-codex.jpg",
    "media-manager": ASSETS / "media-manager.jpg",
    "server-manager": ASSETS / "server-manager.jpg",
}


MISSING_STYLES = {
    "agent-builder": {
        "body": "#f1aa3a",
        "accent": "#5d2d05",
        "outline": "#331500",
    },
    "se-kimi": {
        "body": "#7c8cff",
        "accent": "#18245f",
        "outline": "#0f1638",
    },
}


SCENARIOS = {
    "mixed": {
        "workstations": [
            {"slot": 0, "name": "main", "state": "working"},
            {"slot": 2, "name": "se-codex", "state": "working"},
            {"slot": 4, "name": "media-manager", "state": "working"},
        ],
        "lounge": [
            {"slot": 0, "name": "agent-builder", "state": "idle"},
            {"slot": 2, "name": "se-kimi", "state": "idle"},
            {"slot": 4, "name": "server-manager", "state": "idle"},
        ],
        "title": "Mixed review sample",
    },
    "swap": {
        "workstations": [
            {"slot": 0, "name": "main", "state": "idle"},
            {"slot": 2, "name": "se-codex", "state": "working"},
            {"slot": 4, "name": "media-manager", "state": "idle"},
        ],
        "lounge": [
            {"slot": 0, "name": "agent-builder", "state": "working"},
            {"slot": 2, "name": "se-kimi", "state": "idle"},
            {"slot": 4, "name": "server-manager", "state": "working"},
        ],
        "title": "State swap sample",
    },
}


def load_font(size: int) -> ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


LABEL_FONT = load_font(18)
SMALL_FONT = load_font(14)


def fit_text(draw: ImageDraw.ImageDraw, text: str, box_width: int, max_size: int, min_size: int = 10):
    for size in range(max_size, min_size - 1, -1):
        font = load_font(size)
        bbox = draw.textbbox((0, 0), text, font=font)
        if bbox[2] - bbox[0] <= box_width:
            return font
    return load_font(min_size)


def load_layout():
    with LAYOUT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def crop_pose_sheet(path: Path, state: str) -> Image.Image:
    sheet = Image.open(path).convert("RGB")
    width, height = sheet.size
    half = width // 2
    crop_box = (0, 0, half, height) if state == "working" else (half, 0, width, height)
    pose = sheet.crop(crop_box).convert("RGBA")

    bg = Image.new("RGB", pose.size, pose.getpixel((5, 5)))
    diff = ImageChops.difference(pose.convert("RGB"), bg)
    diff = diff.filter(ImageFilter.GaussianBlur(radius=1.5))
    mask = diff.convert("L").point(lambda px: 255 if px > 16 else 0)
    bbox = mask.getbbox()
    if bbox:
        pad = 16
        left = max(bbox[0] - pad, 0)
        top = max(bbox[1] - pad, 0)
        right = min(bbox[2] + pad, pose.width)
        bottom = min(bbox[3] + pad, pose.height)
        pose = pose.crop((left, top, right, bottom))
        mask = mask.crop((left, top, right, bottom))
    pose.putalpha(mask)
    return pose


def make_placeholder(name: str, slot_width: int, slot_height: int, state: str) -> Image.Image:
    colors = MISSING_STYLES[name]
    canvas = Image.new("RGBA", (slot_width, slot_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    shadow = Image.new("RGBA", (slot_width, slot_height), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse(
        (
            int(slot_width * 0.18),
            int(slot_height * 0.86),
            int(slot_width * 0.82),
            int(slot_height * 0.98),
        ),
        fill=(0, 0, 0, 110),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(8))
    canvas.alpha_composite(shadow)

    body_x0 = int(slot_width * 0.2)
    body_x1 = int(slot_width * 0.8)
    head_y0 = int(slot_height * 0.08)
    head_y1 = int(slot_height * 0.38)
    body_y0 = int(slot_height * 0.32)
    body_y1 = int(slot_height * 0.82 if state == "working" else slot_height * 0.88)

    draw.ellipse((body_x0, head_y0, body_x1, head_y1), fill=colors["body"], outline=colors["outline"], width=3)
    draw.rounded_rectangle(
        (int(slot_width * 0.26), body_y0, int(slot_width * 0.74), body_y1),
        radius=24,
        fill=colors["body"],
        outline=colors["outline"],
        width=3,
    )

    if state == "working":
        draw.line(
            (
                int(slot_width * 0.28),
                int(slot_height * 0.54),
                int(slot_width * 0.08),
                int(slot_height * 0.76),
            ),
            fill=colors["outline"],
            width=10,
        )
        draw.line(
            (
                int(slot_width * 0.72),
                int(slot_height * 0.54),
                int(slot_width * 0.92),
                int(slot_height * 0.76),
            ),
            fill=colors["outline"],
            width=10,
        )
        draw.rounded_rectangle(
            (
                int(slot_width * 0.08),
                int(slot_height * 0.72),
                int(slot_width * 0.92),
                int(slot_height * 0.82),
            ),
            radius=10,
            fill=(100, 215, 255, 210),
            outline=(180, 240, 255, 255),
            width=2,
        )
    else:
        draw.line(
            (
                int(slot_width * 0.35),
                int(slot_height * 0.70),
                int(slot_width * 0.22),
                int(slot_height * 0.88),
            ),
            fill=colors["outline"],
            width=10,
        )
        draw.line(
            (
                int(slot_width * 0.65),
                int(slot_height * 0.70),
                int(slot_width * 0.78),
                int(slot_height * 0.88),
            ),
            fill=colors["outline"],
            width=10,
        )
        draw.rounded_rectangle(
            (
                int(slot_width * 0.34),
                int(slot_height * 0.52),
                int(slot_width * 0.66),
                int(slot_height * 0.66),
            ),
            radius=18,
            fill=(255, 255, 255, 230),
            outline=(210, 210, 210, 255),
            width=2,
        )

    label_h = 26
    draw.rounded_rectangle(
        (8, slot_height - label_h - 6, slot_width - 8, slot_height - 6),
        radius=12,
        fill=(14, 20, 35, 235),
        outline=(255, 255, 255, 40),
        width=1,
    )
    placeholder_label = f"{name} placeholder"
    font = fit_text(draw, placeholder_label, slot_width - 24, 16)
    bbox = draw.textbbox((0, 0), placeholder_label, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    draw.text(
        ((slot_width - text_w) / 2, slot_height - label_h - 4 + (label_h - text_h) / 2 - 1),
        placeholder_label,
        font=font,
        fill=(244, 244, 244, 255),
    )
    accent = "WORK" if state == "working" else "IDLE"
    draw.text((12, 10), accent, font=SMALL_FONT, fill=colors["accent"])
    return canvas


def fit_sprite(sprite: Image.Image, width: int, height: int) -> Image.Image:
    ratio = min(width / sprite.width, height / sprite.height)
    new_size = (max(1, int(sprite.width * ratio)), max(1, int(sprite.height * ratio)))
    return sprite.resize(new_size, Image.LANCZOS)


def add_agent_label(base: Image.Image, name: str, state: str, slot_rect, placeholder: bool):
    draw = ImageDraw.Draw(base)
    x, y, width, height = slot_rect
    label = f"{name} {'placeholder' if placeholder else state}"
    font = fit_text(draw, label, width - 8, 15)
    bbox = draw.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    pill_w = text_w + 16
    pill_h = text_h + 8
    pill_x = x + max(4, (width - pill_w) // 2)
    pill_y = max(6, y - pill_h - 6)
    fill = (20, 34, 58, 222) if state == "working" else (55, 46, 26, 222)
    draw.rounded_rectangle((pill_x, pill_y, pill_x + pill_w, pill_y + pill_h), radius=10, fill=fill)
    draw.text((pill_x + 8, pill_y + 3), label, font=font, fill=(245, 245, 245))


def paste_centered(base: Image.Image, sprite: Image.Image, rect):
    x, y, width, height = rect
    scaled = fit_sprite(sprite, width, height)
    paste_x = x + (width - scaled.width) // 2
    paste_y = y + (height - scaled.height)

    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    alpha = scaled.getchannel("A").point(lambda px: int(px * 0.35))
    shadow_sprite = Image.new("RGBA", scaled.size, (0, 0, 0, 0))
    shadow_sprite.putalpha(alpha)
    shadow.alpha_composite(shadow_sprite, (paste_x + 6, paste_y + 8))
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    base.alpha_composite(shadow)
    base.alpha_composite(scaled, (paste_x, paste_y))


def resolve_sprite(name: str, state: str, slot_rect):
    path = ASSET_MAP.get(name)
    if path and path.exists():
        return crop_pose_sheet(path, state), False
    _, _, width, height = slot_rect
    return make_placeholder(name, width, height, state), True


def render_scenario(layout, scenario_key: str, out_path: Path):
    background = Image.open(BACKGROUND_PATH).convert("RGBA")
    scenario = SCENARIOS[scenario_key]

    for agent in scenario["workstations"]:
        rect = layout["workstations"][agent["slot"]]["character"]
        slot_rect = (rect["x"], rect["y"], rect["width"], rect["height"])
        sprite, placeholder = resolve_sprite(agent["name"], agent["state"], slot_rect)
        paste_centered(background, sprite, slot_rect)
        add_agent_label(background, agent["name"], agent["state"], slot_rect, placeholder)

    for agent in scenario["lounge"]:
        rect = layout["lounge"]["slots"][agent["slot"]]["character"]
        slot_rect = (rect["x"], rect["y"], rect["width"], rect["height"])
        sprite, placeholder = resolve_sprite(agent["name"], agent["state"], slot_rect)
        paste_centered(background, sprite, slot_rect)
        add_agent_label(background, agent["name"], agent["state"], slot_rect, placeholder)

    title_draw = ImageDraw.Draw(background)
    title = scenario["title"]
    bbox = title_draw.textbbox((0, 0), title, font=LABEL_FONT)
    title_w = bbox[2] - bbox[0]
    title_h = bbox[3] - bbox[1]
    title_draw.rounded_rectangle((18, 18, 18 + title_w + 20, 18 + title_h + 14), radius=14, fill=(8, 15, 28, 220))
    title_draw.text((28, 24), title, font=LABEL_FONT, fill=(240, 247, 255))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    background.save(out_path)


def write_report():
    report = f"""# Scene Review Sample Report

- Output artifacts:
  - `tmp/scene-review-sample-mixed.png`
  - `tmp/scene-review-sample-state-swap.png`
- Real background:
  - `clawobserver/static/assets/reference-scene-base.jpg`
- Real extracted agent pose sheets used:
  - `clawobserver/static/assets/main.jpg`
  - `clawobserver/static/assets/se-codex.jpg`
  - `clawobserver/static/assets/media-manager.jpg`
  - `clawobserver/static/assets/server-manager.jpg`
- Temporary placeholders:
  - `agent-builder` placeholder sprite generated in-script because no exact source image was found
  - `se-kimi` placeholder sprite generated in-script because no exact source image was found
- Scenario shown in `tmp/scene-review-sample-mixed.png`:
  - Working: `main`, `se-codex`, `media-manager`
  - Idle/lounge: `agent-builder` placeholder, `se-kimi` placeholder, `server-manager`
  - Some desks intentionally left empty
- Scenario shown in `tmp/scene-review-sample-state-swap.png`:
  - Quick state change check with `main` and `media-manager` moved to idle, `agent-builder` placeholder and `server-manager` shown as working
- Most obvious visual problems / next fixes:
  - Gray-background extractions are rough and can leave soft halos around the pasted figures
  - Lounge figures do not fully match the couch perspective and need custom seated cutouts or depth adjustments
  - Placeholder personas for `agent-builder` and `se-kimi` are only for placement review and should be replaced with real source art
  - Labels are intentionally blunt for review and should not be treated as final UI
"""
    OUTPUT_REPORT.write_text(report, encoding="utf-8")


def main():
    layout = load_layout()
    render_scenario(layout, "mixed", OUTPUT_MIXED)
    render_scenario(layout, "swap", OUTPUT_SWAP)
    write_report()
    print(OUTPUT_MIXED)
    print(OUTPUT_SWAP)
    print(OUTPUT_REPORT)


if __name__ == "__main__":
    main()
