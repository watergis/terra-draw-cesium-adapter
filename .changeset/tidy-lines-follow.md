---
'@watergis/terra-draw-cesium-adapter': patch
---

fix: render lines and polygons whilst they are being drawn or edited. Cesium builds ground geometry asynchronously, and the adapter recreated a feature's entities on every update, so the geometry never finished building whilst the pointer was moving. Features that are actively changing now keep their entities and are drawn from a callback, which Cesium builds synchronously.
