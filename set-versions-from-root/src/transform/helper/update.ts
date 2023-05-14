/**
 * Migrates the properties from "b" that also exist "a" to "a".
 */
export const updateObjectFromObject = (a: Record<string, any>, b: Record<string, any>): typeof a => ({
    ...a,
    ...Object.keys(b).filter((k) => k in a).reduce<Record<string, any>>((obj, key) => {
        obj[key] = b[key];
        return obj;
    }, {}),
});