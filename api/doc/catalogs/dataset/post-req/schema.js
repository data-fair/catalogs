export default {
  $id: 'https://github.com/data-fair/catalogs/catalogs/dataset/post-req',
  title: 'CatalogsDatasetPostReq',
  'x-exports': ['validate', 'types'],
  type: 'object',
  additionalProperties: false,
  required: [
    'dataset',
    'publication'
  ],
  properties: {
    dataset: {
      type: 'object', // TODO: use the datafair dataset schema
      required: [
        'owner',
      ],
      properties: {
        owner: {
          ref: 'https://github.com/data-fair/lib/account'
        }
      }
    },
    publication: {
      type: 'object'
    }
  }
}
