import * as core from '@actions/core';

import { DEFAULT_SERVER_REPO } from './release';

export type Access = 'auto' | 'read' | 'write';

export interface Inputs {
    access: Access;
    tenantId: string;
    writerClientId: string;
    readerClientId: string;
    storageAccount: string;
    storageContainer: string;
    storagePrefix: string;
    /** Server release to run. */
    version: string;
    /** Repository whose releases hold the server. */
    serverRepo: string;
    /** For downloading the server release. */
    githubToken: string;
    /** A server binary to run instead of downloading `version`. */
    serverBinary: string;
}

function oneOf<T extends string>(name: string, value: string, allowed: readonly T[]): T {
    if (!(allowed as readonly string[]).includes(value)) {
        throw new Error(`unknown ${name} '${value}' (expected ${allowed.join(' or ')})`);
    }
    return value as T;
}

/** Reads and validates the action's inputs. `get` is injectable for tests. */
export function readInputs(get: (name: string) => string = core.getInput): Inputs {
    return {
        access: oneOf('access', get('access') || 'auto', ['auto', 'read', 'write'] as const),
        tenantId: get('tenant-id'),
        writerClientId: get('writer-client-id'),
        readerClientId: get('reader-client-id'),
        storageAccount: get('storage-account'),
        storageContainer: get('storage-container'),
        storagePrefix: get('storage-prefix') || 'v1',
        version: get('version').replace(/^v/, ''),
        serverRepo: get('server-repo') || DEFAULT_SERVER_REPO,
        githubToken: get('github-token'),
        serverBinary: get('server-binary'),
    };
}

/** Throws a clear error naming the first missing required value. */
export function requireValues(values: Record<string, string>): void {
    for (const [name, value] of Object.entries(values)) {
        if (!value) {
            throw new Error(`${name} is required`);
        }
    }
}
