import { spawn } from 'child_process';
import * as fs from 'fs';

export interface StartedProcess {
    pid: number;
    /** Whether the process has exited (or never started). */
    exited(): boolean;
}

/** Starting and stopping the server process, behind an interface so tests can fake it. */
export interface Launcher {
    start(command: string, args: string[], o: { cwd: string; env: NodeJS.ProcessEnv; logFile: string }): StartedProcess;
    stop(pid: number): void;
}

export const processLauncher: Launcher = {
    start(command, args, o) {
        const log = fs.openSync(o.logFile, 'a');
        // Detached with its output in a file, so it keeps serving after this step's process
        // exits; the post step stops it.
        const child = spawn(command, args, { cwd: o.cwd, env: o.env, detached: true, stdio: ['ignore', log, log] });
        fs.closeSync(log);
        let exited = false;
        child.on('exit', () => (exited = true));
        child.on('error', (e) => {
            exited = true;
            fs.appendFileSync(o.logFile, `could not start ${command}: ${e.message}\n`);
        });
        child.unref();
        return { pid: child.pid ?? 0, exited: () => exited || !child.pid };
    },
    stop(pid) {
        try {
            process.kill(pid, 'SIGTERM');
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'ESRCH') throw e; // already gone
        }
    },
};
