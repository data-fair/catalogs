export default {
  $id: 'https://github.com/data-fair/catalogs/catalogs/get-req',
  title: 'CatalogsGetReq',
  type: 'object',
  additionalProperties: false,
  properties: {
    size: {
      type: 'string'
    },
    skip: {
      type: 'string'
    },
    showAll: {
      type: 'string'
    },
    sort: {
      type: 'string'
    },
    select: {
      type: 'string'
    },
    q: {
      type: 'string'
    },
    owners: {
      type: 'string'
    },
    plugins: {
      type: 'string',
      description: 'Comma-separated list of plugin names to filter catalogs by.'
    },
    capabilities: {
      type: 'string',
      description: 'Comma-separated list of capabilities to filter catalogs by; a catalog will be included only if it contains all the specified capabilities.'
    }
  }
}
