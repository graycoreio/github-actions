# Lighthouse CI

A GitHub Action that runs [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) (`lhci autorun`) against a web application.

It collects Lighthouse reports, asserts them against your budgets, and uploads the results to a Lighthouse CI server, temporary public storage, or the filesystem.

> Requires an [LHCI configuration file](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md) (e.g. `.lighthouserc.js`) in your repository.

## Inputs

See the [action.yml](./action.yml)

| Input           | Description                                                                                                                        | Required | Default |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| target          | Where to upload results: `lhci`, `temporary-public-storage`, or `filesystem`.                                                      | true     |         |
| lhci_server_url | The URL of your Lighthouse CI server. Only used when `target` is `lhci`.                                                            | false    |         |
| lhci_token      | The build token used to authenticate with your Lighthouse CI server. Only used when `target` is `lhci`.                            | false    |         |
| domain          | A base domain, exposed to your config as `process.env.LIGHTHOUSE_DOMAIN`. See [Targeting a domain](#targeting-a-domain).            | false    |         |
| config_path     | The path to your LHCI configuration file. Defaults to LHCI's own lookup (`.lighthouserc.js`, `lighthouserc.json`, ...).            | false    |         |
| gh_token        | A GitHub token used to post Lighthouse status checks to pull requests.                                                              | false    |         |

## Targeting a domain

The `domain` input lets one config audit different environments, such as a pull request preview:

```js
// .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        `${process.env.LIGHTHOUSE_DOMAIN}/`,
        `${process.env.LIGHTHOUSE_DOMAIN}/products`,
      ],
    },
    assert: {
      preset: 'lighthouse:recommended',
    },
  },
};
```

## Usage

```yml
name: Lighthouse

on:
  pull_request:
    branches:
      - main

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: graycoreio/github-actions/lighthouse-ci@v2.7.0 # x-release-please-version
        with:
          target: lhci
          domain: https://www.example.com
          lhci_server_url: ${{ vars.LHCI_SERVER_URL }}
          lhci_token: ${{ secrets.LHCI_TOKEN }}
          gh_token: ${{ secrets.GITHUB_TOKEN }}
```
