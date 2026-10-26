import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { LocalServerNotReady, serverConfigToml, sha256Hex, startLocalServer } from './local';
import { Launcher } from './process';

describe('serverConfigToml', () => {
    const base = {
        storageAccount: 'acct',
        storageContainer: 'nx-cache-v1',
        storagePrefix: 'v1',
        tenantId: 'tenant',
        clientId: 'client',
        port: 40123,
        tokenSha256: 'abc123',
    };

    it('listens on loopback, uses workload identity storage and a single static token', () => {
        expect(serverConfigToml({ ...base, write: true })).toBe(
            [
                '[server]',
                'listen = "127.0.0.1:40123"',
                '[storage]',
                'type = "azure"',
                'account = "acct"',
                'container = "nx-cache-v1"',
                'prefix = "v1"',
                'auth = { mode = "workload_identity", tenant_id = "tenant", client_id = "client" }',
                '[[auth.providers]]',
                'type = "static"',
                'tokens = [{ name = "ci-job", sha256 = "abc123", scope = "read_write" }]',
                '',
            ].join('\n'),
        );
    });

    it('gives reader jobs a read-only token', () => {
        expect(serverConfigToml({ ...base, write: false })).toContain('scope = "read" }]');
    });

    it('escapes values instead of interpolating them raw', () => {
        const toml = serverConfigToml({ ...base, storagePrefix: 'a"b\\c\nd', write: false });
        expect(toml).toContain('prefix = "a\\"b\\\\c\\nd"');
    });
});

interface Started {
    command: string;
    args: string[];
    cwd: string;
    env: NodeJS.ProcessEnv;
    logFile: string;
}

function fakeLauncher(behaviour: { exited?: boolean; log?: string } = {}) {
    const started: Started[] = [];
    const stopped: number[] = [];
    const launcher: Launcher = {
        start(command, args, o) {
            started.push({ command, args, ...o });
            if (behaviour.log) fs.writeFileSync(o.logFile, behaviour.log);
            return { pid: 4242, exited: () => behaviour.exited ?? false };
        },
        stop: (pid) => void stopped.push(pid),
    };
    return { launcher, started, stopped };
}

const readyFetch = (async () => new Response('OK', { status: 200 })) as unknown as typeof fetch;
const noSleep = async () => undefined;
const port40000 = async () => 40000;

describe('startLocalServer', () => {
    let workDir: string;
    beforeEach(() => {
        workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-remote-cache-test-'));
    });
    afterEach(() => fs.rmSync(workDir, { recursive: true, force: true }));

    const options = (write: boolean, env: NodeJS.ProcessEnv = {}) => ({
        binary: '/opt/nx-remote-cache',
        storageAccount: 'acct',
        storageContainer: 'nx-cache-v1',
        storagePrefix: 'v1',
        tenantId: 'tenant',
        clientId: write ? 'writer' : 'reader',
        write,
        githubOidcToken: 'github-oidc-jwt',
        workDir,
        env,
    });

    it('starts the binary with the config and token file, and waits for /health', async () => {
        const { launcher, started } = fakeLauncher();
        const polled: string[] = [];
        const fetchImpl = (async (url: string) => {
            polled.push(url);
            return new Response('OK', { status: 200 });
        }) as unknown as typeof fetch;
        const server = await startLocalServer(options(true), { launcher, fetchImpl, sleep: noSleep, freePort: port40000 });
        expect(polled).toEqual(['http://127.0.0.1:40000/health']);

        expect(server).toEqual({
            url: 'http://127.0.0.1:40000',
            token: expect.stringMatching(/^[0-9a-f]{64}$/),
            pid: 4242,
            logFile: path.join(workDir, 'server.log'),
        });

        const [run] = started;
        expect(run.command).toBe('/opt/nx-remote-cache');
        expect(run.args).toEqual(['serve']);
        // Not the job's checkout, so no stray ./config.toml is picked up.
        expect(run.cwd).toBe(workDir);
        const config = run.env.NX_CACHE_CONFIG_TOML!;
        expect(config).toContain('listen = "127.0.0.1:40000"');
        // The server only ever sees the hash of the token Nx will present.
        expect(config).toContain(`sha256 = "${sha256Hex(server.token)}"`);
        expect(config).not.toContain(server.token);
        expect(config).toContain('client_id = "writer"');

        const tokenFile = path.join(workDir, 'github-oidc-token');
        expect(run.env.AZURE_FEDERATED_TOKEN_FILE).toBe(tokenFile);
        expect(fs.readFileSync(tokenFile, 'utf8')).toBe('github-oidc-jwt');
        expect(fs.statSync(tokenFile).mode & 0o777).toBe(0o600);
    });

    it("passes only the job variables the server needs, never config overrides", async () => {
        const { launcher, started } = fakeLauncher();
        await startLocalServer(
            options(false, {
                PATH: '/usr/bin',
                HTTPS_PROXY: 'http://proxy:3128',
                NX_CACHE__STORAGE__CONTAINER: 'elsewhere',
                ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'secret',
                INPUT_TENANT_ID: 'tenant',
            }),
            { launcher, fetchImpl: readyFetch, sleep: noSleep, freePort: port40000 },
        );
        expect(Object.keys(started[0].env).sort()).toEqual([
            'AZURE_FEDERATED_TOKEN_FILE',
            'HTTPS_PROXY',
            'NX_CACHE_CONFIG_TOML',
            'PATH',
        ]);
    });

    it('fails with the server log when the server exits (e.g. no storage access)', async () => {
        const { launcher, stopped } = fakeLauncher({ exited: true, log: 'ERROR storage is not usable: lacks role' });
        const error = await startLocalServer(options(false), { launcher, fetchImpl: readyFetch, sleep: noSleep, freePort: port40000 }).catch(
            (e) => e,
        );
        expect(error).toBeInstanceOf(LocalServerNotReady);
        expect(error.message).toContain('ERROR storage is not usable: lacks role');
        expect(stopped).toEqual([]);
    });

    it('stops the server if it never becomes ready', async () => {
        const { launcher, stopped } = fakeLauncher();
        const notReady = (async () => new Response('Service Unavailable', { status: 503 })) as unknown as typeof fetch;
        await expect(
            startLocalServer(options(false), { launcher, fetchImpl: notReady, sleep: noSleep, freePort: port40000, timeoutMs: 5 }),
        ).rejects.toBeInstanceOf(LocalServerNotReady);
        expect(stopped).toEqual([4242]);
    });
});
