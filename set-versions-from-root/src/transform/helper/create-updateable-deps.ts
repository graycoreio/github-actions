/**
 * This function creates a dependency object where the keys are packages
 * that should be upddated in lock-step with the root package version.
 * 
 * Consider a monorepo where the root package moves from version 1.2 to 1.3.
 * There may be packages within that monorepo that you also want to move 
 * from version 1.2 to 1.3. Additionally, those packages may have dependencies 
 * on some of those packages that are moving from 1.2 to 1.3 
 */
export const createUpdatableDeps = (
    dependencies: Record<string, string>,
    version: string,
    packagesUnderUpdate: string[]
): Record<string, typeof version> =>
    Object.keys(dependencies).filter((k) => packagesUnderUpdate.includes(k))
        .reduce<Record<string, string>>((obj, key) => {
            obj[key] = version;
            return obj;
        }, {});