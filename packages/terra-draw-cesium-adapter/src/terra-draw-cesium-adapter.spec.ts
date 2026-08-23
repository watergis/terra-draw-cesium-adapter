import { describe, expect, it, vi } from 'vitest';
import type { Viewer } from 'cesium';
import type { GeoJSONStoreFeatures, TerraDrawExtend } from 'terra-draw';
import { TerraDrawCesiumAdapter, type InjectableCesium } from './terra-draw-cesium-adapter';

const createMockLib = () =>
	({
		Cartesian2: vi.fn(function (this: void, x: number, y: number) {
			return { x, y };
		}),
		Cartesian3: Object.assign(vi.fn(), {
			fromDegrees: vi.fn((lng: number, lat: number) => ({ lng, lat })),
			fromDegreesArray: vi.fn((coordinates: number[]) => coordinates)
		}),
		CallbackProperty: vi.fn(function (this: void, callback: () => unknown, isConstant: boolean) {
			return { callback, isConstant, getValue: () => callback() };
		}),
		Cartographic: {
			fromCartesian: vi.fn(() => ({ longitude: 0.1, latitude: 0.2 })),
			fromDegrees: vi.fn((longitude: number, latitude: number) => ({ longitude, latitude }))
		},
		Color: {
			fromCssColorString: vi.fn((color: string) => ({
				color,
				withAlpha: vi.fn().mockImplementation((alpha: number) => ({ color, alpha }))
			}))
		},
		PolygonHierarchy: vi.fn(function (this: void, positions: unknown, holes: unknown) {
			return { positions, holes };
		}),
		PolylineDashMaterialProperty: vi.fn(function (this: void, options: Record<string, unknown>) {
			return options;
		}),
		SceneTransforms: {
			worldToWindowCoordinates: vi.fn(() => ({ x: 50, y: 60 }))
		},
		Math: {
			toDegrees: vi.fn((radians: number) => radians * (180 / Math.PI))
		},
		ScreenSpaceEventType: { LEFT_DOUBLE_CLICK: 2 },
		HeightReference: { CLAMP_TO_GROUND: 1 },
		VerticalOrigin: { BOTTOM: 1 }
	}) as unknown as InjectableCesium;

const createMockViewer = () => {
	const canvas = document.createElement('canvas');
	canvas.getBoundingClientRect = vi.fn(
		() =>
			({
				left: 10,
				top: 20,
				right: 610,
				bottom: 420,
				width: 600,
				height: 400,
				x: 10,
				y: 20
			}) as DOMRect
	);
	return {
		canvas,
		scene: {
			camera: {
				pickEllipsoid: vi.fn(() => ({ ellipsoid: true })),
				getPickRay: vi.fn(() => ({ ray: true }))
			},
			globe: {
				ellipsoid: {},
				pick: vi.fn(() => ({ terrain: true })),
				getHeight: vi.fn(() => 123)
			},
			screenSpaceCameraController: {
				enableRotate: true,
				enableTranslate: true
			},
			requestRenderMode: false,
			requestRender: vi.fn()
		},
		entities: {
			add: vi.fn((options: Record<string, unknown>) => ({ ...options })),
			remove: vi.fn()
		},
		screenSpaceEventHandler: {
			removeInputAction: vi.fn()
		}
	} as unknown as Viewer;
};

const MockCallbacks = (
	overrides?: Partial<TerraDrawExtend.TerraDrawCallbacks>
): TerraDrawExtend.TerraDrawCallbacks => ({
	getState: vi.fn(() => 'started' as const),
	onKeyUp: vi.fn(),
	onKeyDown: vi.fn(),
	onClick: vi.fn(),
	onMouseMove: vi.fn(),
	onDragStart: vi.fn(),
	onDrag: vi.fn(),
	onDragEnd: vi.fn(),
	onClear: vi.fn(),
	onReady: vi.fn(),
	...overrides
});

const MockPointerEvent = (overrides?: Partial<PointerEvent>) =>
	({
		bubbles: true,
		cancelable: true,
		clientX: 100,
		clientY: 200,
		button: 0,
		buttons: 1,
		pointerType: 'mouse',
		...overrides
	}) as PointerEvent;

