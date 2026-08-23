import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';
import type { StorybookConfig } from '@storybook/html-vite';

const config: StorybookConfig = {
	stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx|md|mdx)'],
	staticDirs: [
		// Serve Cesium's static assets (workers, widgets, textures) under /cesium
		{ from: '../node_modules/cesium/Build/Cesium', to: '/cesium' }
	],
	addons: ['@storybook/addon-vitest'],
	framework: {
		name: '@storybook/html-vite',
		options: {}
	},
	core: {
		disableTelemetry: true
	},
	viteFinal: async (viteConfig) => {
		return mergeConfig(viteConfig, {
			define: {
				CESIUM_BASE_URL: JSON.stringify('/cesium')
			},
			// Expose CESIUM_ prefixed variables from .env, so that
			// CESIUM_ION_ACCESS_TOKEN reaches the stories through import.meta.env
			envPrefix: ['VITE_', 'CESIUM_'],
			resolve: {
				alias: {
					// Resolve the adapter to its TypeScript source so that storybook
					// and its tests exercise the workspace source without a build step
					'@watergis/terra-draw-cesium-adapter': fileURLToPath(
						new URL(
							'../../terra-draw-cesium-adapter/src/terra-draw-cesium-adapter.ts',
							import.meta.url
						)
					)
				}
			}
		});
	}
};

export default config;
