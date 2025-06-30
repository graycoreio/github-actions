import * as core from '@actions/core';
import * as glob from '@actions/glob';
import * as fs from 'fs/promises';

export interface Record {
  objectID: string;
  [k: string]: unknown
}

export async function getRecords(
  dir: string,
  globPattern = '**/*',
  objectIdKey = 'id',
): Promise<Array<Record>> {
  const globber = await glob.create(`${dir}/${globPattern}`)

  let records: Array<Record> = []
  for await (const path of globber.globGenerator()) {
    if ((await fs.stat(path)).isFile()) {
      const obj = JSON.parse(await fs.readFile(path, 'utf8'))
      const objectID = obj[objectIdKey]

      if (!objectID) {
        core.warning(`Object ID not found for ${path} using key ${objectIdKey}`)
      }

      records.push({
        ...obj,
        objectID,
      })
    }
  }
  core.notice(`Found ${records.length} records to upload.`)

  return records
}
