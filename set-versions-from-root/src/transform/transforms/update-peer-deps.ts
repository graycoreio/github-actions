import { PackageJson } from "../../interface/package";
import { createUpdatableDeps } from "../helper/create-updateable-deps";
import { updateObjectFromObject } from "../helper/update";

/**
 * For the Daffodil package dependencies, peer changes are treated specially
 * during framework version updates. This is inconsistent with typical semver
 * practices, but necessary for the framework as a whole to remain consistently
 * versioned.
 * See: https://github.com/semver/semver/issues/502
 *
 * As a few sample cases:
 * 1. We're releasing v8.1.1, the set value would be 8.1.1
 * 2. We're releasing v2.6.4, the set value would be 2.6.4
 * 3. We're releasing v2.9.4, the set value would be 2.9.4
 * 4. We're releasing v0.9.8, the set value would be v0.9.8
 * 5. We're releasing 1.1.0-alpha.1, the set value would be 1.1.0-alpha.1
 */
export const updatePeerDependenciesFromNewVersion = (
    lib: PackageJson,
    rootPackage: PackageJson,
    packageNameList: string[]
) => {
    if (!lib.peerDependencies) {
        return lib;
    }
    lib.peerDependencies = updateObjectFromObject(
        lib.peerDependencies, createUpdatableDeps(
            lib.peerDependencies,
            rootPackage.version,
            packageNameList
        )
    );
    return lib;
};
