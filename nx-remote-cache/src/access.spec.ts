import { clientIdFor, readRunContext, wantsWrite } from './access';
import { readInputs } from './inputs';

describe('wantsWrite', () => {
    const push = { eventName: 'push', ref: 'refs/heads/develop', defaultBranch: 'develop' };

    it('auto: writer only for a push to the default branch', () => {
        expect(wantsWrite('auto', push)).toBe(true);
        expect(wantsWrite('auto', { ...push, ref: 'refs/heads/feature' })).toBe(false);
        expect(wantsWrite('auto', { ...push, eventName: 'pull_request' })).toBe(false);
        expect(wantsWrite('auto', { ...push, eventName: 'workflow_dispatch' })).toBe(false);
        expect(wantsWrite('auto', { ...push, ref: 'refs/tags/v1.0.0' })).toBe(false);
    });

    it('auto: never the writer when the default branch is unknown', () => {
        expect(wantsWrite('auto', { ...push, defaultBranch: undefined })).toBe(false);
    });

    it('read and write force the choice', () => {
        expect(wantsWrite('read', push)).toBe(false);
        expect(wantsWrite('write', { eventName: 'pull_request' })).toBe(true);
    });
});

describe('readRunContext', () => {
    it('reads the default branch from the event payload', () => {
        const ctx = readRunContext(
            { GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_PATH: '/event.json' },
            () => JSON.stringify({ repository: { default_branch: 'main' } }),
        );
        expect(ctx).toEqual({ eventName: 'push', ref: 'refs/heads/main', defaultBranch: 'main' });
    });

    it('tolerates a missing or unreadable payload', () => {
        expect(readRunContext({}, () => '').defaultBranch).toBeUndefined();
        expect(
            readRunContext({ GITHUB_EVENT_PATH: '/nope' }, () => {
                throw new Error('ENOENT');
            }).defaultBranch,
        ).toBeUndefined();
    });
});

describe('clientIdFor', () => {
    it('picks the writer or reader client id', () => {
        const inputs = readInputs((name) => ({ 'writer-client-id': 'w', 'reader-client-id': 'r' })[name] ?? '');
        expect(clientIdFor(inputs, true)).toBe('w');
        expect(clientIdFor(inputs, false)).toBe('r');
    });
});
