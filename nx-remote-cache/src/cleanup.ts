import * as core from '@actions/core';

import { readLog } from './local';
import { Launcher } from './process';

/**
 * Runs when the job ends, even after a failure: stops the local server, which would otherwise
 * outlive the job on self-hosted runners, then shows its log (collapsed). Never fails the job.
 */
export async function cleanup(
    state: { pid: string; logFile: string },
    launcher: Pick<Launcher, 'stop'>,
    log: Pick<typeof core, 'startGroup' | 'endGroup' | 'info' | 'warning'> = core,
): Promise<void> {
    const pid = Number(state.pid);
    if (!state.pid || !Number.isInteger(pid) || pid <= 0) {
        return;
    }
    try {
        launcher.stop(pid);
    } catch (e) {
        log.warning(`could not stop the nx-remote-cache server (pid ${pid}): ${e instanceof Error ? e.message : e}`);
    }
    if (state.logFile) {
        log.startGroup('nx-remote-cache server log');
        log.info(readLog(state.logFile).trimEnd() || '(empty)');
        log.endGroup();
    }
}
