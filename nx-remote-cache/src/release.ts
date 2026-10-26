import { execFile } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { Fetch, requestJson } from './http';

export const DEFAULT_SERVER_REPO = 'graycoreio/nx-remote-cache';

export type Target = 'x86_64-unknown-linux-gnu' | 'aarch64-unknown-linux-gnu' | 'universal-apple-darwin';

/**
 * SHA-256 of every server release archive this action may run. A version that isn't listed is
 * refused, and so is an archive that doesn't match, e.g. a release asset replaced after the fact.
 * To add a release, copy the default-variant lines of its SHA256SUMS:
 *   gh release download v<version> -R graycoreio/nx-remote-cache -p SHA256SUMS -O -
 */
export const RELEASE_CHECKSUMS: Record<string, Partial<Record<Target, string>>> = {
    '0.4.0': {
        'x86_64-unknown-linux-gnu': 'c99ddc2b5b4409e95fb7a42419107264ce7e4faa2b64cc1ca0405cba0813a0d2',
        'aarch64-unknown-linux-gnu': '05fe260583d778b87964fe3a8007153d0ceb738f1c6d9c14c0418f9d16f6b242',
        'universal-apple-darwin': 'fc967d3b0c12fb7c352d5c58facc8ebbab931cad5e10b36ad5f126fdbda8b413',
    },
    '0.3.2': {
        'x86_64-unknown-linux-gnu': '7d88b5b7c3f7194143e63e47fca6dde3072979f7b6b7ece08eba8e1928b06e7a',
        'aarch64-unknown-linux-gnu': 'cf86c18a85c4d6f3717cd5f9bbcf47f03dbe12b4285422c5dbc2f283404840ba',
        'universal-apple-darwin': '101a1d3f13cfd244b96a57e437681b607c0b965e386d3d0ad05fa2f113f2e30a',
    },
    '0.3.1': {
        'x86_64-unknown-linux-gnu': '4290a4e37557d12c98575e260244f11e40377ad658d5dd21f70311d655a389fd',
        'aarch64-unknown-linux-gnu': 'a2ed18ac09b6e9953a5a2d86a0fab04383c9c5b450acf544fdd1a890b5fa5cfd',
        'universal-apple-darwin': '49f9118ee832467f69e0511a2edbd4d6fbd31a2ad0b1671a1cb065af1e83233c',
    },
};

/** The release target for a runner, as Node reports its platform and architecture. */
export function targetFor(platform: NodeJS.Platform, arch: string): Target {
    if (platform === 'linux' && arch === 'x64') return 'x86_64-unknown-linux-gnu';
    if (platform === 'linux' && arch === 'arm64') return 'aarch64-unknown-linux-gnu';
    if (platform === 'darwin') return 'universal-apple-darwin';
    throw new Error(`nx-remote-cache has no server binary for ${platform}/${arch} (supported: Linux x64 and arm64, macOS)`);
}

export function archiveName(version: string, target: Target): string {
    return `nx-remote-cache-${version}-${target}.tar.gz`;
}

export interface DownloadOptions {
    /** GitHub repository whose releases hold the server, e.g. graycoreio/nx-remote-cache. */
    repo: string;
    version: string;
    target: Target;
    /** Token for the GitHub API; needs read access to `repo`'s releases. */
    token: string;
    /** Where the archive and binary go. */
    dir: string;
}

export interface DownloadDeps {
    fetchImpl?: Fetch;
    checksums?: typeof RELEASE_CHECKSUMS;
    extract?: (archive: string, dir: string) => Promise<void>;
}

/** Downloads the server release for this runner, verifies it, and returns the binary's path. */
export async function downloadServer(o: DownloadOptions, deps: DownloadDeps = {}): Promise<string> {
    const { fetchImpl = fetch, checksums = RELEASE_CHECKSUMS, extract = untar } = deps;

    const expected = checksums[o.version]?.[o.target];
    if (!expected) {
        const known = Object.keys(checksums).join(', ') || 'none';
        throw new Error(`nx-remote-cache ${o.version} (${o.target}) is not known to this action; known versions: ${known}`);
    }

    const name = archiveName(o.version, o.target);
    const headers: Record<string, string> = {
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        ...(o.token ? { authorization: `Bearer ${o.token}` } : {}),
    };
    // Through the API rather than github.com/<repo>/releases/download, so a token works for a
    // private repo too.
    const releaseUrl = `https://api.github.com/repos/${o.repo}/releases/tags/v${o.version}`;
    const release = await requestJson(releaseUrl, { headers }, fetchImpl).catch((e: Error) => {
        throw new Error(`${e.message}\n(github-token needs read access to ${o.repo}'s releases)`);
    });
    const assets = Array.isArray(release.assets) ? (release.assets as { name?: unknown; url?: unknown }[]) : [];
    const asset = assets.find((a) => a.name === name);
    if (typeof asset?.url !== 'string') {
        throw new Error(`release v${o.version} of ${o.repo} has no ${name}`);
    }

    let response: Response;
    try {
        // Redirects to blob storage; fetch drops the authorization header on the way.
        response = await fetchImpl(asset.url, { headers: { ...headers, accept: 'application/octet-stream' } });
    } catch (e) {
        throw new Error(`downloading ${name} failed: ${e instanceof Error ? e.message : e}`);
    }
    if (!response.ok) {
        throw new Error(`downloading ${name} failed: HTTP ${response.status}`);
    }
    const archive = Buffer.from(await response.arrayBuffer());

    const actual = createHash('sha256').update(archive).digest('hex');
    if (actual !== expected) {
        throw new Error(`${name} has SHA-256 ${actual}, expected ${expected}; refusing to run it`);
    }

    fs.mkdirSync(o.dir, { recursive: true });
    const archivePath = path.join(o.dir, name);
    fs.writeFileSync(archivePath, archive);
    await extract(archivePath, o.dir);
    const binary = path.join(o.dir, 'nx-remote-cache');
    fs.chmodSync(binary, 0o755);
    return binary;
}

function untar(archive: string, dir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        execFile('tar', ['-xzf', archive, '-C', dir, 'nx-remote-cache'], (error, _stdout, stderr) =>
            error ? reject(new Error(`extracting ${path.basename(archive)} failed: ${stderr.trim() || error.message}`)) : resolve(),
        );
    });
}
