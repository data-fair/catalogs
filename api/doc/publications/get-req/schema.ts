export default {
  $id: 'https://github.com/data-fair/catalogs/publications/get-req',
  title: 'PublicationsGetReq',
  type: 'object',
  additionalProperties: false,
  properties: {
    size: {
      type: 'string'
    },
    skip: {
      type: 'string'
    },
    // We can use it but I don't see the use case
    // showAll: {
    //   type: 'string'
    // },
    sort: {
      type: 'string'
    },
    select: {
      type: 'string'
    },
    q: {
      type: 'string'
    },
    catalogId: {
      type: 'string'
    },
    dataFairDatasetId: {
      type: 'string'
    }
  }
}
