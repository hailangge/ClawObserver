# Tuned Static Scene Sample

- Compared `/mnt/data/repositories/ClawObserver/clawobserver/static/assets/static_scene.jpg` directly against `/mnt/data/repositories/ClawObserver/clawobserver/static/assets/reference-scene-base.jpg` before rebuild.
- Source and reference image size: `(1200, 896)` / `(1200, 896)`.
- Difference bounding box from comparison: `(8, 14, 1200, 896)`.
- Output image: `/mnt/data/repositories/ClawObserver/tmp/static_scene_tuned_20260509.png`.

## Applied Adjustments
- top tag 1: x 75 -> 92, y 118 -> 106; sprite y 182 -> 193, scale 0.90
- top tag 2: x 295 -> 312, y 118 -> 106; sprite y 184 -> 195, scale 0.90
- top tag 3: x 515 -> 532, y 116 -> 104; sprite y 182 -> 193, scale 0.90
- top tag 4: x 735 -> 752, y 116 -> 104; sprite y 182 -> 193, scale 0.90
- top tag 5: x 955 -> 972, y 118 -> 106; sprite y 184 -> 195, scale 0.90
- middle tag 1: x 48 -> 61, y 396 -> 416; sprite y 438 -> 449, scale 0.90
- middle tag 2: x 284 -> 297, y 396 -> 416; sprite y 438 -> 449, scale 0.90
- middle tag 3: x 521 -> 534, y 396 -> 416; sprite y 438 -> 449, scale 0.90
- middle tag 4: x 758 -> 771, y 396 -> 416; sprite y 438 -> 449, scale 0.90
- middle tag 5: x 994 -> 1007, y 396 -> 416; sprite y 438 -> 449, scale 0.90
- lounge sprite: rect (228, 606, 158, 236), scale 0.85; lounge tag moved to (342, 617, 120, 34)

## Remaining Obvious Issues
- Sprite extraction still relies on soft gray-background cutouts, so some edge haloing may remain on close inspection.
- Character art styles are mixed because this pass prioritizes placement correction over full asset harmonization.
