# Upload Algolia Index

This action uploads a set of records to a specified algolia index.

```yml
- uses: graycoreio/github-actions/upload-algolia-index@main
  with:
    appId: ${{ secrets.ALGOLIA_APP_ID }}
    apiKey: ${{ secrets.ALGOLIA_API_KEY }}
    indexName: my_index_name
    dir: ${{ github.workspace }}/my/index/records
```