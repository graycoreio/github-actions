import { createHash, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';

import { Fetch } from './http';
import { Launcher } from './process';

export interface LocalServerOptions {
    /** Path to the server binary. */
    binary: string;
    storageAccount: string;
    storageContainer: string;
    storagePrefix: string;
    tenantId: string;
    clientId: string;
    write: boolean;
    /** The job's GitHub OIDC token (audience api://AzureADTokenExchange). */
    githubOidcToken: string;
    /** Directory for the token file and the server's log; also its working directory. */
    workDir: string;
    /** The job's environment; the server gets only the parts listed in PASSED_ENV. */
    env: NodeJS.ProcessEnv;
}

export interface LocalServer {
    url: string;
    token: string;
    pid: number;
    logFile: string;
}

export interface LocalServerDeps {
    launcher: Launcher;
    fetchImpl?: Fetch;
    sleep?: (ms: number) => Promise<void>;
    freePort?: () => Promise<number>;
    /** How long to wait for the server to become ready. */
    timeoutMs?: number;
}

/**
 * What the server inherits from the job: enough to run and reach Azure (proxies, CA
 * certificates), but not the job's other variables. NX_CACHE__* overrides in particular would
 * change its config.
 */
const PASSED_ENV = [
    'PATH', 'HOME', 'TMPDIR',
    'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'no_proxy',
    'SSL_CERT_FILE', 'SSL_CERT_DIR',
];

/** A TOML basic string. JSON string escaping is a subset of TOML's, so this is always valid. */
function tomlString(value: string): string {
    return JSON.stringify(value);
}

/**
 * The server's config. The server exchanges the GitHub OIDC token in its token file with Entra
 * for a storage token of the chosen identity (workload identity), so what the job can do in
 * storage is that identity's role on the container, enforced by Azure. Nx authenticates to the server
 * with a token made up for this job; its scope makes uploads from reader jobs a clean 403
 * (which Nx skips) rather than a storage error.
 */
export function serverConfigToml(o: {
    storageAccount: string;
    storageContainer: string;
    storagePrefix: string;
    tenantId: string;
    clientId: string;
    port: number;
    tokenSha256: string;
    write: boolean;
}): string {
    return [
        '[server]',
        `listen = ${tomlString(`127.0.0.1:${o.port}`)}`,
        '[storage]',
        'type = "azure"',
        `account = ${tomlString(o.storageAccount)}`,
        `container = ${tomlString(o.storageContainer)}`,
        `prefix = ${tomlString(o.storagePrefix)}`,
        `auth = { mode = "workload_identity", tenant_id = ${tomlString(o.tenantId)}, client_id = ${tomlString(o.clientId)} }`,
        '[[auth.providers]]',
        'type = "static"',
        `tokens = [{ name = "ci-job", sha256 = ${tomlString(o.tokenSha256)}, scope = ${tomlString(o.write ? 'read_write' : 'read')} }]`,
        '',
    ].join('\n');
}

export function sha256Hex(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

/** Starts the server on 127.0.0.1 (a free port) and waits until it can reach storage. */
export async function startLocalServer(o: LocalServerOptions, deps: LocalServerDeps): Promise<LocalServer> {
    const {
        launcher,
        fetchImpl = fetch,
        sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
        freePort = findFreePort,
    } = deps;
    const timeoutMs = deps.timeoutMs ?? 60_000;

    fs.mkdirSync(o.workDir, { recursive: true });
    const tokenFile = path.join(o.workDir, 'github-oidc-token');
    fs.writeFileSync(tokenFile, o.githubOidcToken, { mode: 0o600 });
    const logFile = path.join(o.workDir, 'server.log');

    const token = randomBytes(32).toString('hex');
    const port = await freePort();
    const env: NodeJS.ProcessEnv = {};
    for (const name of PASSED_ENV) {
        if (o.env[name] !== undefined) env[name] = o.env[name];
    }
    env.NX_CACHE_CONFIG_TOML = serverConfigToml({ ...o, port, tokenSha256: sha256Hex(token) });
    env.AZURE_FEDERATED_TOKEN_FILE = tokenFile;

    // The work dir as cwd, so a config.toml in the job's checkout can't leak into the config.
    const server = launcher.start(o.binary, ['serve'], { cwd: o.workDir, env, logFile });

    const url = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline && !server.exited()) {
        try {
            // The server checks storage before it listens, so answering at all means it's usable.
            if ((await fetchImpl(`${url}/health`)).ok) {
                return { url, token, pid: server.pid, logFile };
            }
        } catch {
            // not listening yet
        }
        await sleep(500);
    }

    // It exits by itself at startup when it can't use storage; on a timeout, stop it.
    if (!server.exited()) launcher.stop(server.pid);
    throw new LocalServerNotReady(readLog(logFile));
}

/** The server's log, or why it can't be read. */
export function readLog(logFile: string): string {
    try {
        return fs.readFileSync(logFile, 'utf8');
    } catch (e) {
        return `(could not read ${logFile}: ${e instanceof Error ? e.message : e})`;
    }
}

function findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const probe = net.createServer();
        probe.once('error', reject);
        probe.listen(0, '127.0.0.1', () => {
            const { port } = probe.address() as net.AddressInfo;
            probe.close(() => resolve(port));
        });
    });
}

export class LocalServerNotReady extends Error {
    constructor(readonly log: string) {
        super(`the local nx-remote-cache server did not become ready; its log:\n${tail(log, 30)}`);
    }
}

function tail(text: string, lines: number): string {
    return text.trimEnd().split('\n').slice(-lines).join('\n');
}
