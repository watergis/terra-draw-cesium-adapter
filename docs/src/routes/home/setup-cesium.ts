import * as Cesium from 'cesium';

// The demo falls back to an offline base layer, so no Cesium Ion token is
// required. Setting one - see .env.example - swaps in Cesium World Imagery,
// which unlike the offline Natural Earth II texture still has detail when
// zoomed in, and Cesium World Terrain. Both come from Cesium Ion, so without
// a token the demo is a smooth globe
const ionAccessToken = import.meta.env.CESIUM_ION_ACCESS_TOKEN ?? '';
const hasIonAccessToken = ionAccessToken !== '';
Cesium.Ion.defaultAccessToken = ionAccessToken;

export function setupCesiumViewer({
	container,
	lng,
	lat,
	height
}: {
	container: HTMLElement;
	lng: number;
	lat: number;
	height: number;
}) {
	const viewer = new Cesium.Viewer(container, {
		baseLayer: hasIonAccessToken
			? Cesium.ImageryLayer.fromWorldImagery({})
			: // Offline Natural Earth II imagery bundled with Cesium - no network or Ion token needed
				Cesium.ImageryLayer.fromProviderAsync(
					Cesium.TileMapServiceImageryProvider.fromUrl(
						Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
					)
				),
		terrain: hasIonAccessToken ? Cesium.Terrain.fromWorldTerrain() : undefined,
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
		destination: Cesium.Cartesian3.fromDegrees(lng, lat, height)
	});

	return viewer;
}

export function setLocation(viewer: Cesium.Viewer, [lng, lat]: [number, number]) {
	viewer.camera.setView({
		destination: Cesium.Cartesian3.fromDegrees(lng, lat, 5000)
	});
}
