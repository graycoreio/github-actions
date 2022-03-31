# Deploy Angular Universal to Vercel GitHub Actions

A Github Action that deploys an Angular Universal application to Vercel

## Inputs

See the [action.yml](./action.yml)

## Usage

```yml
name: Deploy Angular Universal Application to Vercel
on:
  push:
    branches:
      - main

jobs:
  deploy:
    name: Deploy to Vercel
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v2
        with:
          name: your-browser-and-server-artifact
      - uses: graycoreio/github-actions/angular-universal-vercel@main
        with:
          prod: true
          vercel_token: ${{ secrets.VERCEL_TOKEN }}
          vercel_org: ${{ secrets.VERCEL_ORG }}
          vercel_project_id: ${{ secrets.VERCEL_PROJECT_ID }}
    
```
