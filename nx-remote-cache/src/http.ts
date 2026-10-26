export type Fetch = typeof fetch;

/** Makes a request and returns the JSON body. Failures carry the service's own message, not just a status. */
export async function requestJson(
    url: string,
    init: RequestInit,
    fetchImpl: Fetch = fetch,
): Promise<Record<string, unknown>> {
    let response: Response;
    try {
        response = await fetchImpl(url, init);
    } catch (e) {
        throw new Error(`request to ${url} failed: ${describe(e)}`);
    }
    const body = await response.text();
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${url}: ${errorMessage(body)}`);
    }
    try {
        return JSON.parse(body);
    } catch {
        throw new Error(`response from ${url} is not JSON: ${body.slice(0, 200)}`);
    }
}

/** The most specific message in an error body: `error_description`, `message`, or the body. */
export function errorMessage(body: string): string {
    try {
        const json = JSON.parse(body);
        if (typeof json?.error_description === 'string') return json.error_description;
        if (typeof json?.message === 'string') return json.message;
    } catch {
        // not JSON: use the raw text
    }
    return body.trim() || '(empty response)';
}

function describe(e: unknown): string {
    if (e instanceof Error) {
        const cause = (e as Error & { cause?: unknown }).cause;
        return cause instanceof Error ? `${e.message} (${cause.message})` : e.message;
    }
    return String(e);
}
