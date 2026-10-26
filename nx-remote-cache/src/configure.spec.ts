import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ActionsCore, configure, LOG_STATE, LOG_VAR, PID_STATE, SERVER_VAR, TOKEN_VAR } from './configure';
import { Inputs, readInputs } from './inputs';
import { Launcher } from './process';

function fakeCore() {
    const exported: Record<string, string> = {};
    const state: Record<string, string> = {};
    const secrets: string[] = [];
    const notices: string[] = [];
    const audiences: (string | undefined)[] = [];
    const core: ActionsCore = {
        exportVariable: (name, value) => void (exported[name] = value),
        setSecret: (secret) => void secrets.push(secret),
        saveState: (name, value) => void (state[name] = value),
        notice: (message) => void notices.push(message),
        info: () => undefined,
        getIDToken: async (audience) => {
            audiences.push(audience);
            return 'github-oidc-jwt';
        },
    };
    return { core, exported, state, secrets, notices, audiences };
}

const inputs = (values: Record<string, string>): Inputs => readInputs((name) => values[name] ?? '');

const withToken = { ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.actions.example?x=1' };
const pushToDefault = { eventName: 'push', ref: 'refs/heads/main', defaultBranch: 'main' };
const pullRequest = { eventName: 'pull_request', ref: 'refs/pull/7/merge', defaultBranch: 'main' };

// Early exits and failures never start a server.
const noLauncher: Launcher = {
    start: () => {
        throw new Error('unexpected start');
    },
    stop: () => undefined,
};

describe('configure', () => {
    let runnerTemp: string;
    beforeEach(() => {
        runnerTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-temp-'));
    });
    afterEach(() => fs.rmSync(runnerTemp, { recursive: true, force: true }));

    const localInputs = {
        'tenant-id': 'tenant',
        'writer-client-id': 'writer',
        'reader-client-id': 'reader',
        'storage-account': 'acct',
        'storage-container': 'nx-cache-v1',
        version: 'v0.3.0',
        'github-token': 'gh-token',
    };

    it('installs and starts the server, points Nx at it and remembers it for the post step', async () => {
        const f = fakeCore();
        const installs: { version: string; token: string; dir: string }[] = [];
        const starts: { command: string; env: NodeJS.ProcessEnv }[] = [];
        const launcher: Launcher = {
            start: (command, _args, o) => {
                starts.push({ command, env: o.env });
                return { pid: 4242, exited: () => false };
            },
            stop: () => undefined,
        };
        const fetchImpl = (async () => new Response('OK', { status: 200 })) as unknown as typeof fetch;

        await configure(inputs(localInputs), {
            core: f.core,
            env: { ...withToken, RUNNER_TEMP: runnerTemp },
            launcher,
            fetchImpl,
            runContext: pullRequest,
            installServer: async (o) => {
                installs.push(o);
                return '/tools/nx-remote-cache';
            },
        });

        const workDir = path.join(runnerTemp, 'nx-remote-cache');
        expect(installs).toEqual([{ repo: 'graycoreio/nx-remote-cache', version: '0.3.0', token: 'gh-token', dir: workDir }]);
        expect(starts[0].command).toBe('/tools/nx-remote-cache');
        expect(f.exported[SERVER_VAR]).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
        expect(f.exported[TOKEN_VAR]).toMatch(/^[0-9a-f]{64}$/);
        expect(f.secrets).toEqual([f.exported[TOKEN_VAR]]);
        expect(f.state).toEqual({ [PID_STATE]: '4242', [LOG_STATE]: path.join(workDir, 'server.log') });
        expect(f.exported[LOG_VAR]).toBe(path.join(workDir, 'server.log'));
        // Reader job: reader identity, read-only token.
        const config = starts[0].env.NX_CACHE_CONFIG_TOML!;
        expect(config).toContain('client_id = "reader"');
        expect(config).toContain('scope = "read" }]');
        expect(fs.readFileSync(path.join(workDir, 'github-oidc-token'), 'utf8')).toBe('github-oidc-jwt');
    });

    it('without an OIDC token (fork PRs), leaves the cache off and starts nothing', async () => {
        const f = fakeCore();
        await configure(inputs(localInputs), { core: f.core, env: { RUNNER_TEMP: runnerTemp }, launcher: noLauncher });
        expect(f.exported).toEqual({});
        expect(f.notices[0]).toMatch(/remote cache disabled for this job/);
    });

    it('uses the writer identity and a read-write token for a push to the default branch', async () => {
        const f = fakeCore();
        const configs: string[] = [];
        const launcher: Launcher = {
            start: (_command, _args, o) => {
                configs.push(o.env.NX_CACHE_CONFIG_TOML!);
                return { pid: 1, exited: () => false };
            },
            stop: () => undefined,
        };
        const fetchImpl = (async () => new Response('OK', { status: 200 })) as unknown as typeof fetch;
        await configure(inputs(localInputs), {
            core: f.core,
            env: { ...withToken, RUNNER_TEMP: runnerTemp },
            launcher,
            fetchImpl,
            runContext: pushToDefault,
            installServer: async () => '/tools/nx-remote-cache',
        });
        expect(configs[0]).toContain('client_id = "writer"');
        expect(configs[0]).toContain('scope = "read_write" }]');
        // The token the server exchanges with Entra for the writer identity's storage token.
        expect(f.audiences).toEqual(['api://AzureADTokenExchange']);
    });

    it('runs server-binary instead of downloading a release', async () => {
        const f = fakeCore();
        const commands: string[] = [];
        const launcher: Launcher = {
            start: (command) => {
                commands.push(command);
                return { pid: 1, exited: () => false };
            },
            stop: () => undefined,
        };
        const fetchImpl = (async () => new Response('OK', { status: 200 })) as unknown as typeof fetch;
        const run = (serverBinary: string) =>
            configure(inputs({ ...localInputs, version: '', 'server-binary': serverBinary }), {
                core: f.core,
                env: { ...withToken, RUNNER_TEMP: runnerTemp },
                launcher,
                fetchImpl,
                runContext: pullRequest,
                cwd: '/home/runner/work/repo/repo',
                installServer: async () => {
                    throw new Error('unexpected download');
                },
            });
        await run('/build/nx-remote-cache');
        // Relative to the checkout, not to the server's own working directory.
        await run('./target/debug/nx-remote-cache');
        expect(commands).toEqual(['/build/nx-remote-cache', '/home/runner/work/repo/repo/target/debug/nx-remote-cache']);
    });

    it.each(['storage-account', 'storage-container', 'tenant-id', 'version'])('requires %s', async (missing) => {
        const f = fakeCore();
        await expect(
            configure(inputs({ ...localInputs, [missing]: '' }), {
                core: f.core,
                env: withToken,
                launcher: noLauncher,
                runContext: pullRequest,
            }),
        ).rejects.toThrow(`${missing} is required`);
    });
});
