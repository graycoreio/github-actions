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
