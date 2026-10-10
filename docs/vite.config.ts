import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Cesium loads its workers, widgets and textures at runtime from this path.
// The bundled Storybook is built against the same root-absolute path, so it
// shares this single copy of the assets rather than shipping its own
const cesiumBaseUrl = '/cesium';
const cesiumBuild = 'node_modules/cesium/Build/Cesium';

export default defineConfig({
	plugins: [
		preact(),
		viteStaticCopy({
			targets: ['Workers', 'Assets', 'Widgets', 'ThirdParty'].map((directory) => ({
				src: `${cesiumBuild}/${directory}`,
				dest: cesiumBaseUrl.slice(1),
				// Drop the path leading up to the directory, so that it is copied as
				// /cesium/Workers rather than /cesium/node_modules/cesium/Build/Cesium/Workers
				rename: { stripBase: cesiumBuild.split('/').length }
			}))
		})
	],
	define: {
		CESIUM_BASE_URL: JSON.stringify(cesiumBaseUrl)
	},
	// Expose CESIUM_ prefixed variables from .env, so that
	// CESIUM_ION_ACCESS_TOKEN reaches the demo through import.meta.env
	envPrefix: ['VITE_', 'CESIUM_'],
	resolve: {
		alias: {
			// Resolve the adapter to its TypeScript source so that the website
			// always demonstrates the workspace source without a build step
			'@watergis/terra-draw-cesium-adapter': fileURLToPath(
				new URL(
					'../packages/terra-draw-cesium-adapter/src/terra-draw-cesium-adapter.ts',
					import.meta.url
				)
			)
		}
	},
	build: {
		outDir: 'dist',
		// Cesium is a single large dependency, there is little to gain from splitting it
		chunkSizeWarningLimit: 6000
	}
});
