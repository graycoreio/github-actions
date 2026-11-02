# Angular Universal (Vercel) from Workflow Run

A GitHub Action that deploys an Angular application, built by a different workflow run, to Vercel.

Use it in a workflow triggered by [`workflow_run`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_run). It downloads a named artifact from the triggering run, unzips it into the workspace, and deploys it with [Angular Universal (Vercel)](../angular-universal-vercel/README.md).

This split is the recommended way to deploy previews for pull requests from forks: the build runs without secrets, and only this trusted workflow has access to your Vercel token.

## Inputs

See the [action.yml](./action.yml)

| Input             | Description                                                                                      | Required | Default        |
| ----------------- | ------------------------------------------------------------------------------------------------ | -------- | -------------- |
| artifact          | The name of the artifact uploaded by the triggering workflow run.                                | true     |                |
| artifact-zip-name | The name of a zip file stored inside the artifact, if you upload your build as a zip.           | false    |                |
| vercel-token      | A [Vercel access token](https://vercel.com/account/tokens).                                       | true     |                |
| vercel-org        | Your Vercel organization (team) ID.                                                               | true     |                |
| vercel-project-id | Your Vercel project ID.                                                                           | true     |                |
| ng-version        | Your Angular major version, e.g. `20`.                                                            | false    | '19'           |
| ng-ssr-engine     | Your SSR engine: `CommonEngine` or `AngularNodeAppEngine`.                                        | false    | 'CommonEngine' |

## Outputs

| Output | Description                         |
| ------ | ----------------------------------- |
| url    | The URL of the Vercel deployment.   |

## Usage

The build workflow uploads the Angular build output as an artifact:

```yml
name: Build

on:
  pull_request:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: graycoreio/github-actions/setup-node@v2.7.0 # x-release-please-version
        with:
          node-version: 24
      - run: npx ng build
      - run: cd dist/my-app && zip -r ../../app.zip .
      - uses: actions/upload-artifact@v4
        with:
          name: app
          path: app.zip
```

The deploy workflow runs after it, with access to secrets:

```yml
name: Deploy Preview

on:
  workflow_run:
    workflows: [Build]
    types: [completed]

jobs:
  deploy:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    permissions:
      actions: read
    steps:
      - uses: graycoreio/github-actions/angular-universal-vercel-wflw-run@v2.7.0 # x-release-please-version
        id: deploy
        with:
          artifact: app
          artifact-zip-name: app.zip
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org: ${{ secrets.VERCEL_ORG }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          ng-version: 20
      - run: echo "Deployed to ${{ steps.deploy.outputs.url }}"
```
