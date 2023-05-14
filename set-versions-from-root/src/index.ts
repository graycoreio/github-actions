import * as core from '@actions/core';
import { createTransform } from './transform/transform';
import { validateNoRemainingPlaceholders } from './validate/validate-no-placeholders';
import { PackageJson } from './interface/package';
import * as fs from 'fs/promises';
import { glob } from 'glob'

import {
    deleteDevDependencies,
    deleteScripts,
    updateDependenciesFromRoot,
    updateOptionalDependenciesFromNewVersion,
    updatePackageVersion,
    updatePeerDependenciesFromNewVersion
} from './transform/public_api';

export async function run(): Promise<void> {
    try {
        const rootPackagePath = core.getInput("root-package-path");
        const placeholder = core.getInput("placeholder");
        const packageGlob = core.getInput("package-glob");

        //Get root package
        const rootPackage: PackageJson = JSON.parse((await fs.readFile(rootPackagePath)).toString());

        if (!rootPackage.version) {
            throw new Error(`${rootPackagePath} does not contain a "version"`);
        }

        const transform = createTransform([
            deleteDevDependencies,
            deleteScripts,
            updatePackageVersion,
            updateDependenciesFromRoot,
            updatePeerDependenciesFromNewVersion,
            updateOptionalDependenciesFromNewVersion,
        ]);

        //Get packages to be modified
        const packages = await glob(packageGlob, { ignore: 'node_modules/**' });

        var results = await Promise.all(packages.map(async (p) => ({
                path: p,
                package: <PackageJson>JSON.parse((await fs.readFile(p)).toString()),
        })));

        const packagesNames = results.map((el) => el.package.name);

        results.map((item) => ({
            path: item.path,
            package: validateNoRemainingPlaceholders(
                transform(item.package, rootPackage, packagesNames),
                placeholder
            )
        }));

        await Promise.all(results.map(async (item) => {
            console.log(item.path);
            await fs.writeFile(item.path, JSON.stringify(item.package))
        }));
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
        else {
            core.setFailed("Something went wrong.");
        }
    }
}

run();