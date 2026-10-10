# Contributing Guidelines

This document contains a set of guidelines to help developers during the contribution process.

## Development

### Download and install dependencies

This repository uses [pnpm](https://pnpm.io/) workspaces.

```bash
git clone git@github.com:watergis/terra-draw-cesium-adapter.git
cd terra-draw-cesium-adapter
pnpm install
```

When you download the repository first time, please also install `lefthook` by the following command.

```bash
pnpm lefthook install
```

It lints, checks the formatting and type checks the workspace before each commit, and builds the adapter and runs its unit tests before each push.

### Commands

| Command               | Description                                        |
| --------------------- | -------------------------------------------------- |
| `pnpm build`          | Build the adapter (ESM, CJS and type declarations) |
| `pnpm test`           | Run the adapter unit tests in Vitest               |
| `pnpm storybook`      | Run Storybook at http://localhost:6006             |
| `pnpm test:storybook` | Run every story as a browser test via Playwright   |
| `pnpm docs:dev`       | Run the website at http://localhost:5173           |
| `pnpm docs:build`     | Build the website, API docs and Storybook          |
| `pnpm lint`           | Lint the workspace                                 |
| `pnpm format`         | Format the workspace with Prettier                 |
| `pnpm typecheck`      | Type check every package                           |

### Storybook

The stories are both the examples and the browser test suite. Installing Playwright's Chromium and setting a Cesium Ion access token are covered in [`packages/storybook/README.md`](./packages/storybook/README.md).

### Website

The website bundles the demo, the API docs and Storybook. Building, previewing and deploying it are covered in [`docs/README.md`](./docs/README.md).

## Release packages

Releases are managed with [Changesets](https://github.com/changesets/changesets). Add a changeset alongside your change:

```bash
pnpm changeset
```

Merging to `main` opens (or updates) a release pull request; merging that publishes to npm via the `release.yml` workflow, which authenticates with npm through OIDC trusted publishing.

Only `packages/terra-draw-cesium-adapter` is published, so a changeset is only needed when the adapter itself changes. Storybook and the website are ignored by Changesets.

## How to make a pull request

1. [Fork the repo](https://help.github.com/articles/fork-a-repo) and create a branch for your new feature or bug fix.

2. Install NPM packages by `pnpm install && pnpm lefthook install`.

3. Run Storybook to check that the adapter's features work well. Run: `pnpm storybook`

4. Make sure you submit a change specific to exactly one issue. If you have ideas for multiple changes please create separate pull requests.

5. Make prettier pass. Run: `pnpm format`

6. Make eslint and the type check pass. Run: `pnpm lint && pnpm build && pnpm typecheck`

7. Make the tests pass. Run: `pnpm test && pnpm test:storybook`

8. If you have changed the adapter, add a changeset file by `pnpm changeset`

9. Commit local changes in git. Run: `git add . && git commit -m "precise commit message"`

10. Push local branch to your forked remote repository.

11. Push to your fork and [submit a pull request](https://help.github.com/articles/using-pull-requests). A button should appear on your fork its github page afterwards.
