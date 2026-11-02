# Set Versions From Root

A GitHub Action that sets package versions across a monorepo from the version in its root `package.json`.

Every package in a release is held at the same version. Run it after a build and immediately before a publish, against your built `package.json` files.

## Inputs

See the [action.yml](./action.yml)

| Input             | Description                                                                         | Required | Default                 |
| ----------------- | ----------------------------------------------------------------------------------- | -------- | ----------------------- |
| root-package-path | The path to the root `package.json` that holds the version.                         | false    | './package.json'        |
| package-glob      | A glob matching the `package.json` files to rewrite. `node_modules` is ignored.     | false    | 'dist/**/package.json'  |
| placeholder       | The version string used in your packages to mark a version that must be replaced.   | false    | '0.0.0-PLACEHOLDER'     |

## What it changes

For every `package.json` matched by `package-glob`:

1. Removes `devDependencies` and `scripts`, which are not needed in a published package.
2. Sets `version` to the root version.
3. Sets any `dependencies`, `peerDependencies`, and `optionalDependencies` that also appear in the root `package.json` to the root's version range for them.
4. Sets any `peerDependencies` and `optionalDependencies` on another package in the same release to exactly the root version, so the whole set moves in lock-step.
5. Fails if any dependency is still set to `placeholder`, so you never publish an unresolved version.

## Example

With a root `package.json` at `1.4.0` that depends on `@angular/core@^20.0.0`, this built package:

```json
{
  "name": "@my-org/cart",
  "version": "0.0.0-PLACEHOLDER",
  "peerDependencies": {
    "@angular/core": "0.0.0-PLACEHOLDER",
    "@my-org/core": "0.0.0-PLACEHOLDER"
  }
}
```

becomes:

```json
{
  "name": "@my-org/cart",
  "version": "1.4.0",
  "peerDependencies": {
    "@angular/core": "^20.0.0",
    "@my-org/core": "1.4.0"
  }
}
```

## Usage

```yml
name: Publish

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: graycoreio/github-actions/setup-node@v2.7.0 # x-release-please-version
        with:
          node-version: 24
          registry-url: https://registry.npmjs.org
      - run: npm run build
      - uses: graycoreio/github-actions/set-versions-from-root@v2.7.0 # x-release-please-version
      - run: for pkg in dist/*/; do npm publish "$pkg"; done
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
