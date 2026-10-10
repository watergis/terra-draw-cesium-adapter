---
'@watergis/terra-draw-cesium-adapter': patch
---

chore: upgraded cesium to v1.146.0 in devDependencies. The adapter is now built and tested against Cesium 1.146.0.

Please read the [Cesium changelog](https://github.com/CesiumGS/cesium/blob/main/CHANGES.md) before upgrading Cesium in your application. Between 1.144.0 and 1.146.0:

- **1.145 (breaking)**: the positions of a `ClippingPolygon` in a `ClippingPolygonCollection` are now immutable and throw if changed. Remove the polygon and add a new one instead.
- **1.146**: the math, geometry, time and utility classes moved from `@cesium/engine` to the new `@cesium/core` package. Importing them from `@cesium/engine` is deprecated and will be removed in Cesium 1.150. Code that imports from `cesium` does not need to change.

The adapter itself needs no code changes and the `cesium` peer dependency range is unchanged. If you build the `lib` passed to the adapter from `@cesium/engine` rather than `cesium`, import `Cartesian2`, `Cartesian3`, `Cartographic`, `Color`, `PolygonHierarchy` and `Math` from `@cesium/core` instead.
