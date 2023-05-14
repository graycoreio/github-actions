import { PackageJson } from "../../interface/package";

/**
 * We don't distribute the dev dependencies of the libraries, so we remove them.
 */
export const deleteDevDependencies = (packageObject: PackageJson) => {
    delete packageObject.devDependencies;
    return packageObject;
};