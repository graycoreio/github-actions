import { PackageJson } from "../../interface/package";
import { PackageTransformation } from "../transform";

/**
 * Set the versions in the package with the package values from root.
 * We follow a uniform and consistent versioning process, so all packages
 * will always be held at the same version.
 */
export const updatePackageVersion: PackageTransformation = (lib: PackageJson, rootPackage: PackageJson) => {
    lib.version = rootPackage.version;
    return lib;
};