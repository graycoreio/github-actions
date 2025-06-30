import * as core from '@actions/core';
import { upload } from './upload';
import { getRecords } from './get-records';

export async function run(): Promise<void> {
  try {
    const appId: string = core.getInput('appId', {required: true})
    const indexName: string = core.getInput('indexName', {required: true})
    const apiKey: string = core.getInput('apiKey', {required: true})
    const dir: string = core.getInput('dir', {required: true})
    const globPattern: string = core.getInput('glob')
    const objectIdKey: string = core.getInput('objectIdKey')

    await upload(
      appId,
      indexName,
      apiKey,
      await getRecords(
        dir,
        globPattern,
        objectIdKey
      )
    )
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