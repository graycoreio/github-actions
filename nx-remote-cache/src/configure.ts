import * as os from 'os';
import * as path from 'path';

import { clientIdFor, readRunContext, RunContext, wantsWrite } from './access';
import { Fetch } from './http';
import { Inputs, requireValues } from './inputs';
import { startLocalServer } from './local';
import { Launcher } from './process';
import { downloadServer, targetFor } from './release';

export const SERVER_VAR = 'NX_SELF_HOSTED_REMOTE_CACHE_SERVER';
export const TOKEN_VAR = 'NX_SELF_HOSTED_REMOTE_CACHE_ACCESS_TOKEN';
export const LOG_VAR = 'NX_REMOTE_CACHE_LOG';
export const PID_STATE = 'pid';
export const LOG_STATE = 'log';
/** Audience Entra expects on a GitHub OIDC token exchanged for a managed identity's token. */
export const AZURE_TOKEN_EXCHANGE_AUDIENCE = 'api://AzureADTokenExchange';

/** The parts of @actions/core this action uses; injectable for tests. */
export interface ActionsCore {
    exportVariable(name: string, value: string): void;
    setSecret(secret: string): void;
    saveState(name: string, value: string): void;
    notice(message: string): void;
    info(message: string): void;
    getIDToken(audience?: string): Promise<string>;
}

export interface ConfigureDeps {
    core: ActionsCore;
    env: NodeJS.ProcessEnv;
    launcher: Launcher;
    fetchImpl?: Fetch;
    /** Downloads the server release and returns the binary's path; injectable for tests. */
    installServer?: (o: { repo: string; version: string; token: string; dir: string }) => Promise<string>;
    /** The step's working directory, for resolving a relative `server-binary`; injectable for tests. */
    cwd?: string;
    runContext?: RunContext;
    localTimeoutMs?: number;
}

/**
 * Starts the cache server in this job and exports the two variables Nx's built-in remote cache
 * client reads. Nx is only pointed at a server once it is ready: Nx fails the whole run when the
 * cache is unreachable or answers 401, so anything short of that means "no remote cache".
 */
export async function configure(inputs: Inputs, deps: ConfigureDeps): Promise<void> {
    const { core, env } = deps;

    if (!env.ACTIONS_ID_TOKEN_REQUEST_URL) {
        // Fork PRs, and jobs without `id-token: write`, get no OIDC token: the server would have
        // nothing to reach storage with.
        core.notice("No OIDC token available (fork PR, or missing 'id-token: write'); remote cache disabled for this job.");
        return;
    }

    const write = wantsWrite(inputs.access, deps.runContext ?? readRunContext(env));
    const clientId = clientIdFor(inputs, write);

    requireValues({
        'tenant-id': inputs.tenantId,
        [write ? 'writer-client-id' : 'reader-client-id']: clientId,
        'storage-account': inputs.storageAccount,
        'storage-container': inputs.storageContainer,
        ...(inputs.serverBinary ? {} : { version: inputs.version }),
    });
    const workDir = path.join(env.RUNNER_TEMP || os.tmpdir(), 'nx-remote-cache');
    const installServer =
        deps.installServer ??
        ((o) => downloadServer({ ...o, target: targetFor(process.platform, process.arch) }, { fetchImpl: deps.fetchImpl }));
    // Resolved now, against the step's working directory (the checkout): the server runs in
    // workDir, where a relative path would point elsewhere.
    const binary = inputs.serverBinary
        ? path.resolve(deps.cwd ?? process.cwd(), inputs.serverBinary)
        : await installServer({ repo: inputs.serverRepo, version: inputs.version, token: inputs.githubToken, dir: workDir });
    const local = await startLocalServer(
        {
            binary,
            storageAccount: inputs.storageAccount,
            storageContainer: inputs.storageContainer,
            storagePrefix: inputs.storagePrefix,
            tenantId: inputs.tenantId,
            clientId,
            write,
            githubOidcToken: await core.getIDToken(AZURE_TOKEN_EXCHANGE_AUDIENCE),
            workDir,
            env,
        },
        { launcher: deps.launcher, fetchImpl: deps.fetchImpl, timeoutMs: deps.localTimeoutMs },
    );
    // For the post step (log + stop), and for later steps that want to read the log.
    core.saveState(PID_STATE, String(local.pid));
    core.saveState(LOG_STATE, local.logFile);
    core.exportVariable(LOG_VAR, local.logFile);

    core.setSecret(local.token);
    core.exportVariable(SERVER_VAR, local.url);
    core.exportVariable(TOKEN_VAR, local.token);
    core.info(`Nx remote cache: ${write ? 'write' : 'read'} access`);
}
