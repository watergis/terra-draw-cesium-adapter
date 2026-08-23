import * as Cesium from 'cesium';
import { TerraDraw } from 'terra-draw';
import { TerraDrawCesiumAdapter } from '@watergis/terra-draw-cesium-adapter';
import {
	setupMapContainer,
	setupControls,
	SetupUndoRedo,
	whenElementExists
} from '../../common/setup';
import { StoryArgs } from '../../common/config';

// The stories fall back to an offline base layer, so no Cesium Ion token is
// required. Setting one - see .env.example - swaps in Cesium World Imagery,
// which unlike the offline Natural Earth II texture still has detail at the
// zoom levels the stories draw at, and unlocks the terrain stories
const ionAccessToken = import.meta.env.CESIUM_ION_ACCESS_TOKEN ?? '';
const hasIonAccessToken = ionAccessToken !== '';
Cesium.Ion.defaultAccessToken = ionAccessToken;

/**
 * Approximates a camera height in metres for a given web mercator style zoom
 * level so the stories frame roughly the same extent as other map libraries
 */
const zoomToHeight = (zoom: number, lat: number, viewportHeightPx: number) => {
	const metresPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
	return metresPerPixel * viewportHeightPx;
};

export const initialiseCesiumMap = ({
	mapContainer,
	centerLat,
	centerLng,
	zoom,
	pitch,
	terrain
}: {
	mapContainer: HTMLElement;
	centerLat: number;
	centerLng: number;
	zoom: number;
	pitch?: number;
	terrain?: boolean;
}) => {
	// Terrain comes from Cesium Ion, so a story that asks for it falls back to a
	// smooth globe whenever no token has been configured - which is how CI runs
	const withTerrain = Boolean(terrain) && hasIonAccessToken;

	const viewer = new Cesium.Viewer(mapContainer, {
		baseLayer: hasIonAccessToken
			? Cesium.ImageryLayer.fromWorldImagery({})
			: // Offline Natural Earth II imagery bundled with Cesium - no network or Ion token needed
				Cesium.ImageryLayer.fromProviderAsync(
					Cesium.TileMapServiceImageryProvider.fromUrl(
						Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
					)
				),
		terrain: withTerrain ? Cesium.Terrain.fromWorldTerrain() : undefined,
		baseLayerPicker: false,
		geocoder: false,
		animation: false,
		timeline: false,
		sceneModePicker: false,
		navigationHelpButton: false,
		homeButton: false,
		fullscreenButton: false,
		infoBox: false,
		selectionIndicator: false
	});

	viewer.camera.setView({
		destination: Cesium.Cartesian3.fromDegrees(
			centerLng,
			centerLat,
			zoomToHeight(zoom, centerLat, mapContainer.clientHeight || 400)
		),
		orientation:
			pitch === undefined ? undefined : { heading: 0, pitch: Cesium.Math.toRadians(pitch), roll: 0 }
	});

	return {
		// The whole Cesium namespace structurally satisfies InjectableCesium
		lib: Cesium,
		map: viewer
	};
};

const rendered: { [key: string]: HTMLElement } = {};

export function SetupCesium(args: StoryArgs): HTMLElement {
	if (rendered[args.id]) {
		return rendered[args.id];
	}

	const { container, controls, mapContainer, modeButtons, clearButton, modes } = setupMapContainer({
		...args,
		adapter: 'cesium'
	});

	whenElementExists(`#${mapContainer.id}`, () => {
		const mapConfig = initialiseCesiumMap({
			mapContainer,
			centerLat: args.centerLat,
			centerLng: args.centerLng,
			zoom: args.zoom,
			pitch: args.pitch,
			terrain: args.terrain
		});

		// A Cesium Viewer is usable as soon as it is constructed, so unlike the
		// map libraries that need a load event we can start Terra Draw immediately.
		// Waiting on a rendered frame would deadlock whenever the browser throttles
		// requestAnimationFrame, such as in a hidden tab or a headless test run.
		const draw = new TerraDraw({
			adapter: new TerraDrawCesiumAdapter({
				...mapConfig
			}),
			modes,
			undoRedo: SetupUndoRedo(args)
		});

		draw.start();

		setupControls({
			show: args.showButtons,
			changeMode: (mode) => draw.setMode(mode),
			clear: () => draw.clear(),
			modeButtons,
			clearButton,
			controls
		});

		args.afterRender?.(draw);
	});

	rendered[args.id] = container;

	return container;
}
