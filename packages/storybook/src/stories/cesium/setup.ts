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

// The stories use an offline base layer, so no Cesium Ion token is required
Cesium.Ion.defaultAccessToken = '';

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
	zoom
}: {
	mapContainer: HTMLElement;
	centerLat: number;
	centerLng: number;
	zoom: number;
}) => {
	const viewer = new Cesium.Viewer(mapContainer, {
		// Offline Natural Earth II imagery bundled with Cesium - no network or Ion token needed
		baseLayer: Cesium.ImageryLayer.fromProviderAsync(
			Cesium.TileMapServiceImageryProvider.fromUrl(
				Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
			)
		),
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
		)
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
			zoom: args.zoom
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
