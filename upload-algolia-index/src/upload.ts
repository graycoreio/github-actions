import * as core from '@actions/core';
import { searchClient } from "@algolia/client-search";
import { Record } from './get-records';

export interface Options {
  appId: string
  indexName: string
  apiKey: string
  dir: string
  globPattern?: string
  objectIdKey?: string
}

export async function upload(
  appId: string,
  indexName: string,
  apiKey: string,
  records: Array<Record>
): Promise<void> {
  const client = searchClient(
    appId,
    apiKey
  );

  core.debug('Beginning upload.')
  await client.saveObjects({
    indexName,
    objects: records
  });
  core.debug(`Finished upload.`)
}
