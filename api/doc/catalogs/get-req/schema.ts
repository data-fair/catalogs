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
    plugins: {
      type: 'string'
    },
    owners: {
      type: 'string'
    }
  }
}
