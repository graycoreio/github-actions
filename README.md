# GitHub Actions

## Actions

Action Name                | Description                                                             | Version | Usage
-------------------------- | ----------------------------------------------------------------------- | ------- | -----------------------------------
Angular Universal (Vercel) | A Github Action that deploys an Angular Universal application to Vercel | 9+      | [Try me](#angular-universal-vercel)

### Angular Universal (Vercel)

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
      - uses: actions/checkout@v2
      - uses: graycore/github-actions/angular-universal-vercel@main
```
