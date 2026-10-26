import * as fs from 'fs';

import { Access, Inputs } from './inputs';

export interface RunContext {
    eventName?: string;
    ref?: string;
    defaultBranch?: string;
}

/** The parts of the run that decide which identity to ask for. */
export function readRunContext(
    env: NodeJS.ProcessEnv = process.env,
    readFile: (path: string) => string = (path) => fs.readFileSync(path, 'utf8'),
): RunContext {
    let defaultBranch: string | undefined;
    if (env.GITHUB_EVENT_PATH) {
        try {
            defaultBranch = JSON.parse(readFile(env.GITHUB_EVENT_PATH))?.repository?.default_branch;
        } catch {
            // No usable event payload: `auto` then never selects the writer.
        }
    }
    return { eventName: env.GITHUB_EVENT_NAME, ref: env.GITHUB_REF, defaultBranch };
}

/**
 * Whether to ask for the writer identity. `auto` asks for it only on a push to the default
 * branch. This only *selects*: Azure (federated credentials, role assignments) or the server's
 * mint rules decide what is actually granted.
 */
export function wantsWrite(access: Access, ctx: RunContext): boolean {
    if (access === 'write') {
        return true;
    }
    if (access === 'read') {
        return false;
    }
    return (
        ctx.eventName === 'push' &&
        !!ctx.defaultBranch &&
        ctx.ref === `refs/heads/${ctx.defaultBranch}`
    );
}

export function clientIdFor(inputs: Inputs, write: boolean): string {
    return write ? inputs.writerClientId : inputs.readerClientId;
}
