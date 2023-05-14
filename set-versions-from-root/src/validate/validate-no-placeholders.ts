import { PackageJson } from "../interface/package";

const dependencyTypes = [
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
    'dependencies',
] as const;

/**
 * Validate whether or not the package has any remaining placeholders.
 */
export const validateNoRemainingPlaceholders = (lib: PackageJson, placeholder: string): PackageJson => {
    console.log(lib);
    const placeholders = dependencyTypes.reduce((acc, depType) => {
        if (depType in lib) {
            const deps = <Record<string, string>>lib[depType];
            return acc.concat(Object.keys(deps).filter(dep => deps[dep] === placeholder));
        }
        return acc;
    }, <string[]>[]);

    if (placeholders.length > 0) {
        throw new Error(
            `Placeholder found in distributable package ${lib.name} after transformation; deps: ${placeholders}`
        );
    };

    return lib;
};