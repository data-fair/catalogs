export default {
  $id: 'https://github.com/data-fair/catalogs/catalogs/dataset/post-req',
  title: 'CatalogsDatasetPostReq',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  additionalProperties: false,
  properties: {
    body: {
      additionalProperties: false,
      required: [
        'dataset',
        'publication'
      ],
      properties: {
        dataset: {
          type: 'object'
        },
        publication: {
          type: 'object'
        }
      }
    }
  }
}
