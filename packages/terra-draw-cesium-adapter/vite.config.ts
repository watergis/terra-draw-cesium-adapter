import { defineConfig } from 'vite';

const name = 'terra-draw-cesium-adapter';

export default defineConfig(({ mode }) => {
	// The `modern` pass emits an additional untranspiled ESM bundle, matching the
	// `.modern.js` output the upstream terra-draw adapters ship via microbundle.
	const modern = mode === 'modern';

	return {
		build: {
			target: modern ? 'esnext' : 'es2021',
			sourcemap: true,
			minify: false,
			// Only the first pass may clean dist, otherwise it would wipe the other one.
			emptyOutDir: !modern,
			lib: {
				entry: 'src/terra-draw-cesium-adapter.ts',
				name: 'terraDrawCesiumAdapter',
				formats: modern ? ['es'] : ['es', 'umd'],
				fileName: (format) => {
					if (modern) return `${name}.modern.js`;
					if (format === 'umd') return `${name}.umd.js`;
					return `${name}.module.js`;
				}
			},
			rollupOptions: {
				external: ['terra-draw', 'cesium'],
				output: {
					globals: {
						'terra-draw': 'terraDraw',
						cesium: 'Cesium'
					}
				}
			}
		}
	};
});
