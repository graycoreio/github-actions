import { PackageJson } from "../../interface/package";
import { updateObjectFromObject } from "../helper/update";
import { PackageTransformation } from "../transform";
import { createUpdatableDeps } from '../helper/create-updateable-deps';

export const updateOptionalDependenciesFromNewVersion: PackageTransformation
    = (lib: PackageJson, rootPackage: PackageJson, packageNameList: string[]) => {
        if (!lib.optionalDependencies) {
            return lib;
        }
        lib.optionalDependencies = updateObjectFromObject(
            lib.optionalDependencies,
            createUpdatableDeps(lib.optionalDependencies, rootPackage.version, packageNameList)
        );
        return lib;
    };