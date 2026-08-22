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
	CallbackProperty: typeof CesiumType.CallbackProperty;
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

/**
 * The Cesium entities rendered for a single Terra Draw feature, along with the
 * geometry that backs them.
 *
 * `rings` holds the current Cartesian positions - a single entry for Point and
 * LineString features, and one entry per ring for Polygon features. The entities
 * of a Polygon are laid out as `[fill, ...outlinePerRing]`, so `entities[i + 1]`
 * is the outline of `rings[i]`.
 *
 * Whilst a feature is being drawn its geometry is exposed to Cesium through
 * `CallbackProperty` instances that read `rings`, which is what `dynamic` tracks.
 */
type FeatureRender = {
	entities: CesiumType.Entity[];
	geometryType: 'Point' | 'LineString' | 'Polygon';
	rings: CesiumType.Cartesian3[][];
	feature: GeoJSONStoreFeatures;
	style: TerraDrawAdapterStyling;
	usesBillboard: boolean;
	dynamic: boolean;
};

/**
 * Cesium's graphics setters accept a raw value and wrap it in a ConstantProperty,
 * but the type definitions only describe the Property that is read back out
 */
const asProperty = (value: unknown) => value as never;

/**
 * How long a feature must go without an update before its geometry is put back
 * onto Cesium's static path.
 *
 * Terra Draw calls the adapter once per store event, and a single interaction
 * spreads its changes over several of them - dragging a coordinate updates the
 * point and the geometry it belongs to separately, and a styling change is
 * delivered as an empty changeset. A feature is therefore only treated as
 * finished once it has been quiet for a moment, rather than because it was
 * missing from one call.
 */
