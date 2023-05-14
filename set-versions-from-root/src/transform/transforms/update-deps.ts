import { PackageJson } from "../../interface/package";
import { updateObjectFromObject } from "../helper/update";

/**
 * For the library dependencies, set their dependency values from the root.
 */
export const updateDependenciesFromRoot = (lib: PackageJson, rootPackage: PackageJson) => {
    // we want to check all deps for versions
    const rootDeps = {
        ...rootPackage.dependencies,
        ...rootPackage.devDependencies,
        ...rootPackage.optionalDependencies,
        ...rootPackage.peerDependencies,
    };
    if (lib.peerDependencies) {
        lib.peerDependencies = updateObjectFromObject(lib.peerDependencies, rootDeps);
    }
    if (lib.optionalDependencies) {
        lib.optionalDependencies = updateObjectFromObject(lib.optionalDependencies, rootDeps);
    }
    return lib;
};
