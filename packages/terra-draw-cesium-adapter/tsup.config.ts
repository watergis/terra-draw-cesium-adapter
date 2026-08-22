import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/terra-draw-cesium-adapter.ts'],
	format: ['esm', 'cjs'],
	dts: true,
	sourcemap: true,
	clean: true,
	external: ['terra-draw', 'cesium'],
	outExtension({ format }) {
		return { js: format === 'cjs' ? '.cjs' : '.js' };
	}
});
