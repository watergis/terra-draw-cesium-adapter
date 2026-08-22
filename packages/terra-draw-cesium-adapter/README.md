# @watergis/terra-draw-cesium-adapter

A [Terra Draw](https://github.com/JamesLMilner/terra-draw) adapter for [CesiumJS](https://github.com/CesiumGS/cesium), letting you draw points, lines, polygons, circles, rectangles and more on a Cesium globe.

## Install

```bash
npm install @watergis/terra-draw-cesium-adapter terra-draw cesium
```

This package is **ESM only**. It ships no CommonJS build, so a CJS codebase has to reach it through a dynamic `await import()`. A `<script>`-tag build is available separately — see [Using from a `<script>` tag](#using-from-a-script-tag).

`terra-draw` and `cesium` are peer dependencies. Cesium `1.121.0` or later is required, since that release renamed `SceneTransforms.wgs84ToWindowCoordinates` to `worldToWindowCoordinates`.

## Usage

The adapter never imports Cesium itself. Instead you pass the Cesium namespace in as `lib`, which keeps the bundle free of a hard Cesium dependency and makes the adapter straightforward to test.

```ts
import * as Cesium from 'cesium';
import { TerraDraw, TerraDrawPolygonMode, TerraDrawPointMode } from 'terra-draw';
import { TerraDrawCesiumAdapter } from '@watergis/terra-draw-cesium-adapter';

const viewer = new Cesium.Viewer('cesiumContainer');

const draw = new TerraDraw({
	adapter: new TerraDrawCesiumAdapter({
		map: viewer,
		lib: Cesium
	}),
	modes: [new TerraDrawPointMode(), new TerraDrawPolygonMode()]
});

draw.start();
draw.setMode('polygon');
```

### Using from a `<script>` tag

The package also ships a UMD bundle, so it can be loaded straight from a CDN alongside Cesium and Terra Draw. The adapter is exposed as `terraDrawCesiumAdapter`.

```html
<script src="https://unpkg.com/cesium/Build/Cesium/Cesium.js"></script>
<script src="https://unpkg.com/terra-draw"></script>
<script src="https://unpkg.com/@watergis/terra-draw-cesium-adapter"></script>
<script>
	const viewer = new Cesium.Viewer('cesiumContainer');

	const draw = new terraDraw.TerraDraw({
		adapter: new terraDrawCesiumAdapter.TerraDrawCesiumAdapter({
			map: viewer,
			lib: Cesium
		}),
		modes: [new terraDraw.TerraDrawPointMode(), new terraDraw.TerraDrawPolygonMode()]
	});

	draw.start();
	draw.setMode('polygon');
</script>
```

### Options

| Option                | Type               | Description                                                          |
| --------------------- | ------------------ | -------------------------------------------------------------------- |
| `map`                 | `Cesium.Viewer`    | The Cesium viewer to draw on. Required.                              |
| `lib`                 | `InjectableCesium` | The Cesium namespace (`import * as Cesium from 'cesium'`). Required. |
| `coordinatePrecision` | `number`           | Decimal places to round coordinates to. Defaults to `9`.             |

All other [`BaseAdapterConfig`](https://github.com/JamesLMilner/terra-draw) options from Terra Draw are supported as well.

## How geometry is rendered

Features are rendered as Cesium entities in `viewer.entities`:

- **Points** become `PointGraphics`, or `BillboardGraphics` when the mode supplies a `markerUrl`.
- **LineStrings** become ground-clamped polylines, using `PolylineDashMaterialProperty` when the style sets `lineStringDash`.
- **Polygons** become ground polygons for the fill, plus one ground polyline per ring for the outline. Cesium does not support polygon outline widths greater than one pixel on most platforms, so drawing the outline separately is what makes `polygonOutlineWidth` work.

Everything is clamped to the ground, which keeps drawn geometry draped over imagery and terrain and is also what makes Terra Draw's `zIndex` styling take effect — Cesium only honours `zIndex` on clamped geometry.

## Known differences from other adapters

- `setDoubleClickToZoom` is effectively a no-op. Cesium has no double-click-to-zoom behaviour; what it does have is a default left-double-click handler that tracks the picked entity, which conflicts with double-click-to-finish drawing. The adapter removes that handler when it is constructed and cannot restore it.
- Keyboard interactions (`Escape` to cancel a drawing, `Delete` to remove a selected feature, the undo/redo shortcuts) require the Cesium canvas to have focus. Cesium calls `preventDefault` on pointer down, which suppresses the browser's default focus behaviour, so the adapter focuses the canvas itself on pointer down. The map therefore has to be clicked once before keyboard shortcuts take effect.
- `setDraggability` toggles `enableRotate` and `enableTranslate` on the scene's `screenSpaceCameraController`. Zoom and tilt are left alone so the user can still navigate whilst dragging a vertex.

## License

MIT
