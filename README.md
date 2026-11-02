# Graycore GitHub Actions

<div align="center">

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/graycoreio/github-actions)
[![Test](https://img.shields.io/github/actions/workflow/status/graycoreio/github-actions/test.yml?label=Test&labelColor=1a1a1a)](https://github.com/graycoreio/github-actions/actions/workflows/test.yml)
[![setup-node Test](https://img.shields.io/github/actions/workflow/status/graycoreio/github-actions/_internal-setup-node.yml?label=setup-node%20Test&labelColor=1a1a1a)](https://github.com/graycoreio/github-actions/actions/workflows/_internal-setup-node.yml)
[![LHCI Test](https://img.shields.io/github/actions/workflow/status/graycoreio/github-actions/_internal-lhci.yml?label=LHCI%20Test&labelColor=1a1a1a)](https://github.com/graycoreio/github-actions/actions/workflows/_internal-lhci.yml)

</div>

Opinionated Github Actions to make building, testing, and deploying Angular applications easier.

- [README if you are new to Github Actions.](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions#the-components-of-github-actions)
- [What is a workflow?](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions#workflows)
- [What is an action?](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions#actions)

## Actions

Each action is a building block you can drop into your own workflow. Reference it by path and pin it to a release tag:

```yaml
- uses: graycoreio/github-actions/setup-node@v2.6.0
```

### Build

| Action Name                                                     | Description                                                                                          |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [Setup Node](./setup-node)                                      | A Github Action that sets up Node and npm for Angular development, with dependency caching.          |
| [Set Versions From Root](./set-versions-from-root/README.md)    | A Github Action that sets package dependency versions from the versions defined in a monorepo root. |

### Test

| Action Name                                  | Description                                                                 |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| [Lighthouse CI](./lighthouse-ci/README.md)   | A Github Action that runs Lighthouse CI `autorun` against a web application. |

### Deploy

| Action Name                                                         | Description                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [Angular Universal (Vercel)](./angular-universal-vercel/README.md)  | A Github Action that deploys an Angular Universal (SSR) or static Angular application to Vercel. |
| [Angular Universal (Vercel) from Workflow Run](./angular-universal-vercel-wflw-run) | A Github Action that deploys an Angular Universal build artifact from another workflow run to Vercel. |
| [Vercel](./vercel)                                                  | A Github Action that deploys a static site to Vercel.                                            |
| [Upload Algolia Index](./upload-algolia-index/README.md)            | A Github Action that uploads a set of search indices to Algolia.                                 |
