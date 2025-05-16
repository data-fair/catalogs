export default {
  $id: 'https://github.com/data-fair/catalogs/exports/get-req',
  title: 'ExportsGetReq',
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
    dataFairDatasetId: {
      type: 'string'
    }
  }
}
