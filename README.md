# GitHub Actions

## Actions

Action Name                                               | Description
--------------------------------------------------------- | -----------------------------------------------------------------------
[Angular Universal (Vercel)]((#angular-universal-vercel)) | A Github Action that deploys an Angular Universal application to Vercel

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
