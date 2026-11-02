# Angular Universal (Vercel)

A GitHub Action that deploys a prebuilt Angular application to Vercel, either server-side rendered (SSR) as a serverless function or as a fully static site.

You build your app; this action supplies the Vercel configuration and serverless entrypoint that match your Angular version and SSR engine, then deploys it with the Vercel CLI.

## Inputs

See the [action.yml](./action.yml)

| Input             | Description                                                                                                  | Required | Default        |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | -------- | -------------- |
| prod              | Whether to create a production deployment.                                                                   | false    | 'false'        |
| vercel_token      | A [Vercel access token](https://vercel.com/account/tokens).                                                   | true     |                |
| vercel_org        | Your Vercel organization (team) ID.                                                                           | true     |                |
| vercel_project_id | Your Vercel project ID.                                                                                       | true     |                |
| ng_version        | Your Angular major version, e.g. `20`. Selects the serverless entrypoint. See [Angular versions](#angular-versions). | false    | '19'           |
| ng_ssr_engine     | Your SSR engine: `CommonEngine` or `AngularNodeAppEngine`. Ignored when `ng_output_mode` is `static`.         | false    | 'CommonEngine' |
| ng_output_mode    | Your Angular application builder `outputMode`: `server` or `static`. See [Output modes](#output-modes).       | false    | 'server'       |

## Outputs

| Output | Description                         |
| ------ | ----------------------------------- |
| url    | The URL of the Vercel deployment.   |

## Output modes

The action deploys the contents of `$GITHUB_WORKSPACE`, which must be your Angular build output (the folder containing `browser/` and, for SSR, `server/`).

- `server` - Deploys `browser/` as static assets and `server/` as a Vercel serverless function that handles every route without a file extension.
- `static` - Deploys the prerendered `browser/` directory through the [Vercel Build Output API](https://vercel.com/docs/build-output-api/v3) with no serverless function. Unknown routes serve `index.csr.html` with a 404 status.

## Angular versions

| `ng_version` | Server entrypoint                 | Notes                                                                                   |
| ------------ | --------------------------------- | --------------------------------------------------------------------------------------- |
| 20+          | `server/server.mjs`               | `CommonEngine` uses `app()`; `AngularNodeAppEngine` uses the exported `reqHandler`.     |
| 17 - 19      | `server/server.mjs`               | Uses `app()`.                                                                            |
| 16 and below | `server/main.js`                  | Uses `app()`.                                                                            |

## Usage

```yml
name: Deploy

on:
  push:
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
      - uses: actions/upload-artifact@v4
        with:
          name: app
          path: dist/my-app

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: app
      - uses: graycoreio/github-actions/angular-universal-vercel@v2.7.0 # x-release-please-version
        id: deploy
        with:
          prod: true
          vercel_token: ${{ secrets.VERCEL_TOKEN }}
          vercel_org: ${{ secrets.VERCEL_ORG }}
          vercel_project_id: ${{ secrets.VERCEL_PROJECT_ID }}
          ng_version: 20
          ng_ssr_engine: AngularNodeAppEngine
      - run: echo "Deployed to ${{ steps.deploy.outputs.url }}"
```

### Static site

```yml
- uses: graycoreio/github-actions/angular-universal-vercel@v2.7.0 # x-release-please-version
  with:
    vercel_token: ${{ secrets.VERCEL_TOKEN }}
    vercel_org: ${{ secrets.VERCEL_ORG }}
    vercel_project_id: ${{ secrets.VERCEL_PROJECT_ID }}
    ng_output_mode: static
```
