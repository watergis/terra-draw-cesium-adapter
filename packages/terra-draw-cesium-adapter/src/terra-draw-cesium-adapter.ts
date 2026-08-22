import { TerraDrawExtend } from 'terra-draw';
import type {
	TerraDrawChanges,
	TerraDrawStylingFunction,
	TerraDrawAdapterStyling,
	GeoJSONStoreFeatures,
	SetCursor,
	Project,
	Unproject,
	GetLngLatFromEvent,
	TerraDrawHandledEvents
} from 'terra-draw';
import type * as CesiumType from 'cesium';

/**
 * The Cesium classes, functions and enums the adapter needs at runtime.
 * They are injected (rather than imported) so that the adapter never imports
 * `cesium` at runtime and unit tests can substitute mocks. Passing the whole
 * `cesium` namespace (`import * as Cesium from "cesium"`) satisfies this type.
 */
export type InjectableCesium = {
	Cartesian2: typeof CesiumType.Cartesian2;
	Cartesian3: typeof CesiumType.Cartesian3;
	Cartographic: typeof CesiumType.Cartographic;
	Color: typeof CesiumType.Color;
	PolygonHierarchy: typeof CesiumType.PolygonHierarchy;
	PolylineDashMaterialProperty: typeof CesiumType.PolylineDashMaterialProperty;
	SceneTransforms: typeof CesiumType.SceneTransforms;
	Math: typeof CesiumType.Math;
	ScreenSpaceEventType: typeof CesiumType.ScreenSpaceEventType;
	HeightReference: typeof CesiumType.HeightReference;
	VerticalOrigin: typeof CesiumType.VerticalOrigin;
};

type FeatureId = TerraDrawExtend.FeatureId;

export class TerraDrawCesiumAdapter extends TerraDrawExtend.TerraDrawBaseAdapter {
	constructor(
		config: {
			map: CesiumType.Viewer;
			lib: InjectableCesium;
		} & TerraDrawExtend.BaseAdapterConfig
	) {
		super(config);

		this._viewer = config.map;
		this._lib = config.lib;

		// The base adapter attaches keyboard listeners to the map event element,
		// which must be focusable for them to fire. Cesium's ScreenSpaceEventHandler
		// calls preventDefault on pointer down whenever an input action is registered
		// (the camera controller always registers some), which suppresses the default
		// focus behaviour, so register() also focuses the canvas explicitly.
		this._viewer.canvas.setAttribute('tabindex', '0');

		// Cesium's default left double click behaviour tracks the picked entity,
		// which fights with double-click-to-finish drawing interactions.
		this._viewer.screenSpaceEventHandler?.removeInputAction(
			this._lib.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
		);
	}

	private _viewer: CesiumType.Viewer;
	private _lib: InjectableCesium;
	private _featureEntities: Map<FeatureId, CesiumType.Entity[]> = new Map();
	private _lastCursor: Parameters<SetCursor>[0] | null = null;

	/**
	 * Focuses the canvas so that Terra Draw's keydown and keyup listeners fire,
	 * which is what makes Escape to cancel a drawing, Delete to remove a selected
	 * feature and the undo/redo keyboard shortcuts work
	 */
	private _focusCanvasOnPointerDown = (): void => {
		const canvas = this._viewer.canvas as unknown as HTMLElement;
		if (document.activeElement === canvas) {
			return;
		}

		// Focusing programmatically makes the browser treat the canvas as keyboard
		// focused and draw a focus ring, which is misleading for what is really a
		// pointer interaction, so it is suppressed until the canvas is blurred and
		// a keyboard user can tab back into it
		const previousOutline = canvas.style.outline;
		canvas.style.outline = 'none';
		canvas.addEventListener(
			'blur',
			() => {
				canvas.style.outline = previousOutline;
			},
			{ once: true }
		);

		canvas.focus({ preventScroll: true });
	};

	/**
	 * Returns the HTML element that Terra Draw should attach its event listeners to
	 */
	public getMapEventElement(_eventType?: TerraDrawHandledEvents): HTMLElement {
		return this._viewer.canvas as unknown as HTMLElement;
	}

	/**
	 * Converts a longitude/latitude to a pixel coordinate in the canvas
	 */
	public project(...args: Parameters<Project>): ReturnType<Project> {
		const [lng, lat] = args;
		const cartesian = this._lib.Cartesian3.fromDegrees(lng, lat);
		const windowCoordinates = this._lib.SceneTransforms.worldToWindowCoordinates(
			this._viewer.scene,
			cartesian
		);
		if (!windowCoordinates) {
			throw new Error(`Cannot project coordinate ${lng},${lat} to screen space`);
		}
		return { x: windowCoordinates.x, y: windowCoordinates.y };
	}

