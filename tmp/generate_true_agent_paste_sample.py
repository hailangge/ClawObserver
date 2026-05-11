#!/usr/bin/env python3

import json
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "clawobserver" / "static"
ASSETS = STATIC / "assets"
LAYOUT_PATH = STATIC / "reference-scene-layout.json"
TMP = ROOT / "tmp"

BACKGROUND_PATH = ASSETS / "reference-scene-base.jpg"
OUTPUT_PATH = TMP / "true-agent-paste-sample.png"
REPORT_PATH = TMP / "true-agent-paste-sample-report.md"


WORKING_AGENTS = [
    ("main", 0),
    ("se-codex", 2),
    ("media-manager", 4),
    ("agent-keeper", 7),
]

IDLE_AGENTS = [
    ("agent-builder", 0),
    ("se-kimi", 2),
    ("server-manager", 4),
]


ASSET_MAP = {
    "main": ASSETS / "main.jpg",
    "se-codex": ASSETS / "se-codex.jpg",
    "media-manager": ASSETS / "media-manager.jpg",
    "agent-keeper": ASSETS / "agent-keeper.jpg",
    "server-manager": ASSETS / "server-manager.jpg",
}


PLACEHOLDER_STYLES = {
    "agent-builder": {
        "body": (234, 155, 60, 255),
        "accent": (99, 46, 8, 255),
        "outline": (51, 22, 0, 255),
    },
    "se-kimi": {
        "body": (114, 146, 255, 255),
        "accent": (20, 33, 97, 255),
        "outline": (10, 17, 53, 255),
    },
}


@dataclass
class Placement:
    name: str
    state: str
    rect: tuple[int, int, int, int]
    sprite_kind: str
    pixel_diff_count: int = 0


def load_font(size: int):
    for candidate in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    ):
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


TITLE_FONT = load_font(24)
LABEL_FONT = load_font(16)
SMALL_FONT = load_font(13)


def fit_font(draw: ImageDraw.ImageDraw, text: str, box_width: int, max_size: int, min_size: int = 10):
    for size in range(max_size, min_size - 1, -1):
        font = load_font(size)
        bbox = draw.textbbox((0, 0), text, font=font)
        if bbox[2] - bbox[0] <= box_width:
            return font
    return load_font(min_size)


def load_layout():
    return json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))


