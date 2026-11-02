# Setup Node

A GitHub Action that sets up Node and npm for Angular development, with dependency caching built in.

It wraps [`actions/setup-node`](https://github.com/actions/setup-node), optionally pins an npm version, caches dependencies keyed on your OS, Node version, npm version and `package-lock.json`, and runs `npm ci`.

## Inputs

See the [action.yml](./action.yml)

| Input             | Description                                                                                                                                                       | Required | Default |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| node-version      | The version of Node to install, passed to `actions/setup-node`.                                                                                                   | true     |         |
| npm-version       | The version of npm to install globally. Leave empty to use the npm bundled with Node.                                                                             | false    | ''      |
| use-stamp-cache   | Whether to cache `node_modules` itself instead of the npm cache. See [Stamp cache](#stamp-cache).                                                                | false    | 'false' |
| registry-url      | A registry to configure for auth, passed to `actions/setup-node`. The auth token is read from `env.NODE_AUTH_TOKEN`.                                              | false    |         |
| working-directory | The directory containing your `package.json`.                                                                                                                    | false    | '.'     |
| install           | Whether to run `npm ci`.                                                                                                                                          | false    | 'true'  |

## Caching

There are two caching strategies.

### npm cache (default)

The npm download cache (`npm config get cache`) is restored and saved. `npm ci --prefer-offline` always runs, so `node_modules` is rebuilt from the cache every time. This is the safest option.

### Stamp cache

With `use-stamp-cache: 'true'`, `node_modules` in your `working-directory` is cached directly. On an exact cache hit, `npm ci` is skipped entirely, and stale Angular and Nx build caches (`node_modules/.cache`, `.ng-packagr-ngcc`, `.cli-ngcc`) are cleared. This is much faster for large Angular workspaces, but relies on `node_modules` being fully reproducible from `package-lock.json`.

> [!WARNING]
> The stamp cache trades correctness guarantees for speed. On a cache hit, nothing is installed, so whatever is in the cached `node_modules` is what your job runs against. Understand these limitations before enabling it:
>
> - **Only `package-lock.json` invalidates the cache.** The key is built from the OS, the `node-version` and `npm-version` inputs, and a hash of every `package-lock.json` in the repository. Changes to `.npmrc`, `patch-package` patches, install scripts, or anything else that affects the install will not produce a fresh `node_modules`.
> - **Install scripts do not run on a hit.** `preinstall`, `postinstall`, and `prepare` scripts (yours and your dependencies') are skipped. Anything they generate outside `node_modules` will be missing.
> - **Native modules can break.** The key includes `runner.os` but not the CPU architecture, so x64 and arm64 runners share a cache entry. The key also uses the `node-version` input as written, so `node-version: 24` keeps reusing binaries built against an older 24.x release.
> - **Only `<working-directory>/node_modules` is cached.** In npm workspaces or other monorepos with nested `node_modules` folders, those folders are not cached, and on a hit they will be missing.
> - **Partial matches are slower than no cache.** On a restore-key (non-exact) hit, a stale `node_modules` is restored and then deleted by `npm ci`, so you pay for both the download and the full install.
> - **The caches are large.** A `node_modules` entry is usually far bigger than the npm cache, and counts against your repository's GitHub Actions cache storage limit, so other caches may be evicted sooner.

### `pull_request_target`

On `pull_request_target` events, the cache is only restored, never saved, so untrusted pull requests cannot poison the cache used by your trusted branches.

## Usage

```yml
name: Test

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: graycoreio/github-actions/setup-node@v2.7.0 # x-release-please-version
        with:
          node-version: 24
          use-stamp-cache: 'true'
      - run: npm test
```

### Private registry

```yml
- uses: graycoreio/github-actions/setup-node@v2.7.0 # x-release-please-version
  with:
    node-version: 24
    registry-url: https://npm.pkg.github.com
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
