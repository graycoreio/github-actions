import * as core from '@actions/core';
import * as glob from '@actions/glob';
import * as fs from 'fs/promises';
import { searchClient } from "@algolia/client-search";

export async function run(): Promise<void> {
  try {
    const appId: string = core.getInput('appId', {required: true})
    const indexName: string = core.getInput('indexName', {required: true})
    const apiKey: string = core.getInput('apiKey', {required: true})
    const dir: string = core.getInput('dir', {required: true})
    const globPattern: string = core.getInput('glob')
    const objectIdKey: string = core.getInput('objectIdKey')

    const globber = await glob.create(`${dir}/${globPattern}`)
    const client = searchClient(
      appId,
      apiKey
    );

    let records: Array<{
      objectID: string;
      body: Record<string, unknown>
    }> = []
    for await (const path of globber.globGenerator()) {
      if ((await fs.stat(path)).isFile()) {
        const obj = JSON.parse(await fs.readFile(path, 'utf8'))
        const objectID = obj[objectIdKey]

        if (!objectID) {
          core.warning(`Object ID not found for ${path} using key ${objectIdKey}`)
        }

        records.push({
          objectID,
          body: obj
        })
      }
    }
    core.notice(`Found ${records.length} records to upload.`)

    core.debug('Beginning upload.')
    await client.saveObjects({
      indexName,
      objects: records
    });
    core.debug(`Finished upload.`)
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