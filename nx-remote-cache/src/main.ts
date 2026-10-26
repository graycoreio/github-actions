import * as core from '@actions/core';

import { configure } from './configure';
import { readInputs } from './inputs';
import { processLauncher } from './process';

export async function run(): Promise<void> {
    try {
        await configure(readInputs(), { core, env: process.env, launcher: processLauncher });
    } catch (e) {
        core.setFailed(e instanceof Error ? e.message : String(e));
    }
}

run();