const createTestFeature = (
	geometry: GeoJSONStoreFeatures['geometry'],
	id = 'f-1'
): GeoJSONStoreFeatures =>
	({
		id,
		type: 'Feature',
		geometry,
		properties: { mode: 'test' }
	}) as GeoJSONStoreFeatures;

const MockStyling = (overrides?: Record<string, unknown>) => ({
	test: vi.fn(() => ({
		pointColor: '#ffffff',
		pointWidth: 6,
		pointOpacity: 0.8,
		pointOutlineColor: '#000000',
		pointOutlineWidth: 2,
		pointOutlineOpacity: 1,
		polygonFillColor: '#00ff00',
		polygonFillOpacity: 0.5,
		polygonOutlineColor: '#ff0000',
		polygonOutlineWidth: 3,
		polygonOutlineOpacity: 1,
		lineStringColor: '#0000ff',
		lineStringWidth: 4,
		lineStringOpacity: 1,
		zIndex: 10,
		...overrides
	}))
});

const createAdapter = (config?: {
	viewer?: Viewer;
	lib?: InjectableCesium;
	coordinatePrecision?: number;
}) => {
	const viewer = config?.viewer ?? createMockViewer();
	const lib = config?.lib ?? createMockLib();
	const adapter = new TerraDrawCesiumAdapter({
		map: viewer,
		lib,
		...(config?.coordinatePrecision !== undefined
			? { coordinatePrecision: config.coordinatePrecision }
			: {})
	});
	return { adapter, viewer, lib };
};

