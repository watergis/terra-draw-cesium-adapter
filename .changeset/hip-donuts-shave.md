---
'@watergis/terra-draw-cesium-adapter': patch
---

fix: draw at the clicked position when the camera is tilted over terrain.

Screen coordinates were turned into longitude/latitude by intersecting the WGS84 ellipsoid, whilst geometry is rendered clamped to the terrain, so over ground of height h a camera tilted by an angle t placed coordinates roughly h / tan(t) too far away - unnoticeable looking straight down, over a kilometre out on a mountainside at 45 degrees. `unproject` now picks the terrain surface, falling back to the ellipsoid only where there is no terrain to hit, and `project` projects from the terrain height so that Terra Draw's pixel based drag, snapping and selection distances stay consistent with what is drawn.