def crop_pose_sheet(path: Path, state: str) -> Image.Image:
    source = Image.open(path).convert("RGB")
    width, height = source.size
    half = width // 2
    crop_box = (0, 0, half, height) if state == "working" else (half, 0, width, height)
    pose = source.crop(crop_box).convert("RGBA")

    corners = [
        pose.getpixel((4, 4)),
        pose.getpixel((pose.width - 5, 4)),
        pose.getpixel((4, pose.height - 5)),
        pose.getpixel((pose.width - 5, pose.height - 5)),
    ]
    avg_bg = tuple(sum(channel) // len(corners) for channel in zip(*corners))
    bg = Image.new("RGB", pose.size, avg_bg)
    diff = ImageChops.difference(pose.convert("RGB"), bg).convert("L")
    diff = diff.filter(ImageFilter.GaussianBlur(1.2))
    mask = diff.point(lambda px: 255 if px > 18 else 0)
    bbox = mask.getbbox()
    if bbox is None:
        mask = Image.new("L", pose.size, 255)
        bbox = (0, 0, pose.width, pose.height)

    pad = 18
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(pose.width, bbox[2] + pad)
    bottom = min(pose.height, bbox[3] + pad)
    pose = pose.crop((left, top, right, bottom))
    mask = mask.crop((left, top, right, bottom)).filter(ImageFilter.GaussianBlur(0.8))
    pose.putalpha(mask)
    return pose


def make_placeholder(name: str, width: int, height: int, state: str) -> Image.Image:
    colors = PLACEHOLDER_STYLES[name]
    sprite = Image.new("RGBA", (width, height), (0, 0, 0, 0))

    shadow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.ellipse(
        (int(width * 0.16), int(height * 0.88), int(width * 0.84), int(height * 0.98)),
        fill=(0, 0, 0, 100),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(8))
    sprite.alpha_composite(shadow)

    draw = ImageDraw.Draw(sprite)
    body = colors["body"]
    outline = colors["outline"]
    accent = colors["accent"]

    head = (int(width * 0.28), int(height * 0.08), int(width * 0.72), int(height * 0.32))
    torso = (int(width * 0.26), int(height * 0.28), int(width * 0.74), int(height * 0.74))
    draw.ellipse(head, fill=body, outline=outline, width=3)
    draw.rounded_rectangle(torso, radius=28, fill=body, outline=outline, width=3)

    draw.ellipse((int(width * 0.42), int(height * 0.16), int(width * 0.48), int(height * 0.19)), fill=outline)
    draw.ellipse((int(width * 0.52), int(height * 0.16), int(width * 0.58), int(height * 0.19)), fill=outline)
    draw.arc((int(width * 0.42), int(height * 0.20), int(width * 0.58), int(height * 0.26)), 5, 175, fill=accent, width=3)

    if state == "working":
        draw.line(
            (int(width * 0.30), int(height * 0.46), int(width * 0.08), int(height * 0.72)),
            fill=outline,
            width=10,
        )
        draw.line(
            (int(width * 0.70), int(height * 0.46), int(width * 0.92), int(height * 0.72)),
            fill=outline,
            width=10,
        )
        draw.line(
            (int(width * 0.40), int(height * 0.74), int(width * 0.30), int(height * 0.90)),
            fill=outline,
            width=11,
        )
        draw.line(
            (int(width * 0.60), int(height * 0.74), int(width * 0.70), int(height * 0.90)),
            fill=outline,
            width=11,
        )
        draw.rounded_rectangle(
            (int(width * 0.10), int(height * 0.66), int(width * 0.90), int(height * 0.79)),
            radius=12,
            fill=(90, 215, 255, 220),
            outline=(210, 246, 255, 255),
            width=2,
        )
    else:
        draw.line(
            (int(width * 0.33), int(height * 0.48), int(width * 0.18), int(height * 0.70)),
            fill=outline,
            width=10,
        )
        draw.line(
            (int(width * 0.67), int(height * 0.48), int(width * 0.82), int(height * 0.70)),
            fill=outline,
            width=10,
        )
        draw.line(
            (int(width * 0.44), int(height * 0.74), int(width * 0.28), int(height * 0.92)),
            fill=outline,
            width=11,
        )
        draw.line(
            (int(width * 0.56), int(height * 0.74), int(width * 0.72), int(height * 0.92)),
            fill=outline,
            width=11,
        )
        draw.rounded_rectangle(
            (int(width * 0.34), int(height * 0.52), int(width * 0.66), int(height * 0.63)),
            radius=14,
            fill=(255, 255, 255, 230),
            outline=(210, 210, 210, 255),
            width=2,
        )

    label = f"{name} temp"
    font = fit_font(draw, label, width - 18, 16)
    bbox = draw.textbbox((0, 0), label, font=font)
    tag_h = 26
    draw.rounded_rectangle(
        (8, height - tag_h - 6, width - 8, height - 6),
        radius=12,
        fill=(14, 20, 35, 225),
        outline=(255, 255, 255, 40),
        width=1,
    )
    draw.text(
        ((width - (bbox[2] - bbox[0])) / 2, height - tag_h - 3),
        label,
        font=font,
        fill=(244, 244, 244, 255),
    )
    draw.text((10, 10), state.upper(), font=SMALL_FONT, fill=accent)
    return sprite


def fit_sprite(sprite: Image.Image, width: int, height: int) -> Image.Image:
    ratio = min(width / sprite.width, height / sprite.height)
    new_size = (max(1, int(sprite.width * ratio)), max(1, int(sprite.height * ratio)))
    return sprite.resize(new_size, Image.LANCZOS)


def paste_centered(base: Image.Image, sprite: Image.Image, rect: tuple[int, int, int, int]):
    x, y, width, height = rect
    scaled = fit_sprite(sprite, width, height)
    paste_x = x + (width - scaled.width) // 2
    paste_y = y + (height - scaled.height)

    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    alpha = scaled.getchannel("A").point(lambda px: int(px * 0.32))
    shadow_sprite = Image.new("RGBA", scaled.size, (0, 0, 0, 0))
    shadow_sprite.putalpha(alpha)
    shadow.alpha_composite(shadow_sprite, (paste_x + 6, paste_y + 8))
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    base.alpha_composite(shadow)
    base.alpha_composite(scaled, (paste_x, paste_y))


def add_label(base: Image.Image, name: str, state: str, rect: tuple[int, int, int, int], sprite_kind: str):
    x, y, width, _ = rect
    draw = ImageDraw.Draw(base)
    label = f"{name} {state}"
    if sprite_kind != "real-cutout":
        label = f"{name} temp"
    font = fit_font(draw, label, width - 10, 15)
    bbox = draw.textbbox((0, 0), label, font=font)
    pill_w = (bbox[2] - bbox[0]) + 16
    pill_h = (bbox[3] - bbox[1]) + 8
    px = x + max(4, (width - pill_w) // 2)
    py = max(8, y - pill_h - 6)
    fill = (23, 52, 86, 226) if state == "working" else (80, 61, 26, 226)
    draw.rounded_rectangle((px, py, px + pill_w, py + pill_h), radius=10, fill=fill)
    draw.text((px + 8, py + 3), label, font=font, fill=(245, 245, 245))


def resolve_sprite(name: str, state: str, rect: tuple[int, int, int, int]):
    asset = ASSET_MAP.get(name)
    if asset and asset.exists():
        return crop_pose_sheet(asset, state), "real-cutout"
    _, _, width, height = rect
    return make_placeholder(name, width, height, state), "generated-placeholder"


def verify_slot_diff(background_rgb: Image.Image, composite_rgb: Image.Image, rect: tuple[int, int, int, int]) -> int:
    x, y, width, height = rect
    bg = background_rgb.crop((x, y, x + width, y + height))
    fg = composite_rgb.crop((x, y, x + width, y + height))
    diff = ImageChops.difference(bg, fg).convert("L")
    histogram = diff.histogram()
    return sum(histogram[25:])


def render():
    layout = load_layout()
    background = Image.open(BACKGROUND_PATH).convert("RGBA")
    reference = Image.open(BACKGROUND_PATH).convert("RGB")
    placements: list[Placement] = []

    for name, slot in WORKING_AGENTS:
        rect_cfg = layout["workstations"][slot]["character"]
        rect = (rect_cfg["x"], rect_cfg["y"], rect_cfg["width"], rect_cfg["height"])
        sprite, sprite_kind = resolve_sprite(name, "working", rect)
        paste_centered(background, sprite, rect)
        add_label(background, name, "working", rect, sprite_kind)
        placements.append(Placement(name=name, state="working", rect=rect, sprite_kind=sprite_kind))

    for name, slot in IDLE_AGENTS:
        rect_cfg = layout["lounge"]["slots"][slot]["character"]
        rect = (rect_cfg["x"], rect_cfg["y"], rect_cfg["width"], rect_cfg["height"])
        sprite, sprite_kind = resolve_sprite(name, "idle", rect)
        paste_centered(background, sprite, rect)
        add_label(background, name, "idle", rect, sprite_kind)
        placements.append(Placement(name=name, state="idle", rect=rect, sprite_kind=sprite_kind))

    draw = ImageDraw.Draw(background)
    title = "True Agent Paste Sample"
    subtitle = "working desks + idle lounge, with empty desks left open"
    tb = draw.textbbox((0, 0), title, font=TITLE_FONT)
    sb = draw.textbbox((0, 0), subtitle, font=SMALL_FONT)
    box_w = max(tb[2] - tb[0], sb[2] - sb[0]) + 24
    box_h = (tb[3] - tb[1]) + (sb[3] - sb[1]) + 20
    draw.rounded_rectangle((18, 18, 18 + box_w, 18 + box_h), radius=16, fill=(7, 14, 26, 220))
    draw.text((30, 26), title, font=TITLE_FONT, fill=(240, 247, 255))
    draw.text((30, 56), subtitle, font=SMALL_FONT, fill=(198, 214, 228))

    TMP.mkdir(parents=True, exist_ok=True)
    background.save(OUTPUT_PATH)

    composite_rgb = background.convert("RGB")
    for placement in placements:
        placement.pixel_diff_count = verify_slot_diff(reference, composite_rgb, placement.rect)

    return placements


def write_report(placements: list[Placement]):
    real = [p for p in placements if p.sprite_kind == "real-cutout"]
    generated = [p for p in placements if p.sprite_kind == "generated-placeholder"]
    verification_lines = [
        f"- `{p.name}` `{p.state}` slot diff pixels: {p.pixel_diff_count}"
        for p in placements
    ]

    report = "\n".join(
        [
            "# True Agent Paste Sample Report",
            "",
            f"- Final sample image path: `{OUTPUT_PATH.relative_to(ROOT)}`",
            "- Background used: `clawobserver/static/assets/reference-scene-base.jpg`",
            "- Real pasted cutout sprites:",
            *[f"  - `{p.name}` (`{p.state}`)" for p in real],
            "- Generated placeholder sprites actually pasted:",
            *[f"  - `{p.name}` (`{p.state}`)" for p in generated],
            "- Placeholders/coarse cutouts:",
            "  - `agent-builder`: generated cartoon silhouette placeholder",
            "  - `se-kimi`: generated cartoon silhouette placeholder",
            "  - existing pose-sheet cutouts can still show haloing or weak edge extraction",
            "- Current visual problems:",
            "  - desk characters are readable but not perspective-matched to every workstation angle",
            "  - lounge idle figures are standing-style placeholders rather than true seated couch cutouts",
            "  - some real cutouts may retain soft edge halos from background removal",
            "  - review labels are intentionally blunt and are not final UI",
            "- Verification summary:",
            *verification_lines,
        ]
    )
    REPORT_PATH.write_text(report + "\n", encoding="utf-8")


def main():
    placements = render()
    write_report(placements)
    if not OUTPUT_PATH.exists():
        raise SystemExit("Output image was not created")
    if not REPORT_PATH.exists():
        raise SystemExit("Report was not created")
    unreadable = Image.open(OUTPUT_PATH).size
    if unreadable != (1200, 896):
        raise SystemExit(f"Unexpected output size: {unreadable}")
    failed = [p for p in placements if p.pixel_diff_count <= 1500]
    if failed:
        names = ", ".join(f"{p.name}:{p.pixel_diff_count}" for p in failed)
        raise SystemExit(f"Verification failed for slots: {names}")
    print(OUTPUT_PATH)
    print(REPORT_PATH)
    for p in placements:
        print(f"{p.name} {p.state} {p.sprite_kind} diff={p.pixel_diff_count}")


if __name__ == "__main__":
    main()
