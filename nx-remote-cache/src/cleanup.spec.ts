import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { cleanup } from './cleanup';

function recorder() {
    const lines: string[] = [];
    return {
        lines,
        log: {
            startGroup: (name: string) => void lines.push(`group: ${name}`),
            endGroup: () => void lines.push('endgroup'),
            info: (message: string) => void lines.push(`info: ${message}`),
            warning: (message: string | Error) => void lines.push(`warning: ${message}`),
        },
    };
}

describe('cleanup (post step)', () => {
    let dir: string;
    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-remote-cache-cleanup-'));
    });
    afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

    it('does nothing when no local server was started', async () => {
        const r = recorder();
        const stopped: number[] = [];
        await cleanup({ pid: '', logFile: '' }, { stop: (pid) => void stopped.push(pid) }, r.log);
        expect(r.lines).toEqual([]);
        expect(stopped).toEqual([]);
    });

    it('stops the server, then prints its log in a collapsed group', async () => {
        const r = recorder();
        const stopped: number[] = [];
        const logFile = path.join(dir, 'server.log');
        fs.writeFileSync(logFile, 'line 1\nline 2\n');
        await cleanup({ pid: '4242', logFile }, { stop: (pid) => void stopped.push(pid) }, r.log);
        expect(stopped).toEqual([4242]);
        expect(r.lines).toEqual(['group: nx-remote-cache server log', 'info: line 1\nline 2', 'endgroup']);
    });

    it('only warns on errors, never fails the job', async () => {
        const r = recorder();
        const stop = () => {
            throw new Error('EPERM');
        };
        await expect(cleanup({ pid: '4242', logFile: path.join(dir, 'missing.log') }, { stop }, r.log)).resolves.toBeUndefined();
        expect(r.lines[0]).toBe('warning: could not stop the nx-remote-cache server (pid 4242): EPERM');
        expect(r.lines[2]).toMatch(/^info: \(could not read .*missing\.log/);
    });
});
