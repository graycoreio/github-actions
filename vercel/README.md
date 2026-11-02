# Vercel Deploy

A GitHub Action that deploys a static site to Vercel.

It installs the [Vercel CLI](https://vercel.com/docs/cli) and runs `vercel` from the current working directory, as either a preview or a production deployment. Vercel builds the project using your project's settings.

> Deploying an Angular application? Use [Angular Universal (Vercel)](../angular-universal-vercel/README.md) instead.

## Inputs

See the [action.yml](./action.yml)

| Input             | Description                                                       | Required | Default |
| ----------------- | ----------------------------------------------------------------- | -------- | ------- |
| prod              | Whether to create a production deployment (`vercel --prod`).      | true     | 'false' |
| vercel_token      | A [Vercel access token](https://vercel.com/account/tokens).        | true     |         |
| vercel_org        | Your Vercel organization (team) ID.                                | true     |         |
| vercel_project_id | Your Vercel project ID.                                            | true     |         |

Your organization and project IDs are in `.vercel/project.json` after running `vercel link` locally.

## Usage

```yml
name: Deploy

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: graycoreio/github-actions/vercel@v2.7.0 # x-release-please-version
        with:
          prod: ${{ github.ref == 'refs/heads/main' }}
          vercel_token: ${{ secrets.VERCEL_TOKEN }}
          vercel_org: ${{ secrets.VERCEL_ORG }}
          vercel_project_id: ${{ secrets.VERCEL_PROJECT_ID }}
```
