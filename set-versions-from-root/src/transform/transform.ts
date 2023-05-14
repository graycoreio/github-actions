import { PackageJson } from '../interface/package';

export type PackageTransformation = (
    lib: PackageJson,
    rootPackage: PackageJson,
    packageNameList: string[],
) => PackageJson;

export const createTransform = (operations: PackageTransformation[]): PackageTransformation => {
    return (lib: PackageJson, root: PackageJson, packageNameList: string[]) => operations.reduce(
        (acc, op) => op(acc || lib, root, packageNameList), <any>undefined
    );
}