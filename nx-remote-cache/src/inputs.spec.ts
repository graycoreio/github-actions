import { readInputs, requireValues } from './inputs';

const getter = (values: Record<string, string>) => (name: string) => values[name] ?? '';

describe('readInputs', () => {
    it('applies the defaults of action.yml when inputs are empty', () => {
        const inputs = readInputs(getter({}));
        expect(inputs).toMatchObject({
            access: 'auto',
            storagePrefix: 'v1',
            serverRepo: 'graycoreio/nx-remote-cache',
        });
    });

    it('accepts the server version with or without a leading v', () => {
        expect(readInputs(getter({ version: 'v0.3.0' })).version).toBe('0.3.0');
        expect(readInputs(getter({ version: '0.3.0' })).version).toBe('0.3.0');
    });

    it.each([
        ['access', 'admin', /unknown access 'admin' \(expected auto or read or write\)/],
    ])('rejects an unknown %s', (name, value, message) => {
        expect(() => readInputs(getter({ [name]: value }))).toThrow(message);
    });
});

describe('requireValues', () => {
    it('names the first missing value', () => {
        expect(() => requireValues({ 'tenant-id': 't', 'storage-account': '' })).toThrow(
            'storage-account is required',
        );
    });

    it('passes when everything is set', () => {
        expect(() => requireValues({ a: '1', b: '2' })).not.toThrow();
    });
});
