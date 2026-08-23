/// <reference types="vite/client" />

interface ImportMetaEnv {
	/**
	 * Cesium Ion access token, set in packages/storybook/.env. Optional - the
	 * stories fall back to offline imagery and no terrain without it. See
	 * .env.example
	 */
	readonly CESIUM_ION_ACCESS_TOKEN?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
