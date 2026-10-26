# Nx Remote Cache

A GitHub Action that runs an [nx-remote-cache](https://github.com/graycoreio/nx-remote-cache) server inside the job and points the job's [Nx](https://nx.dev) runs at it. The server talks to Azure Blob Storage with the job's own identity: the job's GitHub OIDC token, exchanged for a writer or reader managed identity. No long-lived secrets and no hosted service are involved.

It exports the two variables Nx's built-in remote cache client reads:

- `NX_SELF_HOSTED_REMOTE_CACHE_SERVER`
- `NX_SELF_HOSTED_REMOTE_CACHE_ACCESS_TOKEN` (masked in logs)

Which jobs may write is decided in Azure: by which GitHub subjects can obtain the writer identity, and by the identities' roles on the container. Deploying that (`deploy/local.bicep`) and building the subjects are covered in the [nx-remote-cache README](https://github.com/graycoreio/nx-remote-cache#readme).

Runners: Linux (x64, arm64) and macOS.

## Usage

The values below are `local.bicep`'s outputs. None of them are secrets, so repository or organization **variables** are the natural place for them.

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
          tenant-id: ${{ vars.NX_CACHE_TENANT_ID }}
          writer-client-id: ${{ vars.NX_CACHE_WRITER_CLIENT_ID }}
          reader-client-id: ${{ vars.NX_CACHE_READER_CLIENT_ID }}
          storage-account: ${{ vars.NX_CACHE_STORAGE_ACCOUNT }}
          storage-container: ${{ vars.NX_CACHE_STORAGE_CONTAINER }}
      - run: npx nx affected -t build test lint
```

The action:
1. downloads the server binary for the runner from the [nx-remote-cache release](https://github.com/graycoreio/nx-remote-cache/releases) given by `version`, and checks it against the SHA-256 built into the action;
2. writes the job's GitHub OIDC token to a file;
3. starts the server in the background on `127.0.0.1` (a free port), configured with the writer or reader identity, which exchanges that token with Entra for a storage token;
4. waits until the server can reach storage;
5. points Nx at it with a token generated for this job.

Writes are only possible with the writer identity, which holds Storage Blob Data Contributor on the container. The reader holds Storage Blob Data Reader, so even a server configured as writable can't write with it.

### Reusable workflows

In a reusable workflow (`workflow_call`), the OIDC token is minted in the *caller's* context. If the caller declares `permissions`, it has to grant `id-token: write` as well.

## Inputs

| Input | Default | |
|---|---|---|
| `access` | `auto` | Which identity to ask for. `auto` asks for the writer only on a push to the repository's default branch, and the reader otherwise; `read` and `write` force one. This only *selects*; Azure decides what is granted. |
| `tenant-id` | | Directory (tenant) id. |
| `writer-client-id` | | Client id of the writer managed identity. |
| `reader-client-id` | | Client id of the reader managed identity. |
| `storage-account` | | Storage account name. |
| `storage-container` | | Blob container holding the cache. |
| `storage-prefix` | `v1` | Virtual directory for entries inside the container. |
| `version` | `0.4.0` | Server release to run. Only versions whose checksums are built into the action can run; see [Server releases](#server-releases). |
| `server-binary` | | Path to a server binary to run instead of downloading `version`, relative to the job's working directory. For testing the server itself (its E2E workflow runs the binary built from the commit); not checked against any checksum. |
| `server-repo` | `graycoreio/nx-remote-cache` | Repository whose releases hold the server, e.g. a private copy. Checksums are still checked against the action's table. |
| `github-token` | `github.token` | Downloads the server release; needs read access to `server-repo`. The job's own token is enough while that repo is public. |

## Behaviour

### Jobs without a token

Fork pull requests get no OIDC token, and neither does a job without `id-token: write`. The server would have nothing to reach storage with, so the action exports nothing, and the job runs without a remote cache.

It never points Nx at a server that isn't ready. Nx treats an unreachable cache or a `401` as fatal and fails the whole run, even after every task succeeded.

### When something fails

- **The identity exchange is refused:** the server can't start, and the step fails with the server's log, which includes Entra's message with the OIDC subject GitHub presented (e.g. `AADSTS700213: No matching federated identity record found for presented assertion subject '…'`). Compare that against the identity's federated credentials.
- **The server can't use storage** (missing role assignment, wrong container): the step fails with the server's log too.
- **The release can't be downloaded or doesn't match its checksum:** the step fails with the reason.

The action exports the variables only once the server is ready. Adding `continue-on-error: true` to the step therefore turns a failure into "no remote cache for this job" instead of a failed job. That suits triggers that can't match a federated credential, such as tag pushes and releases, whose subject changes with every tag.

### The server process

- The server runs in the background until the job ends; `NX_REMOTE_CACHE_LOG` holds the path of its log. The action's post step then stops it and prints the log in a collapsed group, so nothing is left running on self-hosted runners either.
- The server gets only the environment it needs (`PATH`, `HOME`, `TMPDIR`, proxy and CA certificate variables) and runs in its own directory, so neither the job's variables (e.g. `NX_CACHE__*` overrides) nor a `config.toml` in the checkout change its config.
- The storage credential lives on the runner, so code in the job could use it directly. That's why the identities' storage roles, not the server, are the boundary: only jobs whose OIDC subject matches the writer's federated credentials can write at all.
- The server's no-overwrite rule (`409`) applies to everything that goes through it, but a job holding the writer identity could write to storage directly. The server README's [Security model](https://github.com/graycoreio/nx-remote-cache#security-model) covers that, and immutable storage as a mitigation.

## Development

The action is TypeScript (`src/`), bundled by esbuild into `dist/main.js` (the step) and `dist/post.js` (cleanup). `dist/` is committed, because GitHub runs it as is.

```sh
npm ci          # at the repository root: shared dev dependencies
cd nx-remote-cache
npm test        # Jest unit tests (src/*.spec.ts)
npm run build   # rebuild dist/ and type-check; commit dist/ with your change
```

### Server releases

The action only runs server releases listed in `RELEASE_CHECKSUMS` ([`src/release.ts`](src/release.ts)), so a replaced or tampered release asset is refused. To support a new server release:

1. Print its checksums: `gh release download v<version> -R graycoreio/nx-remote-cache -p SHA256SUMS -O -`
2. Add its lines under `<version>` in `RELEASE_CHECKSUMS`. (Releases up to 0.3.x also list `nx-remote-cache-mint-*` archives; the action doesn't use them.)
3. Optionally make it the `version` default in `action.yml` and the README.
4. `npm run build` and commit.

## Testing

[CI](../.github/workflows/_internal-nx-remote-cache.yml) runs the unit tests, checks that the committed `dist/` matches the source, and runs the action without an OIDC token. The action is tested end to end against Azure, including that the reader identity can't write even through a server configured as writable, by the [nx-remote-cache E2E workflow](https://github.com/graycoreio/nx-remote-cache/blob/main/.github/workflows/e2e.yml).
