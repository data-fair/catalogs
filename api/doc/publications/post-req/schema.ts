import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import publicationSchema from '#types/publication/schema.ts'

export default {
  $id: 'https://github.com/data-fair/catalogs/publication/post-req',
  title: 'PublicationPostReq',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  properties: {
    body:
      jsonSchema(publicationSchema)
        .pickProperties(['catalog', 'action', 'dataFairDataset', 'remoteDatasetId', 'remoteResourceId'])
        .removeId()
        .appendTitle(' post')
        .schema
  }
}
