# @watergis/terra-draw-cesium-adapter

## 0.0.2

### Patch Changes

- 67dbd88: fix: draw at the clicked position when the camera is tilted over terrain.
  
  Screen coordinates were turned into longitude/latitude by intersecting the WGS84 ellipsoid, whilst geometry is rendered clamped to the terrain, so over ground of height h a camera tilted by an angle t placed coordinates roughly h / tan(t) too far away - unnoticeable looking straight down, over a kilometre out on a mountainside at 45 degrees. `unproject` now picks the terrain surface, falling back to the ellipsoid only where there is no terrain to hit, and `project` projects from the terrain height so that Terra Draw's pixel based drag, snapping and selection distances stay consistent with what is drawn.

## 0.0.1

### Patch Changes

- fd7913f: chore: updated License file
- 66ed633: fix: render lines and polygons whilst they are being drawn or edited. Cesium builds ground geometry asynchronously, and the adapter recreated a feature's entities on every update, so the geometry never finished building whilst the pointer was moving. Features that are actively changing now keep their entities and are drawn from a callback, which Cesium builds synchronously.
