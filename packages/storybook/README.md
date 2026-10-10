# Storybook

Storybook examples for [`@watergis/terra-draw-cesium-adapter`](../terra-draw-cesium-adapter), which double as the browser test suite.

## Commands

Run these from the repository root.

| Command                | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `pnpm storybook`       | Run Storybook at http://localhost:6006           |
| `pnpm test:storybook`  | Run every story as a browser test via Playwright |
| `pnpm storybook:build` | Build Storybook to `storybook-static`            |

## Browser tests

Storybook needs Playwright's Chromium the first time you run the browser tests:

```bash
pnpm --filter terra-draw-cesium-adapter-storybook exec playwright install chromium
```

## Cesium Ion access token

The stories use Cesium's bundled offline Natural Earth II imagery, so no Cesium Ion access token is needed.

That offline texture has no detail left at the zoom levels the stories draw at, though. Setting a token switches every story over to Cesium World Imagery, and additionally renders Cesium World Terrain in the terrain stories, which is what you want when checking drawing on tilted, mountainous ground. Copy [`.env.example`](./.env.example) to `.env` and fill in `CESIUM_ION_ACCESS_TOKEN`:

```bash
cp packages/storybook/.env.example packages/storybook/.env
```

Without a token everything falls back to the offline flat globe, which is how CI runs the stories.

## Acknowledgements

The Storybook harness under `src/common` is adapted from the [Terra Draw](https://github.com/JamesLMilner/terra-draw) repository, MIT licensed, Copyright (c) James Milner. A copy of that license is included at [`LICENSE`](./LICENSE).
