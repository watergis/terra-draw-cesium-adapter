// Copies the built Storybook into the website output, so that it is served
// from /storybook/ alongside the site itself
import { cpSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve(import.meta.dirname, '../../packages/storybook/storybook-static');
const destination = resolve(import.meta.dirname, '../dist/storybook');
// Storybook's own copy of the Cesium assets is left behind: its stories load
// them from the root-absolute /cesium path, which the website already serves
const cesiumAssets = resolve(source, 'cesium');

if (!existsSync(source)) {
	throw new Error(`Storybook has not been built, expected to find ${source}`);
}

rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, {
	recursive: true,
	filter: (path) => path !== cesiumAssets
});