	/**
	 * Converts a pixel coordinate in the canvas to a longitude/latitude
	 */
	public unproject(...args: Parameters<Unproject>): ReturnType<Unproject> {
		const [x, y] = args;
		const cartesian = this._viewer.scene.camera.pickEllipsoid(
			new this._lib.Cartesian2(x, y),
			this._viewer.scene.globe.ellipsoid
		);
		if (!cartesian) {
			throw new Error(`Cannot unproject screen coordinate ${x},${y} - it is not on the globe`);
		}
		const cartographic = this._lib.Cartographic.fromCartesian(cartesian);
		return {
			lng: this._lib.Math.toDegrees(cartographic.longitude),
			lat: this._lib.Math.toDegrees(cartographic.latitude)
		};
	}

	/**
	 * Gets the longitude/latitude under a pointer or mouse event, or null when the
	 * event does not intersect the globe
	 */
	public getLngLatFromEvent(
		...args: Parameters<GetLngLatFromEvent>
	): { lng: number; lat: number } | null {
		const [event] = args;
		const { left, top } = this._viewer.canvas.getBoundingClientRect();
		try {
			const { lng, lat } = this.unproject(event.clientX - left, event.clientY - top);
			return { lng, lat };
		} catch {
			return null;
		}
	}

	/**
	 * Sets the cursor shown over the map canvas
	 */
	public setCursor(...args: Parameters<SetCursor>): void {
		const [cursor] = args;
		if (cursor === this._lastCursor) {
			return;
		}
		if (cursor === 'unset') {
			this._viewer.canvas.style.removeProperty('cursor');
		} else {
			this._viewer.canvas.style.cursor = cursor;
		}
		this._lastCursor = cursor;
	}

	/**
	 * Enables or disables camera dragging, e.g. whilst dragging a feature
	 */
	public setDraggability(enabled: boolean): void {
		const controller = this._viewer.scene.screenSpaceCameraController;
		controller.enableRotate = enabled;
		controller.enableTranslate = enabled;
	}

	/**
	 * Cesium has no double click to zoom behaviour; its default left double click
	 * behaviour (tracking the picked entity) is permanently removed in the
	 * constructor, so disabling is a no-op and enabling cannot restore it.
	 */
	public setDoubleClickToZoom(enabled: boolean): void {
		if (!enabled) {
			this._viewer.screenSpaceEventHandler?.removeInputAction(
				this._lib.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
			);
		}
	}

	public override register(callbacks: TerraDrawExtend.TerraDrawCallbacks): void {
		super.register(callbacks);
		this._viewer.canvas.addEventListener('pointerdown', this._focusCanvasOnPointerDown);
		this._currentModeCallbacks?.onReady?.();
	}

	public override unregister(): void {
		this._viewer.canvas.removeEventListener('pointerdown', this._focusCanvasOnPointerDown);
		super.unregister();
	}

	/**
	 * Renders the created/updated/deleted features as Cesium entities
	 */
	public render(changes: TerraDrawChanges, styling: TerraDrawStylingFunction): void {
		for (const id of changes.deletedIds) {
			this.removeFeatureEntities(id);
		}

		for (const feature of changes.updated) {
			this.removeFeatureEntities(feature.id as FeatureId);
			this.addFeature(feature, styling);
		}

		for (const feature of changes.created) {
			this.addFeature(feature, styling);
		}

		this.requestRenderIfNeeded();
	}

	/**
	 * Clears the map of all rendered features whilst keeping the adapter registered
	 */
	public clear(): void {
		if (this._currentModeCallbacks) {
			// Clear up state of the modes themselves first
			this._currentModeCallbacks.onClear();

			for (const id of [...this._featureEntities.keys()]) {
				this.removeFeatureEntities(id);
			}
			this.requestRenderIfNeeded();
		}
	}

	private requestRenderIfNeeded(): void {
		if (this._viewer.scene.requestRenderMode) {
			this._viewer.scene.requestRender();
		}
	}

	private removeFeatureEntities(id: FeatureId): void {
		const entities = this._featureEntities.get(id);
		if (entities) {
			for (const entity of entities) {
				this._viewer.entities.remove(entity);
			}
			this._featureEntities.delete(id);
		}
	}

