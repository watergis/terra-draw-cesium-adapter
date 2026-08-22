import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

// More info at: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
export default defineConfig({
	test: {
		projects: [
			{
				extends: true,
				plugins: [
					storybookTest({
						configDir: '.storybook'
					})
				],
				test: {
					name: 'storybook',
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({
							launchOptions: {
								// Allow WebGL via SwiftShader software rendering on CI
								args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
							}
						}),
						instances: [{ browser: 'chromium' }]
					},
					// Cesium under software rendering is slow to initialise
					testTimeout: 60_000,
					hookTimeout: 60_000
				},
				server: {
					port: 63315
				}
			}
		]
	}
});
