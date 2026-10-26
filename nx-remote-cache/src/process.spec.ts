import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { processLauncher } from './process';

// Real processes: what matters here is how they are spawned, detached and stopped.
describe('processLauncher', () => {
    let dir: string;
    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-remote-cache-process-'));
    });
    afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

    const until = async (condition: () => boolean) => {
        for (let i = 0; i < 100 && !condition(); i++) await new Promise((r) => setTimeout(r, 50));
        return condition();
    };

    it('runs the command in the given directory, with only the given env, logging to a file', async () => {
        const logFile = path.join(dir, 'server.log');
        const started = processLauncher.start(
            process.execPath,
            ['-e', 'console.log(process.cwd(), process.env.ONLY, process.env.HOME === undefined); console.error("to stderr")'],
            { cwd: dir, env: { ONLY: 'this' }, logFile },
        );
        expect(await until(started.exited)).toBe(true);
        const log = fs.readFileSync(logFile, 'utf8');
        expect(log).toContain(`${fs.realpathSync(dir)} this true`);
        expect(log).toContain('to stderr');
    });

    it('stops a running process, and ignores one that is already gone', async () => {
        const started = processLauncher.start(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
            cwd: dir,
            env: {},
            logFile: path.join(dir, 'log'),
        });
        expect(started.exited()).toBe(false);
        processLauncher.stop(started.pid);
        expect(await until(started.exited)).toBe(true);
        expect(() => processLauncher.stop(started.pid)).not.toThrow();
    });

    it('reports a command that cannot start as exited, with the reason in the log', async () => {
        const logFile = path.join(dir, 'log');
        const started = processLauncher.start(path.join(dir, 'missing'), [], { cwd: dir, env: {}, logFile });
        expect(await until(started.exited)).toBe(true);
        expect(await until(() => fs.readFileSync(logFile, 'utf8').includes('could not start'))).toBe(true);
    });
});
