# Lighthouse CI Action

A GitHub Action to run Lighthouse CI (`lhci autorun`) against a target web application.

## 🚀 Features
- Automates Lighthouse audits for your web application.
- Supports custom Lighthouse CI servers.
- :warning: Requires usage of an [LHCI configuration file](https://github.com/GoogleChrome/lighthouse-ci/blob/v0.14.0/docs/configuration.md).

## 📌 Inputs

| Name              | Description                                           | Default                   |
| ----------------- | ----------------------------------------------------- | ------------------------- |
| `domain`          | The domain you would like to target.                  | `https://www.example.com` |
| `lhci_server_url` | The server URL of your Lighthouse CI server.          | N/A                       |
| `lhci_token`      | The token used to authenticate with your LHCI server. | N/A                       |

## 🔧 Usage

To use this action in your GitHub workflow:

```yaml
yaml
name: Run Lighthouse CI
on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Run Lighthouse CI Action
        uses: graycoreio/github-actions/lighthouse-ci@main
        with:
          domain: "https://yourwebsite.com"
          lhci_server_url: "https://your-lhci-server.com"
          lhci_token: "your-secret-token"
```


## 🛠️ Troubleshooting

If you encounter any issues, please [open an issue](https://github.com/graycore/github-actions/issues).

---

💡 **Pro Tip:** You can integrate this action with GitHub Pages, Next.js, or any other static site framework to ensure optimal performance over time!

