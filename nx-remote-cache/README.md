# Nx Remote Cache

A GitHub Action that connects a job's [Nx](https://nx.dev) runs to an [nx-remote-cache](https://github.com/graycoreio/nx-remote-cache).

It exchanges the job's GitHub OIDC token, so no long-lived secrets are involved, and exports the two variables Nx's built-in remote cache client reads:

- `NX_SELF_HOSTED_REMOTE_CACHE_SERVER`
- `NX_SELF_HOSTED_REMOTE_CACHE_ACCESS_TOKEN` (masked in logs)

It has two modes:

| | `mode: remote` | `mode: local` |
|---|---|---|
| Server | Hosted (Azure Container Apps, `deploy/hosted.bicep`) | Started by this action inside the job, as a container |
| Infrastructure | Container App, Entra app registration, storage, CI identities | Storage and CI identities only (`deploy/local.bicep`) |
| Who decides read/write | The server, from the Entra token's roles | Azure Storage, from the identity's role on the container |
| Runners | Any | Linux (needs Docker) |

Either way, which jobs may write is decided in Azure (federated credentials and role assignments), not by this action. Deployment and building the OIDC subjects are covered in the [nx-remote-cache README](https://github.com/graycoreio/nx-remote-cache#readme).

## Usage

The values below are deployment outputs. None of them are secrets, so repository or organization **variables** are the natural place for them.

### `mode: local` (no hosted server)

```yaml
permissions:
  id-token: write   # required: the action requests a GitHub OIDC token
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: graycoreio/github-actions/nx-remote-cache@main
        with:
          mode: local
          tenant-id: ${{ vars.NX_CACHE_TENANT_ID }}
          writer-client-id: ${{ vars.NX_CACHE_WRITER_CLIENT_ID }}
          reader-client-id: ${{ vars.NX_CACHE_READER_CLIENT_ID }}
          storage-account: ${{ vars.NX_CACHE_STORAGE_ACCOUNT }}
          storage-container: ${{ vars.NX_CACHE_STORAGE_CONTAINER }}
      - run: npx nx affected -t build test lint
```

The action:
1. writes the job's GitHub OIDC token to a file;
2. starts the server image on `127.0.0.1` (a random port), configured with the writer or reader identity, which exchanges that token with Entra for a storage token;
3. waits until the server can reach storage;
4. points Nx at it with a token generated for this job.

Writes are only possible with the writer identity, which holds Storage Blob Data Contributor on the container. The reader holds Storage Blob Data Reader, so even a server configured as writable can't write with it.

### `mode: remote` (hosted server)

```yaml
      - uses: graycoreio/github-actions/nx-remote-cache@main
        with:
          server-url: ${{ vars.NX_CACHE_URL }}
          tenant-id: ${{ vars.NX_CACHE_TENANT_ID }}
          api-scope: ${{ vars.NX_CACHE_API_SCOPE }}
          writer-client-id: ${{ vars.NX_CACHE_WRITER_CLIENT_ID }}
          reader-client-id: ${{ vars.NX_CACHE_READER_CLIENT_ID }}
```

### Reusable workflows

In a reusable workflow (`workflow_call`), the OIDC token is minted in the *caller's* context. If the caller declares `permissions`, it has to grant `id-token: write` as well.

## Inputs

| Input | Default | Mode | |
|---|---|---|---|
| `mode` | `remote` | | `remote` or `local`. |
| `access` | `auto` | both | Which identity to ask for. `auto` asks for the writer only on a push to the repository's default branch, and the reader otherwise; `read` and `write` force one. This only *selects*; Azure decides what is granted. |
| `tenant-id` | | both | Directory (tenant) id. |
| `writer-client-id` | | both | Client id of the writer managed identity. |
| `reader-client-id` | | both | Client id of the reader managed identity. |
| `storage-account` | | local | Storage account name. |
| `storage-container` | | local | Blob container holding the cache. |
| `storage-prefix` | `v1` | local | Virtual directory for entries inside the container. |
| `image` | `ghcr.io/graycoreio/nx-remote-cache:0.2.0` | local | Server image to run. |
| `server-url` | | remote | Base URL of the cache server. A trailing slash is fine. |
| `provider` | `entra` | remote | `entra`: Entra ID issues the token. `mint`: the server's own `POST /v1/token/github` (server built with `--features mint`). |
| `api-scope` | | remote (entra) | Scope of the cache API, e.g. `api://<tenant id>/<namePrefix>/.default`. |
| `github-audience` | `server-url` | remote (mint) | Audience the server expects on the GitHub OIDC token. |
| `anonymous-read` | `false` | remote | Set to `true` only if the server enables anonymous reads. This input grants nothing; it tells the action the server allows it. See [Jobs without a token](#jobs-without-a-token). |

## Behaviour

### Jobs without a token

Fork pull requests get no OIDC token, and neither does a job without `id-token: write`.
- In remote mode with `anonymous-read: true`, the action exports only the server URL, so Nx reads the cache anonymously. Anonymous read is a server setting, and it applies to everyone who can reach the server, not only CI; see [the server's notes on it](https://github.com/graycoreio/nx-remote-cache#anonymous-read).
- Otherwise, including always in local mode (a local server has nothing to reach storage with), it exports nothing, and the job runs without a remote cache.

It never points Nx at a server without credentials the server will accept. Nx treats a `401` from the cache as fatal and fails the whole run, even after every task succeeded.

### When the exchange fails

If a token request is refused, the step fails with the service's own error message. For Entra this includes the OIDC subject GitHub presented (e.g. `AADSTS700213: No matching federated identity record found for presented assertion subject '…'`), which is what to compare against the federated credentials. In local mode, a server that can't reach storage fails the step and prints the server's log.

The action exports the server URL only once everything is ready. Adding `continue-on-error: true` to the step therefore turns a failure into "no remote cache for this job" instead of a failed job. That suits triggers that can't match a federated credential, such as tag pushes and releases, whose subject changes with every tag.

### Token lifetime

Entra tokens for the CI managed identities have been observed to last about 24 hours, so expiry within a job is unlikely. In remote mode an expired token gets a `401`, and Nx then fails the run.

### Local mode specifics

- The server container keeps running until the job ends; `NX_REMOTE_CACHE_CONTAINER` holds its name, e.g. for `docker logs`. On self-hosted runners, remove it yourself.
- The storage credential lives on the runner, so code in the job could use it directly. That's why the identities' storage roles, not the server, are the boundary: only jobs whose OIDC subject matches the writer's federated credentials can write at all.
- The server's no-overwrite rule (`409`) applies to everything that goes through it, but a job holding the writer identity could write to storage directly.

## Testing

[CI](../.github/workflows/_internal-nx-remote-cache.yml) shellchecks the action's script and runs the action without an OIDC token, with and without `anonymous-read`. Both modes are tested end to end against Azure, including that the reader identity can't write even through a server configured as writable, by the [nx-remote-cache E2E workflow](https://github.com/graycoreio/nx-remote-cache/blob/main/.github/workflows/e2e.yml).