describe('TerraDrawCesiumAdapter', () => {
	describe('constructor', () => {
		it('instantiates the adapter correctly', () => {
			const { adapter } = createAdapter();
			expect(adapter).toBeDefined();
			expect(adapter.getMapEventElement).toBeDefined();
			expect(adapter.render).toBeDefined();
			expect(adapter.register).toBeDefined();
			expect(adapter.unregister).toBeDefined();
			expect(adapter.project).toBeDefined();
			expect(adapter.unproject).toBeDefined();
			expect(adapter.setCursor).toBeDefined();
		});

		it('sets tabindex on the canvas so keyboard events fire', () => {
			const { viewer } = createAdapter();
			expect(viewer.canvas.getAttribute('tabindex')).toBe('0');
		});

		it("removes Cesium's default left double click entity tracking", () => {
			const { viewer, lib } = createAdapter();
			expect(viewer.screenSpaceEventHandler.removeInputAction).toHaveBeenCalledWith(
				lib.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
			);
		});
	});

	describe('getLngLatFromEvent', () => {
		it('returns the longitude and latitude for a pointer event on the globe', () => {
			const { adapter, viewer, lib } = createAdapter();
			const result = adapter.getLngLatFromEvent(MockPointerEvent());
			expect(viewer.scene.camera.getPickRay).toHaveBeenCalledWith({ x: 90, y: 180 });
			expect(viewer.scene.globe.pick).toHaveBeenCalledWith({ ray: true }, viewer.scene);
			expect(lib.Cartographic.fromCartesian).toHaveBeenCalledWith({ terrain: true });
			expect(result).toEqual({
				lng: 0.1 * (180 / Math.PI),
				lat: 0.2 * (180 / Math.PI)
			});
		});

		it('returns null when the event does not intersect the globe', () => {
			const viewer = createMockViewer();
			(viewer.scene.globe.pick as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
			(viewer.scene.camera.pickEllipsoid as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
			const { adapter } = createAdapter({ viewer });
			expect(adapter.getLngLatFromEvent(MockPointerEvent())).toBeNull();
		});
	});

	describe('getMapEventElement', () => {
		it('returns the viewer canvas', () => {
			const { adapter, viewer } = createAdapter();
			expect(adapter.getMapEventElement()).toBe(viewer.canvas);
		});
	});

	describe('setDraggability', () => {
		it('enables and disables camera rotation and translation', () => {
			const { adapter, viewer } = createAdapter();
			const controller = viewer.scene.screenSpaceCameraController;

			adapter.setDraggability(false);
			expect(controller.enableRotate).toBe(false);
			expect(controller.enableTranslate).toBe(false);

			adapter.setDraggability(true);
			expect(controller.enableRotate).toBe(true);
			expect(controller.enableTranslate).toBe(true);
		});
	});

	describe('setDoubleClickToZoom', () => {
		it('removes the left double click input action when disabled', () => {
			const { adapter, viewer, lib } = createAdapter();
			(viewer.screenSpaceEventHandler.removeInputAction as ReturnType<typeof vi.fn>).mockClear();

			adapter.setDoubleClickToZoom(false);
			expect(viewer.screenSpaceEventHandler.removeInputAction).toHaveBeenCalledWith(
				lib.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
			);
		});

		it('is a no-op when enabled as Cesium has no double click to zoom', () => {
			const { adapter, viewer } = createAdapter();
			(viewer.screenSpaceEventHandler.removeInputAction as ReturnType<typeof vi.fn>).mockClear();

			adapter.setDoubleClickToZoom(true);
			expect(viewer.screenSpaceEventHandler.removeInputAction).not.toHaveBeenCalled();
		});
	});

	describe('project', () => {
		it('returns the screen coordinate for a longitude and latitude', () => {
			const { adapter, viewer, lib } = createAdapter();
			const result = adapter.project(135, 35);
			expect(lib.Cartesian3.fromDegrees).toHaveBeenCalledWith(135, 35, 123);
			expect(lib.SceneTransforms.worldToWindowCoordinates).toHaveBeenCalledWith(viewer.scene, {
				lng: 135,
				lat: 35
			});
			expect(result).toEqual({ x: 50, y: 60 });
		});

		it('projects from the terrain surface so that it matches where geometry is drawn', () => {
			const { adapter, viewer, lib } = createAdapter();
			(viewer.scene.globe.getHeight as ReturnType<typeof vi.fn>).mockReturnValue(1500);

			adapter.project(135, 35);

			expect(lib.Cartographic.fromDegrees).toHaveBeenCalledWith(135, 35);
			expect(viewer.scene.globe.getHeight).toHaveBeenCalledWith({
				longitude: 135,
				latitude: 35
			});
			expect(lib.Cartesian3.fromDegrees).toHaveBeenCalledWith(135, 35, 1500);
		});

		it('falls back to a height of zero when the terrain tile has not loaded', () => {
			const { adapter, viewer, lib } = createAdapter();
			(viewer.scene.globe.getHeight as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

			adapter.project(135, 35);

			expect(lib.Cartesian3.fromDegrees).toHaveBeenCalledWith(135, 35, 0);
		});

		it('throws when the coordinate cannot be projected', () => {
			const lib = createMockLib();
			(lib.SceneTransforms.worldToWindowCoordinates as ReturnType<typeof vi.fn>).mockReturnValue(
				undefined
			);
			const { adapter } = createAdapter({ lib });
			expect(() => adapter.project(135, 35)).toThrow();
		});
	});

	describe('unproject', () => {
		it('returns the longitude and latitude for a screen coordinate', () => {
			const { adapter, viewer, lib } = createAdapter();
			const result = adapter.unproject(50, 60);
			expect(viewer.scene.camera.getPickRay).toHaveBeenCalledWith({ x: 50, y: 60 });
			expect(viewer.scene.globe.pick).toHaveBeenCalledWith({ ray: true }, viewer.scene);
			expect(lib.Cartographic.fromCartesian).toHaveBeenCalledWith({ terrain: true });
			expect(result).toEqual({
				lng: 0.1 * (180 / Math.PI),
				lat: 0.2 * (180 / Math.PI)
			});
		});

		it('picks the terrain surface rather than the ellipsoid', () => {
			const { adapter, viewer } = createAdapter();
			adapter.unproject(50, 60);
			expect(viewer.scene.camera.pickEllipsoid).not.toHaveBeenCalled();
		});

		it('falls back to the ellipsoid when the ray misses the terrain', () => {
			const viewer = createMockViewer();
			(viewer.scene.globe.pick as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
			const { adapter, lib } = createAdapter({ viewer });

			adapter.unproject(50, 60);

			expect(viewer.scene.camera.pickEllipsoid).toHaveBeenCalledWith(
				{ x: 50, y: 60 },
				viewer.scene.globe.ellipsoid
			);
			expect(lib.Cartographic.fromCartesian).toHaveBeenCalledWith({ ellipsoid: true });
		});

		it('falls back to the ellipsoid when the camera cannot produce a pick ray', () => {
			const viewer = createMockViewer();
			(viewer.scene.camera.getPickRay as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
			const { adapter } = createAdapter({ viewer });

			adapter.unproject(50, 60);

			expect(viewer.scene.globe.pick).not.toHaveBeenCalled();
			expect(viewer.scene.camera.pickEllipsoid).toHaveBeenCalledWith(
				{ x: 50, y: 60 },
				viewer.scene.globe.ellipsoid
			);
		});

		it('throws when the screen coordinate is not on the globe', () => {
			const viewer = createMockViewer();
			(viewer.scene.globe.pick as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
			(viewer.scene.camera.pickEllipsoid as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
			const { adapter } = createAdapter({ viewer });
			expect(() => adapter.unproject(50, 60)).toThrow();
		});
	});

	describe('setCursor', () => {
		it('sets the cursor on the canvas', () => {
			const { adapter, viewer } = createAdapter();
			adapter.setCursor('crosshair');
			expect(viewer.canvas.style.cursor).toBe('crosshair');
		});

		it('removes the cursor when set to unset', () => {
			const { adapter, viewer } = createAdapter();
			adapter.setCursor('pointer');
			adapter.setCursor('unset');
			expect(viewer.canvas.style.cursor).toBe('');
		});

		it('does not write the same cursor twice', () => {
			const { adapter, viewer } = createAdapter();
			adapter.setCursor('move');
			viewer.canvas.style.cursor = 'wait';
			adapter.setCursor('move');
			expect(viewer.canvas.style.cursor).toBe('wait');
		});
	});

	describe('getCoordinatePrecision', () => {
		it('returns the default coordinate precision of 9', () => {
			const { adapter } = createAdapter();
			expect(adapter.getCoordinatePrecision()).toBe(9);
		});

		it('returns the configured coordinate precision', () => {
			const { adapter } = createAdapter({ coordinatePrecision: 6 });
			expect(adapter.getCoordinatePrecision()).toBe(6);
		});
	});

	describe('render', () => {
		it('does nothing when the changeset is empty', () => {
			const { adapter, viewer } = createAdapter();
			adapter.render(
				{ created: [], updated: [], unchanged: [], deletedIds: [] },
				MockStyling() as never
			);
			expect(viewer.entities.add).not.toHaveBeenCalled();
			expect(viewer.entities.remove).not.toHaveBeenCalled();
		});

		it('creates a point entity for a created Point feature', () => {
			const { adapter, viewer, lib } = createAdapter();
			const feature = createTestFeature({ type: 'Point', coordinates: [135, 35] });
			adapter.render(
				{ created: [feature], updated: [], unchanged: [], deletedIds: [] },
				MockStyling() as never
			);
			expect(viewer.entities.add).toHaveBeenCalledTimes(1);
			const options = (viewer.entities.add as ReturnType<typeof vi.fn>).mock.calls[0]![0];
			expect(options.point).toMatchObject({
				pixelSize: 12,
				outlineWidth: 2,
				heightReference: lib.HeightReference.CLAMP_TO_GROUND
			});
			expect(lib.Color.fromCssColorString).toHaveBeenCalledWith('#ffffff');
			expect(lib.Color.fromCssColorString).toHaveBeenCalledWith('#000000');
		});

		it('creates a billboard entity for a Point feature with a marker style', () => {
			const { adapter, viewer, lib } = createAdapter();
			const feature = createTestFeature({ type: 'Point', coordinates: [135, 35] });
			adapter.render(
				{ created: [feature], updated: [], unchanged: [], deletedIds: [] },
				MockStyling({ markerUrl: 'marker.png', markerWidth: 32, markerHeight: 40 }) as never
			);
			const options = (viewer.entities.add as ReturnType<typeof vi.fn>).mock.calls[0]![0];
			expect(options.billboard).toMatchObject({
				image: 'marker.png',
				width: 32,
				height: 40,
				verticalOrigin: lib.VerticalOrigin.BOTTOM
			});
			expect(options.point).toBeUndefined();
		});

		it('creates a polyline entity for a created LineString feature', () => {
			const { adapter, viewer, lib } = createAdapter();
			const feature = createTestFeature({
				type: 'LineString',
				coordinates: [
					[0, 0],
					[1, 1]
				]
			});
			adapter.render(
				{ created: [feature], updated: [], unchanged: [], deletedIds: [] },
				MockStyling() as never
			);
			expect(lib.Cartesian3.fromDegreesArray).toHaveBeenCalledWith([0, 0, 1, 1]);
			const options = (viewer.entities.add as ReturnType<typeof vi.fn>).mock.calls[0]![0];
			expect(options.polyline).toMatchObject({ width: 4, clampToGround: true, zIndex: 10 });
		});

		it('creates a dashed polyline for a LineString feature with a dash style', () => {
			const { adapter, viewer, lib } = createAdapter();
			const feature = createTestFeature({
				type: 'LineString',
				coordinates: [
					[0, 0],
					[1, 1]
				]
			});
			adapter.render(
				{ created: [feature], updated: [], unchanged: [], deletedIds: [] },
				MockStyling({ lineStringDash: [2, 2] }) as never
			);
			expect(lib.PolylineDashMaterialProperty).toHaveBeenCalled();
			const options = (viewer.entities.add as ReturnType<typeof vi.fn>).mock.calls[0]![0];
			expect(options.polyline.material).toMatchObject({ dashLength: 4 });
		});

		it('creates a polygon entity plus one outline polyline per ring', () => {
			const { adapter, viewer, lib } = createAdapter();
			const feature = createTestFeature({
				type: 'Polygon',
				coordinates: [
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[0, 0]
					],
					[
						[0.2, 0.2],
						[0.2, 0.4],
						[0.4, 0.4],
						[0.2, 0.2]
					]
				]
			});
			adapter.render(
				{ created: [feature], updated: [], unchanged: [], deletedIds: [] },
				MockStyling() as never
			);
			// 1 polygon + 2 outline polylines (outer ring + hole)
			expect(viewer.entities.add).toHaveBeenCalledTimes(3);
			const calls = (viewer.entities.add as ReturnType<typeof vi.fn>).mock.calls;
			expect(calls[0]![0].polygon).toBeDefined();
			expect(lib.PolygonHierarchy).toHaveBeenCalledTimes(2);
			expect(calls[1]![0].polyline).toMatchObject({ width: 3, clampToGround: true });
			expect(calls[2]![0].polyline).toBeDefined();
		});

		const lineStringFeature = (coordinates: number[][], id = 'f-1') =>
			createTestFeature({ type: 'LineString', coordinates }, id);

		const lastEntity = (viewer: Viewer, index = 0) =>
			(viewer.entities.add as ReturnType<typeof vi.fn>).mock.results[index]!.value;

		it('reuses the entities of an updated feature and drives them from a callback', () => {
			const { adapter, viewer, lib } = createAdapter();
			const feature = lineStringFeature([
				[0, 0],
				[1, 1]
			]);
			adapter.render(
				{ created: [feature], updated: [], unchanged: [], deletedIds: [] },
				MockStyling() as never
			);
			const entity = lastEntity(viewer);

			adapter.render(
				{
					created: [],
					updated: [
						lineStringFeature([
							[0, 0],
							[2, 2]
						])
					],
					unchanged: [],
					deletedIds: []
				},
				MockStyling() as never
			);

			expect(viewer.entities.remove).not.toHaveBeenCalled();
			expect(viewer.entities.add).toHaveBeenCalledTimes(1);
			// A non constant callback puts the entity on Cesium's dynamic path, where
			// ground geometry is built synchronously and so is visible whilst drawing
			expect(lib.CallbackProperty).toHaveBeenCalledWith(expect.any(Function), false);
			expect(entity.polyline.positions.getValue()).toEqual([0, 0, 2, 2]);
		});

		it('keeps following the feature on subsequent updates', () => {
			const { adapter, viewer } = createAdapter();
			adapter.render(
				{
					created: [
						lineStringFeature([
							[0, 0],
							[1, 1]
						])
					],
					updated: [],
					unchanged: [],
					deletedIds: []
				},
				MockStyling() as never
			);
			const entity = lastEntity(viewer);

			for (const end of [2, 3, 4]) {
				adapter.render(
					{
						created: [],
						updated: [
							lineStringFeature([
								[0, 0],
								[end, end]
							])
						],
						unchanged: [],
						deletedIds: []
					},
					MockStyling() as never
				);
			}

			expect(viewer.entities.add).toHaveBeenCalledTimes(1);
			expect(viewer.entities.remove).not.toHaveBeenCalled();
			expect(entity.polyline.positions.getValue()).toEqual([0, 0, 4, 4]);
		});

		it('returns a feature to static geometry once it stops changing', () => {
			vi.useFakeTimers();
			try {
				const { adapter, viewer } = createAdapter();
				adapter.render(
					{
						created: [
							lineStringFeature([
								[0, 0],
								[1, 1]
							])
						],
						updated: [],
						unchanged: [],
						deletedIds: []
					},
					MockStyling() as never
				);
				const entity = lastEntity(viewer);
				adapter.render(
					{
						created: [],
						updated: [
							lineStringFeature([
								[0, 0],
								[2, 2]
							])
						],
						unchanged: [],
						deletedIds: []
					},
					MockStyling() as never
				);
				expect(entity.polyline.positions.getValue).toBeDefined();

				vi.advanceTimersByTime(500);

				// The entity is recreated with constant positions, because Cesium does not
				// reliably rebuild a ground primitive when a callback is swapped for a value
				expect(viewer.entities.remove).toHaveBeenCalledWith(entity);
				expect(viewer.entities.add).toHaveBeenCalledTimes(2);
				expect(lastEntity(viewer, 1).polyline.positions).toEqual([0, 0, 2, 2]);

				// It is only demoted once
				vi.advanceTimersByTime(500);
				expect(viewer.entities.add).toHaveBeenCalledTimes(2);
			} finally {
				vi.useRealTimers();
			}
		});

		it('keeps a feature dynamic across renders that do not mention it', () => {
			vi.useFakeTimers();
			try {
				const { adapter, viewer } = createAdapter();
				adapter.render(
					{
						created: [
							lineStringFeature([
								[0, 0],
								[1, 1]
							])
						],
						updated: [],
						unchanged: [],
						deletedIds: []
					},
					MockStyling() as never
				);
				const entity = lastEntity(viewer);

				// Terra Draw spreads one interaction over several calls: dragging a
				// coordinate updates the point and the geometry it belongs to through
				// separate store events, and a styling change arrives as an empty
				// changeset. None of those mean the feature has stopped changing.
				for (const end of [2, 3, 4]) {
					adapter.render(
						{
							created: [],
							updated: [
								lineStringFeature([
									[0, 0],
									[end, end]
								])
							],
							unchanged: [],
							deletedIds: []
						},
						MockStyling() as never
					);
					vi.advanceTimersByTime(50);
					adapter.render(
						{ created: [], updated: [], unchanged: [], deletedIds: [] },
						MockStyling() as never
					);
					vi.advanceTimersByTime(50);
					adapter.render(
						{
							created: [createTestFeature({ type: 'Point', coordinates: [1, 1] }, 'point-1')],
							updated: [],
							unchanged: [],
							deletedIds: ['point-1']
						},
						MockStyling() as never
					);
					vi.advanceTimersByTime(50);
				}

				// The line entity is never recreated: only the three points are added
				// on top of it
				expect(viewer.entities.add).toHaveBeenCalledTimes(4);
				expect(entity.polyline.positions.getValue()).toEqual([0, 0, 4, 4]);
			} finally {
				vi.useRealTimers();
			}
		});

		it('requests a render when a feature is demoted in request render mode', () => {
			vi.useFakeTimers();
			try {
				const viewer = createMockViewer();
				(viewer.scene as unknown as { requestRenderMode: boolean }).requestRenderMode = true;
				const { adapter } = createAdapter({ viewer });
				adapter.render(
					{
						created: [
							lineStringFeature([
								[0, 0],
								[1, 1]
							])
						],
						updated: [],
						unchanged: [],
						deletedIds: []
					},
					MockStyling() as never
				);
				adapter.render(
					{
						created: [],
						updated: [
							lineStringFeature([
								[0, 0],
								[2, 2]
							])
						],
						unchanged: [],
						deletedIds: []
					},
					MockStyling() as never
				);
				const before = (viewer.scene.requestRender as ReturnType<typeof vi.fn>).mock.calls.length;

				vi.advanceTimersByTime(500);

				expect(viewer.scene.requestRender).toHaveBeenCalledTimes(before + 1);
			} finally {
				vi.useRealTimers();
			}
		});

		it('does not demote after the adapter has been cleared or unregistered', () => {
			vi.useFakeTimers();
			try {
				const { adapter, viewer } = createAdapter();
				adapter.register(MockCallbacks());
				adapter.render(
					{
						created: [
							lineStringFeature([
								[0, 0],
								[1, 1]
							])
						],
						updated: [],
						unchanged: [],
						deletedIds: []
					},
					MockStyling() as never
				);
				adapter.render(
					{
						created: [],
						updated: [
							lineStringFeature([
								[0, 0],
								[2, 2]
							])
						],
						unchanged: [],
						deletedIds: []
					},
					MockStyling() as never
				);

				adapter.clear();
				const addCalls = (viewer.entities.add as ReturnType<typeof vi.fn>).mock.calls.length;
				adapter.unregister();

				vi.advanceTimersByTime(500);

				expect(viewer.entities.add).toHaveBeenCalledTimes(addCalls);
			} finally {
				vi.useRealTimers();
			}
		});

		it('updates a Point feature in place without recreating it', () => {
			const { adapter, viewer, lib } = createAdapter();
			const feature = createTestFeature({ type: 'Point', coordinates: [135, 35] });
			adapter.render(
				{ created: [feature], updated: [], unchanged: [], deletedIds: [] },
				MockStyling() as never
			);
			const entity = lastEntity(viewer);

			adapter.render(
				{
					created: [],
					updated: [createTestFeature({ type: 'Point', coordinates: [136, 36] })],
					unchanged: [],
					deletedIds: []
				},
				MockStyling() as never
			);

			expect(viewer.entities.remove).not.toHaveBeenCalled();
			expect(viewer.entities.add).toHaveBeenCalledTimes(1);
			// Points render through Cesium's synchronous collections, so they are set
			// directly rather than through a callback
			expect(lib.CallbackProperty).not.toHaveBeenCalled();
			expect(entity.position).toEqual({ lng: 136, lat: 36 });
		});

		it('recreates the entities when the geometry type changes', () => {
			const { adapter, viewer } = createAdapter();
			adapter.render(
				{
					created: [createTestFeature({ type: 'Point', coordinates: [135, 35] })],
					updated: [],
					unchanged: [],
					deletedIds: []
				},
				MockStyling() as never
			);

			adapter.render(
				{
					created: [],
					updated: [
						lineStringFeature([
							[0, 0],
							[1, 1]
						])
					],
					unchanged: [],
					deletedIds: []
				},
				MockStyling() as never
			);

			expect(viewer.entities.remove).toHaveBeenCalledTimes(1);
			expect(viewer.entities.add).toHaveBeenCalledTimes(2);
		});

		it('recreates the entities when a polygon gains a ring', () => {
			const { adapter, viewer } = createAdapter();
			const outerRing = [
				[0, 0],
				[0, 1],
				[1, 1],
				[0, 0]
			];
			const hole = [
				[0.2, 0.2],
				[0.2, 0.4],
				[0.4, 0.4],
				[0.2, 0.2]
			];
			adapter.render(
				{
					created: [createTestFeature({ type: 'Polygon', coordinates: [outerRing] })],
					updated: [],
					unchanged: [],
					deletedIds: []
				},
				MockStyling() as never
			);
			// polygon + 1 outline polyline
			expect(viewer.entities.add).toHaveBeenCalledTimes(2);

			adapter.render(
				{
					created: [],
					updated: [createTestFeature({ type: 'Polygon', coordinates: [outerRing, hole] })],
					unchanged: [],
					deletedIds: []
				},
				MockStyling() as never
			);

			expect(viewer.entities.remove).toHaveBeenCalledTimes(2);
			// polygon + 2 outline polylines
			expect(viewer.entities.add).toHaveBeenCalledTimes(5);
		});

		it('removes all entities for deleted features', () => {
			const { adapter, viewer } = createAdapter();
			const feature = createTestFeature({
				type: 'Polygon',
				coordinates: [
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[0, 0]
					]
				]
			});
			adapter.render(
				{ created: [feature], updated: [], unchanged: [], deletedIds: [] },
				MockStyling() as never
			);
			adapter.render(
				{ created: [], updated: [], unchanged: [], deletedIds: [feature.id as string] },
				MockStyling() as never
			);
			// polygon + outline polyline both removed
			expect(viewer.entities.remove).toHaveBeenCalledTimes(2);
		});

		it('ignores deleted ids that were never rendered', () => {
			const { adapter, viewer } = createAdapter();
			adapter.render(
				{ created: [], updated: [], unchanged: [], deletedIds: ['missing'] },
				MockStyling() as never
			);
			expect(viewer.entities.remove).not.toHaveBeenCalled();
		});

		it('requests a render when the scene is in request render mode', () => {
			const viewer = createMockViewer();
			(viewer.scene as unknown as { requestRenderMode: boolean }).requestRenderMode = true;
			const { adapter } = createAdapter({ viewer });
			adapter.render(
				{ created: [], updated: [], unchanged: [], deletedIds: [] },
				MockStyling() as never
			);
			expect(viewer.scene.requestRender).toHaveBeenCalledTimes(1);
		});

		it('does not request a render when request render mode is off', () => {
			const { adapter, viewer } = createAdapter();
			adapter.render(
				{ created: [], updated: [], unchanged: [], deletedIds: [] },
				MockStyling() as never
			);
			expect(viewer.scene.requestRender).not.toHaveBeenCalled();
		});
	});

	describe('clear', () => {
		it('removes all rendered entities and clears the mode state', () => {
			const { adapter, viewer } = createAdapter();
			const callbacks = MockCallbacks();
			adapter.register(callbacks);
			const feature = createTestFeature({ type: 'Point', coordinates: [135, 35] });
			adapter.render(
				{ created: [feature], updated: [], unchanged: [], deletedIds: [] },
				MockStyling() as never
			);

			adapter.clear();

			expect(callbacks.onClear).toHaveBeenCalled();
			expect(viewer.entities.remove).toHaveBeenCalledTimes(1);
		});

		it('does nothing when the adapter is not registered', () => {
			const { adapter, viewer } = createAdapter();
			adapter.clear();
			expect(viewer.entities.remove).not.toHaveBeenCalled();
		});
	});

	describe('register', () => {
		it('registers callbacks and calls onReady', () => {
			const { adapter } = createAdapter();
			const callbacks = MockCallbacks();
			adapter.register(callbacks);
			expect(callbacks.onReady).toHaveBeenCalledTimes(1);
		});

		it('focuses the canvas on pointer down so keyboard events fire', () => {
			const { adapter, viewer } = createAdapter();
			const focus = vi.spyOn(viewer.canvas as unknown as HTMLElement, 'focus');
			adapter.register(MockCallbacks());

			viewer.canvas.dispatchEvent(new Event('pointerdown'));

			expect(focus).toHaveBeenCalledWith({ preventScroll: true });
		});

		it('suppresses the focus ring for the pointer focus and restores it on blur', () => {
			const { adapter, viewer } = createAdapter();
			const canvas = viewer.canvas as unknown as HTMLElement;
			document.body.appendChild(canvas);
			adapter.register(MockCallbacks());

			canvas.dispatchEvent(new Event('pointerdown'));
			expect(canvas.style.outline).toBe('none');

			canvas.dispatchEvent(new Event('blur'));
			expect(canvas.style.outline).toBe('');

			canvas.remove();
		});
	});

	describe('unregister', () => {
		it('stops focusing the canvas on pointer down', () => {
			const { adapter, viewer } = createAdapter();
			const focus = vi.spyOn(viewer.canvas as unknown as HTMLElement, 'focus');
			adapter.register(MockCallbacks());
			adapter.unregister();

			viewer.canvas.dispatchEvent(new Event('pointerdown'));

			expect(focus).not.toHaveBeenCalled();
		});

		it('clears rendered entities on unregister', () => {
			const { adapter, viewer } = createAdapter();
			const callbacks = MockCallbacks();
			adapter.register(callbacks);
			const feature = createTestFeature({ type: 'Point', coordinates: [135, 35] });
			adapter.render(
				{ created: [feature], updated: [], unchanged: [], deletedIds: [] },
				MockStyling() as never
			);

			adapter.unregister();

			expect(callbacks.onClear).toHaveBeenCalled();
			expect(viewer.entities.remove).toHaveBeenCalledTimes(1);
		});
	});
});