	private addFeature(feature: GeoJSONStoreFeatures, styling: TerraDrawStylingFunction): void {
		const mode = feature.properties.mode as string;
		const styleFn = styling[mode];
		if (!styleFn) {
			return;
		}
		const style = styleFn(feature);

		let entities: CesiumType.Entity[] = [];
		switch (feature.geometry.type) {
			case 'Point':
				entities = [this.createPointEntity(feature.geometry.coordinates as number[], style)];
				break;
			case 'LineString':
				entities = [
					this.createLineStringEntity(feature.geometry.coordinates as number[][], style, feature)
				];
				break;
			case 'Polygon':
				entities = this.createPolygonEntities(feature.geometry.coordinates as number[][][], style);
				break;
			default:
				return;
		}

		this._featureEntities.set(feature.id as FeatureId, entities);
	}

	private hexToColor(hex: string, opacity?: number): CesiumType.Color {
		const color = this._lib.Color.fromCssColorString(hex);
		return opacity === undefined ? color : color.withAlpha(opacity);
	}

	private createPointEntity(
		coordinates: number[],
		style: TerraDrawAdapterStyling
	): CesiumType.Entity {
		const [lng, lat] = coordinates as [number, number];
		const position = this._lib.Cartesian3.fromDegrees(lng, lat);

		if (style.markerUrl) {
			return this._viewer.entities.add({
				position,
				billboard: {
					image: style.markerUrl,
					width: style.markerWidth,
					height: style.markerHeight,
					verticalOrigin: this._lib.VerticalOrigin.BOTTOM,
					heightReference: this._lib.HeightReference.CLAMP_TO_GROUND,
					disableDepthTestDistance: Number.POSITIVE_INFINITY
				}
			});
		}

		return this._viewer.entities.add({
			position,
			point: {
				pixelSize: style.pointWidth * 2,
				color: this.hexToColor(style.pointColor, style.pointOpacity),
				outlineColor: this.hexToColor(style.pointOutlineColor, style.pointOutlineOpacity),
				outlineWidth: style.pointOutlineWidth,
				heightReference: this._lib.HeightReference.CLAMP_TO_GROUND,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			}
		});
	}

	private createLineStringEntity(
		coordinates: number[][],
		style: TerraDrawAdapterStyling,
		feature: GeoJSONStoreFeatures
	): CesiumType.Entity {
		const color = this.hexToColor(style.lineStringColor, style.lineStringOpacity);
		const dash =
			typeof style.lineStringDash === 'function'
				? style.lineStringDash(feature)
				: style.lineStringDash;
		return this._viewer.entities.add({
			polyline: {
				positions: this._lib.Cartesian3.fromDegreesArray(coordinates.flat()),
				width: style.lineStringWidth,
				material: dash
					? new this._lib.PolylineDashMaterialProperty({
							color,
							// Cesium's dashLength is the length of one dash and gap cycle,
							// which Terra Draw expresses as a [dash, gap] pixel tuple
							dashLength: dash[0] + dash[1]
						})
					: color,
				clampToGround: true,
				zIndex: style.zIndex
			}
		});
	}

	private createPolygonEntities(
		coordinates: number[][][],
		style: TerraDrawAdapterStyling
	): CesiumType.Entity[] {
		const [outerRing, ...holes] = coordinates;
		if (!outerRing) {
			return [];
		}

		const toPositions = (ring: number[][]) => this._lib.Cartesian3.fromDegreesArray(ring.flat());

		const entities: CesiumType.Entity[] = [
			this._viewer.entities.add({
				polygon: {
					hierarchy: new this._lib.PolygonHierarchy(
						toPositions(outerRing),
						holes.map((hole) => new this._lib.PolygonHierarchy(toPositions(hole)))
					),
					material: this.hexToColor(style.polygonFillColor, style.polygonFillOpacity),
					zIndex: style.zIndex
				}
			})
		];

		// Cesium does not support polygon outline widths greater than one pixel on
		// most platforms, so outlines are rendered as separate ground polylines
		const outlineColor = this.hexToColor(style.polygonOutlineColor, style.polygonOutlineOpacity);
		for (const ring of coordinates) {
			entities.push(
				this._viewer.entities.add({
					polyline: {
						positions: toPositions(ring),
						width: style.polygonOutlineWidth,
						material: outlineColor,
						clampToGround: true,
						zIndex: style.zIndex
					}
				})
			);
		}

		return entities;
	}
}
