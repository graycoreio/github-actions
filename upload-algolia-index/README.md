# Upload Algolia Index

A GitHub Action that uploads a directory of JSON records to an [Algolia](https://www.algolia.com/) search index.

Each matching file is parsed as a single JSON record and saved to the index. Existing records with the same `objectID` are replaced.

## Inputs

See the [action.yml](./action.yml)

| Input       | Description                                                                         | Required | Default |
| ----------- | ----------------------------------------------------------------------------------- | -------- | ------- |
| appId       | The ID of your Algolia application.                                                 | true     |         |
| apiKey      | An Algolia API key with write access to the index.                                  | true     |         |
| indexName   | The name of the Algolia index.                                                      | true     |         |
| dir         | The directory containing the records. Should be an absolute path.                   | true     |         |
| glob        | A glob, relative to `dir`, selecting which files to upload.                         | false    | '**/*'  |
| objectIdKey | The field on each record that holds its unique ID. It is copied to `objectID`.      | false    | 'id'    |

## Records

Each file must contain one JSON object. The value at `objectIdKey` becomes the record's Algolia `objectID`; a warning is logged for any record without one.

```json
{
  "id": "getting-started",
  "title": "Getting Started",
  "content": "..."
}
```

## Usage

```yml
name: Update Search Index

on:
  push:
    branches:
      - main

jobs:
  index:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: npm run build:search-index
      - uses: graycoreio/github-actions/upload-algolia-index@v2.7.0 # x-release-please-version
        with:
          appId: ${{ secrets.ALGOLIA_APP_ID }}
          apiKey: ${{ secrets.ALGOLIA_API_KEY }}
          indexName: docs
          dir: ${{ github.workspace }}/dist/search-index
          glob: '**/*.json'
```
