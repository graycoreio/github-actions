import { PackageJson } from "../../interface/package";

/**
 * We don't distribute the dev dependencies of the libraries, so we remove them.
 */
export const deleteScripts = (packageObject: PackageJson) => {
    delete packageObject.scripts;
    return packageObject;
};