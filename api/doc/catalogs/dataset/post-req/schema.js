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
    publication: { // TODO: use the datafair publication schema
      type: 'object',
      required: ['publicationId', 'catalogId', 'status'],
      additionalProperties: false,
      properties: {
        publicationId: { type: 'string' },
        catalogId: { type: 'string' },
        remoteDatasetId: { type: 'string' },
        remoteResourceId: { type: 'string' },
        status: { enum: ['waiting', 'published', 'error', 'deleted'] },
        publishedAt: { type: 'string', format: 'date-time' },
        error: { type: 'string' },
        isResource: { type: 'boolean' }
      }
    }
  }
}
