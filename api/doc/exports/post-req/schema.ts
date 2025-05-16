import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import exportSchema from '#types/export/schema.ts'

export default {
  $id: 'https://github.com/data-fair/catalogs/export/post-req',
  title: 'ExportPostReq',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  properties: {
    body:
      jsonSchema(exportSchema)
        .pickProperties(['catalogId', 'action', 'dataFairDatasetId', 'remoteDatasetId', 'remoteResourceId'])
        .removeId()
        .appendTitle(' post')
        .schema
  }
}
