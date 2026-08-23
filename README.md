# terra-draw-cesium-adapter

Monorepo for [`@watergis/terra-draw-cesium-adapter`](./packages/terra-draw-cesium-adapter), a [Terra Draw](https://github.com/JamesLMilner/terra-draw) adapter for [CesiumJS](https://github.com/CesiumGS/cesium).

See the [package README](./packages/terra-draw-cesium-adapter/README.md) for installation and usage.

## Packages

| Package                                                                      | Description                                                |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [`packages/terra-draw-cesium-adapter`](./packages/terra-draw-cesium-adapter) | The published adapter                                      |
| [`packages/storybook`](./packages/storybook)                                 | Storybook examples, which double as the browser test suite |

## Development

This repository uses [pnpm](https://pnpm.io/) workspaces.

```bash
pnpm install
```

| Command               | Description                                        |
| --------------------- | -------------------------------------------------- |
| `pnpm build`          | Build the adapter (ESM, CJS and type declarations) |
| `pnpm test`           | Run the adapter unit tests in Vitest               |
| `pnpm storybook`      | Run Storybook at http://localhost:6006             |
| `pnpm test:storybook` | Run every story as a browser test via Playwright   |
| `pnpm lint`           | Lint the workspace                                 |
| `pnpm format`         | Format the workspace with Prettier                 |
| `pnpm typecheck`      | Type check every package                           |

Storybook needs Playwright's Chromium the first time you run the browser tests:

```bash
pnpm --filter terra-draw-cesium-adapter-storybook exec playwright install chromium
```

The stories use Cesium's bundled offline Natural Earth II imagery, so no Cesium Ion access token is needed.

That offline texture has no detail left at the zoom levels the stories draw at, though. Setting a token switches every story over to Cesium World Imagery, and additionally renders Cesium World Terrain in the terrain stories, which is what you want when checking drawing on tilted, mountainous ground. Copy [`packages/storybook/.env.example`](./packages/storybook/.env.example) to `packages/storybook/.env` and fill in `CESIUM_ION_ACCESS_TOKEN`:

```bash
cp packages/storybook/.env.example packages/storybook/.env
```

Without a token everything falls back to the offline flat globe, which is how CI runs the stories.

## Releasing

Releases are managed with [Changesets](https://github.com/changesets/changesets). Add a changeset alongside your change:

```bash
pnpm changeset
```

Merging to `main` opens (or updates) a release pull request; merging that publishes to npm via the `release.yml` workflow, which authenticates with npm through OIDC trusted publishing.

## Acknowledgements

The Storybook harness under `packages/storybook/src/common` is adapted from the [Terra Draw](https://github.com/JamesLMilner/terra-draw) repository, MIT licensed, Copyright (c) James Milner. A copy of that license is included at [`packages/storybook/LICENSE`](./packages/storybook/LICENSE).

## License

MIT
