import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { archiveName, downloadServer, targetFor } from './release';

describe('targetFor', () => {
    it('maps runners to release targets', () => {
        expect(targetFor('linux', 'x64')).toBe('x86_64-unknown-linux-gnu');
        expect(targetFor('linux', 'arm64')).toBe('aarch64-unknown-linux-gnu');
        expect(targetFor('darwin', 'arm64')).toBe('universal-apple-darwin');
        expect(targetFor('darwin', 'x64')).toBe('universal-apple-darwin');
    });

    it('rejects runners without a binary', () => {
        expect(() => targetFor('win32', 'x64')).toThrow('nx-remote-cache has no server binary for win32/x64');
    });
});

describe('downloadServer', () => {
    const archive = Buffer.from('pretend this is a tar.gz');
    const sha256 = createHash('sha256').update(archive).digest('hex');
    const target = 'x86_64-unknown-linux-gnu' as const;
    const name = archiveName('0.3.0', target);
    const assetUrl = 'https://api.github.com/repos/graycoreio/nx-remote-cache/releases/assets/7';

    let dir: string;
    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-remote-cache-release-'));
    });
    afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

    function githubFetch(body: Buffer = archive) {
        const requests: { url: string; headers: Record<string, string> }[] = [];
        const fetchImpl = (async (url: string, init: RequestInit) => {
            requests.push({ url, headers: init.headers as Record<string, string> });
            if (url.endsWith('/releases/tags/v0.3.0')) {
                return new Response(JSON.stringify({ assets: [{ name: 'SHA256SUMS', url: 'x' }, { name, url: assetUrl }] }));
            }
            if (url === assetUrl) return new Response(body);
            return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
        }) as unknown as typeof fetch;
        return { requests, fetchImpl };
    }

    // Stands in for tar: writes the binary the archive would contain.
    const extract = async (_archive: string, into: string) => fs.writeFileSync(path.join(into, 'nx-remote-cache'), 'binary');

    it('downloads the release asset through the API, verifies it and returns the binary', async () => {
        const { requests, fetchImpl } = githubFetch();
        const binary = await downloadServer(
            { repo: 'graycoreio/nx-remote-cache', version: '0.3.0', target, token: 'gh-token', dir },
            { fetchImpl, checksums: { '0.3.0': { [target]: sha256 } }, extract },
        );

        expect(binary).toBe(path.join(dir, 'nx-remote-cache'));
        expect(fs.statSync(binary).mode & 0o111).not.toBe(0);
        expect(fs.readFileSync(path.join(dir, name))).toEqual(archive);
        expect(requests.map((r) => r.url)).toEqual([
            'https://api.github.com/repos/graycoreio/nx-remote-cache/releases/tags/v0.3.0',
            assetUrl,
        ]);
        expect(requests[0].headers.authorization).toBe('Bearer gh-token');
        expect(requests[1].headers.accept).toBe('application/octet-stream');
    });

    it('refuses an archive whose checksum differs', async () => {
        const { fetchImpl } = githubFetch(Buffer.from('tampered'));
        await expect(
            downloadServer({ repo: 'graycoreio/nx-remote-cache', version: '0.3.0', target, token: '', dir }, { fetchImpl, checksums: { '0.3.0': { [target]: sha256 } }, extract }),
        ).rejects.toThrow(/expected [0-9a-f]{64}; refusing to run it/);
        expect(fs.existsSync(path.join(dir, 'nx-remote-cache'))).toBe(false);
    });

    it('refuses versions it has no checksum for, before any request', async () => {
        const { requests, fetchImpl } = githubFetch();
        await expect(
            downloadServer({ repo: 'graycoreio/nx-remote-cache', version: '9.9.9', target, token: '', dir }, { fetchImpl, checksums: { '0.3.0': { [target]: sha256 } }, extract }),
        ).rejects.toThrow('nx-remote-cache 9.9.9 (x86_64-unknown-linux-gnu) is not known to this action; known versions: 0.3.0');
        expect(requests).toEqual([]);
    });

    it('explains a missing release, e.g. a private repo the token cannot read', async () => {
        const { fetchImpl } = githubFetch();
        await expect(
            downloadServer({ repo: 'graycoreio/nx-remote-cache', version: '0.4.0', target, token: '', dir }, { fetchImpl, checksums: { '0.4.0': { [target]: sha256 } }, extract }),
        ).rejects.toThrow(/HTTP 404 .*Not Found\n\(github-token needs read access to graycoreio\/nx-remote-cache's releases\)/);
    });
});
