import { errorMessage, requestJson } from './http';

const respond = (status: number, body: string) =>
    jest.fn(async () => new Response(body, { status })) as unknown as typeof fetch;

describe('errorMessage', () => {
    it('prefers error_description (Entra), then message, then the raw body', () => {
        expect(errorMessage(JSON.stringify({ error: 'invalid_client', error_description: 'AADSTS700213: no match' }))).toBe(
            'AADSTS700213: no match',
        );
        expect(errorMessage(JSON.stringify({ message: 'Bad credentials' }))).toBe('Bad credentials');
        expect(errorMessage('upstream timeout')).toBe('upstream timeout');
        expect(errorMessage('')).toBe('(empty response)');
    });
});

describe('requestJson', () => {
    it('returns the parsed body on success', async () => {
        await expect(requestJson('https://x/ok', {}, respond(200, '{"a":1}'))).resolves.toEqual({ a: 1 });
    });

    it("surfaces the service's own error message with status and URL", async () => {
        const fetchImpl = respond(401, JSON.stringify({ error_description: 'AADSTS700213: subject repo:o/r:pull_request' }));
        await expect(requestJson('https://login.example/token', {}, fetchImpl)).rejects.toThrow(
            'HTTP 401 from https://login.example/token: AADSTS700213: subject repo:o/r:pull_request',
        );
    });

    it('reports network failures with the URL', async () => {
        const fetchImpl = jest.fn(async () => {
            throw new TypeError('fetch failed', { cause: new Error('connect ECONNREFUSED') });
        }) as unknown as typeof fetch;
        await expect(requestJson('https://down.example', {}, fetchImpl)).rejects.toThrow(
            'request to https://down.example failed: fetch failed (connect ECONNREFUSED)',
        );
    });

    it('rejects a successful but non-JSON body', async () => {
        await expect(requestJson('https://x', {}, respond(200, '<html>'))).rejects.toThrow(/is not JSON/);
    });
});
