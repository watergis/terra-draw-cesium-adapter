# @watergis/terra-draw-cesium-adapter

## 0.1.1

### Patch Changes

- 1f8451d: chore: upgraded cesium to v1.146.0 in devDependencies. The adapter is now built and tested against Cesium 1.146.0.
  
  Please read the [Cesium changelog](https://github.com/CesiumGS/cesium/blob/main/CHANGES.md) before upgrading Cesium in your application. Between 1.144.0 and 1.146.0:
  
  - **1.145 (breaking)**: the positions of a `ClippingPolygon` in a `ClippingPolygonCollection` are now immutable and throw if changed. Remove the polygon and add a new one instead.
  - **1.146**: the math, geometry, time and utility classes moved from `@cesium/engine` to the new `@cesium/core` package. Importing them from `@cesium/engine` is deprecated and will be removed in Cesium 1.150. Code that imports from `cesium` does not need to change.
  
  The adapter itself needs no code changes and the `cesium` peer dependency range is unchanged. If you build the `lib` passed to the adapter from `@cesium/engine` rather than `cesium`, import `Cartesian2`, `Cartesian3`, `Cartographic`, `Color`, `PolygonHierarchy` and `Math` from `@cesium/core` instead.

## 0.1.0

### Minor Changes

- ca04b82: feat: support the `markerAnchor` style property.

### Patch Changes

- a2b4d33: chore: upgraded terra-draw to v1.37.0 in devDependencies.

## 0.0.2

### Patch Changes

- 67dbd88: fix: draw at the clicked position when the camera is tilted over terrain.
  
  Screen coordinates were turned into longitude/latitude by intersecting the WGS84 ellipsoid, whilst geometry is rendered clamped to the terrain, so over ground of height h a camera tilted by an angle t placed coordinates roughly h / tan(t) too far away - unnoticeable looking straight down, over a kilometre out on a mountainside at 45 degrees. `unproject` now picks the terrain surface, falling back to the ellipsoid only where there is no terrain to hit, and `project` projects from the terrain height so that Terra Draw's pixel based drag, snapping and selection distances stay consistent with what is drawn.

## 0.0.1

### Patch Changes

- fd7913f: chore: updated License file
- 66ed633: fix: render lines and polygons whilst they are being drawn or edited. Cesium builds ground geometry asynchronously, and the adapter recreated a feature's entities on every update, so the geometry never finished building whilst the pointer was moving. Features that are actively changing now keep their entities and are drawn from a callback, which Cesium builds synchronously.