const DEMOTE_DELAY_MS = 300;

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
	private _featureRenders: Map<FeatureId, FeatureRender> = new Map();
	private _demoteTimers: Map<FeatureId, ReturnType<typeof setTimeout>> = new Map();
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
		this.clearDemoteTimers();
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
			this.updateFeature(feature, styling);
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

			this.clearDemoteTimers();
			for (const id of [...this._featureRenders.keys()]) {
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
		const state = this._featureRenders.get(id);
		if (state) {
			for (const entity of state.entities) {
				this._viewer.entities.remove(entity);
			}
			this._featureRenders.delete(id);
			this.cancelDemote(id);
		}
	}

	private getStyle(
		feature: GeoJSONStoreFeatures,
		styling: TerraDrawStylingFunction
	): TerraDrawAdapterStyling | null {
		const mode = feature.properties.mode as string;
		const styleFn = styling[mode];
		return styleFn ? styleFn(feature) : null;
	}

	private addFeature(feature: GeoJSONStoreFeatures, styling: TerraDrawStylingFunction): void {
		const style = this.getStyle(feature, styling);
		if (!style) {
			return;
		}

		const geometryType = feature.geometry.type;
		if (geometryType !== 'Point' && geometryType !== 'LineString' && geometryType !== 'Polygon') {
			return;
		}

		const rings = this.featureRings(feature);
		const entities = this.createEntities(geometryType, rings, style, feature);
		if (entities.length === 0) {
			return;
		}

		this._featureRenders.set(feature.id as FeatureId, {
			entities,
			geometryType,
			rings,
			feature,
			style,
			usesBillboard: geometryType === 'Point' && Boolean(style.markerUrl),
			dynamic: false
		});
	}

	private createEntities(
		geometryType: FeatureRender['geometryType'],
		rings: CesiumType.Cartesian3[][],
		style: TerraDrawAdapterStyling,
		feature: GeoJSONStoreFeatures
	): CesiumType.Entity[] {
		const firstRing = rings[0];
		if (!firstRing) {
			return [];
		}

		switch (geometryType) {
			case 'Point': {
				const position = firstRing[0];
				return position ? [this.createPointEntity(position, style)] : [];
			}
			case 'LineString':
				return [this.createLineStringEntity(firstRing, style, feature)];
			default:
				return this.createPolygonEntities(rings, style);
		}
	}

	/**
	 * Applies an updated feature to the entities that are already on the map.
	 *
	 * Terra Draw emits an update for the feature being drawn on every pointer move.
	 * Recreating the entities each time means Cesium never finishes building their
	 * ground geometry - which is created asynchronously - so nothing is drawn until
	 * the geometry is closed. Instead the entities are kept and their geometry is
	 * driven by a callback, which puts them on Cesium's dynamic path where ground
	 * primitives are built synchronously and therefore appear immediately.
	 */
	private updateFeature(feature: GeoJSONStoreFeatures, styling: TerraDrawStylingFunction): void {
		const id = feature.id as FeatureId;
		const state = this._featureRenders.get(id);
		const style = this.getStyle(feature, styling);

		if (!state || !style || !this.canUpdateInPlace(state, feature, style)) {
			this.removeFeatureEntities(id);
			this.addFeature(feature, styling);
			this.promote(id);
			this.scheduleDemote(id);
			return;
		}

		state.rings = this.featureRings(feature);
		state.feature = feature;
		state.style = style;
		this.promote(id);
		this.scheduleDemote(id);
		if (!state.dynamic) {
			// Points are never promoted, so their geometry is written directly
			this.writePointPosition(state);
		}
		this.applyStyle(state, feature, style);
	}

	/**
	 * Whether the existing entities still match the shape of the updated feature.
	 * A change of geometry type, of ring count, or of the kind of marker used for a
	 * point needs a different set of entities, so those fall back to recreation.
	 */
	private canUpdateInPlace(
		state: FeatureRender,
		feature: GeoJSONStoreFeatures,
		style: TerraDrawAdapterStyling
	): boolean {
		if (state.geometryType !== feature.geometry.type) {
			return false;
		}
		if (state.geometryType === 'Point') {
			return state.usesBillboard === Boolean(style.markerUrl);
		}
		if (state.geometryType === 'Polygon') {
			return (feature.geometry.coordinates as number[][][]).length === state.rings.length;
		}
		return true;
	}

	private featureRings(feature: GeoJSONStoreFeatures): CesiumType.Cartesian3[][] {
		switch (feature.geometry.type) {
			case 'Point': {
				const [lng, lat] = feature.geometry.coordinates as [number, number];
				return [[this._lib.Cartesian3.fromDegrees(lng, lat)]];
			}
			case 'LineString':
				return [this.toPositions(feature.geometry.coordinates as number[][])];
			case 'Polygon':
				return (feature.geometry.coordinates as number[][][]).map((ring) => this.toPositions(ring));
			default:
				return [];
		}
	}

	private toPositions(ring: number[][]): CesiumType.Cartesian3[] {
		return this._lib.Cartesian3.fromDegreesArray(ring.flat());
	}

	private buildHierarchy(rings: CesiumType.Cartesian3[][]): CesiumType.PolygonHierarchy {
		const [outerRing, ...holes] = rings;
		return new this._lib.PolygonHierarchy(
			outerRing,
			holes.map((hole) => new this._lib.PolygonHierarchy(hole))
		);
	}

	/**
	 * Swaps a feature's geometry over to callbacks that read its current positions,
	 * so that Cesium rebuilds it synchronously whilst it is being drawn
	 */
	private promote(id: FeatureId): void {
		const state = this._featureRenders.get(id);
		// Points render through Cesium's synchronous point and billboard collections,
		// so they are already visible whilst drawing and gain nothing from this
		if (!state || state.dynamic || state.geometryType === 'Point') {
			return;
		}

		if (state.geometryType === 'LineString') {
			const polyline = state.entities[0]?.polyline;
			if (polyline) {
				polyline.positions = new this._lib.CallbackProperty(() => state.rings[0], false);
			}
		} else {
			const [fill, ...outlines] = state.entities;
			if (fill?.polygon) {
				fill.polygon.hierarchy = new this._lib.CallbackProperty(
					() => this.buildHierarchy(state.rings),
					false
				);
			}
			outlines.forEach((entity, index) => {
				if (entity.polyline) {
					entity.polyline.positions = new this._lib.CallbackProperty(
						() => state.rings[index],
						false
					);
				}
			});
		}

		state.dynamic = true;
	}

	/**
	 * Restarts the idle countdown after which a feature stops being drawn
	 * dynamically. Called on every update, so an interaction that keeps changing
	 * the feature keeps it dynamic.
	 */
	private scheduleDemote(id: FeatureId): void {
		this.cancelDemote(id);
		this._demoteTimers.set(
			id,
			setTimeout(() => {
				this._demoteTimers.delete(id);
				this.demote(id);
				// No render call follows this, so a viewer in request render mode
				// would otherwise never draw the recreated entities
				this.requestRenderIfNeeded();
			}, DEMOTE_DELAY_MS)
		);
	}

	private cancelDemote(id: FeatureId): void {
		const timer = this._demoteTimers.get(id);
		if (timer !== undefined) {
			clearTimeout(timer);
			this._demoteTimers.delete(id);
		}
	}

	private clearDemoteTimers(): void {
		for (const id of [...this._demoteTimers.keys()]) {
			this.cancelDemote(id);
		}
	}

	/**
	 * Puts a feature that has stopped changing back onto Cesium's static path.
	 *
	 * The entities are recreated rather than having their callbacks swapped out
	 * for constant values, because Cesium does not reliably rebuild a ground
	 * primitive when an entity moves from its dynamic batch to a static one.
	 */
	private demote(id: FeatureId): void {
		const state = this._featureRenders.get(id);
		if (!state || !state.dynamic) {
			return;
		}

		for (const entity of state.entities) {
			this._viewer.entities.remove(entity);
		}
		state.entities = this.createEntities(
			state.geometryType,
			state.rings,
			state.style,
			state.feature
		);
		state.dynamic = false;
	}

	private writePointPosition(state: FeatureRender): void {
		const entity = state.entities[0];
		if (state.geometryType === 'Point' && entity) {
			entity.position = asProperty(state.rings[0]?.[0]);
		}
	}

	private applyStyle(
		state: FeatureRender,
		feature: GeoJSONStoreFeatures,
		style: TerraDrawAdapterStyling
	): void {
		if (state.geometryType === 'Point') {
			const entity = state.entities[0];
			if (state.usesBillboard) {
				if (entity?.billboard) {
					entity.billboard.image = asProperty(style.markerUrl);
					entity.billboard.width = asProperty(style.markerWidth);
					entity.billboard.height = asProperty(style.markerHeight);
				}
			} else if (entity?.point) {
				entity.point.pixelSize = asProperty(style.pointWidth * 2);
				entity.point.color = asProperty(this.hexToColor(style.pointColor, style.pointOpacity));
				entity.point.outlineColor = asProperty(
					this.hexToColor(style.pointOutlineColor, style.pointOutlineOpacity)
				);
				entity.point.outlineWidth = asProperty(style.pointOutlineWidth);
			}
			return;
		}

		if (state.geometryType === 'LineString') {
			const polyline = state.entities[0]?.polyline;
			if (polyline) {
				polyline.width = asProperty(style.lineStringWidth);
				polyline.material = asProperty(this.lineStringMaterial(style, feature));
				polyline.zIndex = asProperty(style.zIndex);
			}
			return;
		}

		const [fill, ...outlines] = state.entities;
		if (fill?.polygon) {
			fill.polygon.material = asProperty(
				this.hexToColor(style.polygonFillColor, style.polygonFillOpacity)
			);
			fill.polygon.zIndex = asProperty(style.zIndex);
		}
		const outlineColor = this.hexToColor(style.polygonOutlineColor, style.polygonOutlineOpacity);
		for (const entity of outlines) {
			if (entity.polyline) {
				entity.polyline.width = asProperty(style.polygonOutlineWidth);
				entity.polyline.material = asProperty(outlineColor);
				entity.polyline.zIndex = asProperty(style.zIndex);
			}
		}
	}

	private hexToColor(hex: string, opacity?: number): CesiumType.Color {
		const color = this._lib.Color.fromCssColorString(hex);
		return opacity === undefined ? color : color.withAlpha(opacity);
	}

	private createPointEntity(
		position: CesiumType.Cartesian3,
		style: TerraDrawAdapterStyling
	): CesiumType.Entity {
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

	private lineStringMaterial(
		style: TerraDrawAdapterStyling,
		feature: GeoJSONStoreFeatures
	): CesiumType.Color | CesiumType.PolylineDashMaterialProperty {
		const color = this.hexToColor(style.lineStringColor, style.lineStringOpacity);
		const dash =
			typeof style.lineStringDash === 'function'
				? style.lineStringDash(feature)
				: style.lineStringDash;
		return dash
			? new this._lib.PolylineDashMaterialProperty({
					color,
					// Cesium's dashLength is the length of one dash and gap cycle,
					// which Terra Draw expresses as a [dash, gap] pixel tuple
					dashLength: dash[0] + dash[1]
				})
			: color;
	}

	private createLineStringEntity(
		positions: CesiumType.Cartesian3[],
		style: TerraDrawAdapterStyling,
		feature: GeoJSONStoreFeatures
	): CesiumType.Entity {
		return this._viewer.entities.add({
			polyline: {
				positions,
				width: style.lineStringWidth,
				material: this.lineStringMaterial(style, feature),
				clampToGround: true,
				zIndex: style.zIndex
			}
		});
	}

	private createPolygonEntities(
		rings: CesiumType.Cartesian3[][],
		style: TerraDrawAdapterStyling
	): CesiumType.Entity[] {
		if (!rings[0]) {
			return [];
		}

		const entities: CesiumType.Entity[] = [
			this._viewer.entities.add({
				polygon: {
					hierarchy: this.buildHierarchy(rings),
					material: this.hexToColor(style.polygonFillColor, style.polygonFillOpacity),
					zIndex: style.zIndex
				}
			})
		];

		// Cesium does not support polygon outline widths greater than one pixel on
		// most platforms, so outlines are rendered as separate ground polylines
		const outlineColor = this.hexToColor(style.polygonOutlineColor, style.polygonOutlineOpacity);
		for (const ring of rings) {
			entities.push(
				this._viewer.entities.add({
					polyline: {
						positions: ring,
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
