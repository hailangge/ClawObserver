# 2026-05-09 Agent Paste Tuning Pass

- Source layout updated: `clawobserver/static/reference-scene-layout.json`
- Primary visible sample: `tmp/true-agent-paste-sample-tuned-20260509.png`
- Secondary all-slots review sample: `tmp/static_scene_tuned_20260509-visible-20260509.png`

## Changed Groups
- `T5-T9`: moved down from the original `y=360` to final `y=396`
- `L0-L4`: shifted right as a group from the original slot `x` values `170/320/488/659/833` to `218/368/536/707/881`
- `W5-W9`: moved right and narrowed from the original `190/182/178/174/170` widths to `138`, with final `x` values `87/307/527/749/970`
- `W0-W4`: nudged right and slightly narrowed, with final `x` values `104/324/544/766/987`

## Verification
- `tmp/true-agent-paste-sample-tuned-20260509.png` exists and opens at `1200x896`
- `tmp/static_scene_tuned_20260509-visible-20260509.png` exists and opens at `1200x896`
- Background diff bbox for tuned true sample: `(25, 18, 1146, 892)`
- Background diff bbox for all-slots visible sample: `(61, 104, 1150, 840)`
- Slot diff counts from the true pasted sample report remained positive for every pasted slot

## Remaining Deviations
- `W5-W9` are improved but the far-right desks still read a little left/crowded because the monitor and divider perspective compresses the available chair space
- `T5-T9` are lower than before but could still come down a few more pixels if the target is more clearance above the character heads
- `L0-L4` are shifted right, but lounge visual centering is still approximate because the placeholders and cutout are not true seated couch poses
